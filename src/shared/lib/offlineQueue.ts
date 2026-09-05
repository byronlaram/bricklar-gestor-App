/**
 * ─── Offline Queue & Persistence Manager (IndexedDB) ──────────────────────────
 * Provides robust offline capabilities for couriers when entering low or no signal areas.
 * Queues task status changes, POD photo proofs, cash movements, and auto-syncs when online.
 */

import { supabase } from './supabaseClient'
import { broadcastSyncEvent } from './realtimeSync'

const DB_NAME = 'bricklar_offline_store'
const DB_VERSION = 1
const STORE_NAME = 'offline_actions'

export type OfflineActionType =
  | 'CHANGE_TASK_STATUS'
  | 'UPLOAD_POD_EVIDENCE'
  | 'RECORD_CASH_MOVEMENT'
  | 'COURIER_CREATE_TASK'

export interface OfflineAction {
  id: string
  actionType: OfflineActionType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
  timestamp: string
  retryCount: number
  status: 'pending' | 'syncing' | 'failed'
  errorMessage?: string
}

let dbInstance: IDBDatabase | null = null

/**
 * Initializes the IndexedDB instance
 */
export function openOfflineDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este entorno.'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result
      resolve(dbInstance)
    }

    request.onerror = (event) => {
      console.error('[OfflineQueue] Error al abrir IndexedDB:', (event.target as IDBOpenDBRequest).error)
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

/**
 * Adds an action to the offline IndexedDB queue
 */
export async function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<OfflineAction> {
  const db = await openOfflineDB()
  const newAction: OfflineAction = {
    ...action,
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add(newAction)

    req.onsuccess = () => {
      notifyQueueChange()
      resolve(newAction)
    }

    req.onerror = () => {
      reject(req.error)
    }
  })
}

/**
 * Retrieves all pending or failed offline actions
 */
export async function getPendingOfflineActions(): Promise<OfflineAction[]> {
  try {
    const db = await openOfflineDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()

      req.onsuccess = () => {
        resolve(req.result || [])
      }

      req.onerror = () => {
        reject(req.error)
      }
    })
  } catch {
    return []
  }
}

/**
 * Removes an action from IndexedDB after successful synchronization
 */
export async function removeOfflineAction(id: string): Promise<void> {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)

    req.onsuccess = () => {
      notifyQueueChange()
      resolve()
    }

    req.onerror = () => {
      reject(req.error)
    }
  })
}

/**
 * Updates status or error message of an offline action
 */
export async function updateOfflineAction(id: string, updates: Partial<OfflineAction>): Promise<void> {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      if (!getReq.result) {
        resolve()
        return
      }
      const updated = { ...getReq.result, ...updates }
      const putReq = store.put(updated)
      putReq.onsuccess = () => {
        notifyQueueChange()
        resolve()
      }
      putReq.onerror = () => reject(putReq.error)
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// Queue change listeners
type QueueListener = (count: number) => void
const queueListeners: Set<QueueListener> = new Set()

export function subscribeToOfflineQueue(listener: QueueListener): () => void {
  queueListeners.add(listener)
  getPendingOfflineActions().then((actions) => listener(actions.length))
  return () => {
    queueListeners.delete(listener)
  }
}

function notifyQueueChange() {
  getPendingOfflineActions().then((actions) => {
    queueListeners.forEach((l) => l(actions.length))
  })
}

/**
 * Synchronizes all pending offline actions with the Supabase cloud backend
 */
export async function processOfflineQueue(): Promise<{ total: number; synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { total: 0, synced: 0, failed: 0 }
  }

  const actions = await getPendingOfflineActions()
  if (actions.length === 0) {
    return { total: 0, synced: 0, failed: 0 }
  }

  let synced = 0
  let failed = 0

  for (const item of actions) {
    try {
      await updateOfflineAction(item.id, { status: 'syncing' })

      if (item.actionType === 'CHANGE_TASK_STATUS') {
        const { taskId, newStatus, metadata, cancellationReason, evidenceUrl, notes } = item.payload
        const { error } = await supabase
          .from('tasks')
          .update({
            status: newStatus,
            metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
            cancellation_reason: cancellationReason || undefined,
            evidence_url: evidenceUrl || undefined,
            notes: notes || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)

        if (error) throw new Error(error.message)
        broadcastSyncEvent('tasks', 'status_change', { entityId: taskId })
      } else if (item.actionType === 'UPLOAD_POD_EVIDENCE') {
        const { taskId, base64Data, fileName } = item.payload
        if (base64Data) {
          // Convert base64 data to Blob
          const res = await fetch(base64Data)
          const blob = await res.blob()
          const filePath = `evidences/${fileName || `${Date.now()}_pod.jpg`}`

          const { error: upErr } = await supabase.storage
            .from('task-evidences')
            .upload(filePath, blob, { contentType: blob.type || 'image/jpeg', upsert: true })

          if (!upErr) {
            const { data: urlData } = supabase.storage.from('task-evidences').getPublicUrl(filePath)
            if (urlData?.publicUrl && taskId) {
              await supabase
                .from('tasks')
                .update({ evidence_url: urlData.publicUrl, updated_at: new Date().toISOString() })
                .eq('id', taskId)
            }
          }
        }
      } else if (item.actionType === 'RECORD_CASH_MOVEMENT') {
        const { data: sessionData } = await supabase.auth.getSession()
        const currentUserId = sessionData?.session?.user?.id || ''
        const { workdayId, courierId, movementType, direction, amount, currency, description } = item.payload
        const { error: movErr } = await supabase.from('cash_movements').insert({
          workday_id: workdayId,
          courier_id: courierId || currentUserId,
          movement_type: movementType,
          direction,
          amount,
          currency: currency || 'NIO',
          description,
        })
        if (movErr) throw new Error(movErr.message)
        broadcastSyncEvent('cash_movements', 'create')
      }

      await removeOfflineAction(item.id)
      synced++
    } catch (err) {
      console.warn(`[OfflineQueue] Error syncing action ${item.id}:`, err)
      await updateOfflineAction(item.id, {
        status: 'failed',
        retryCount: item.retryCount + 1,
        errorMessage: (err as Error).message,
      })
      failed++
    }
  }

  return { total: actions.length, synced, failed }
}
