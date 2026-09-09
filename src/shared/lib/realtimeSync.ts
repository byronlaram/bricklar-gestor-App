/**
 * ─── Central Realtime Synchronization Hub ─────────────────────────────────────
 * Capa de sincronización instantánea y reactiva:
 * 1. Supabase Realtime Broadcast: Difusión WebSocket bidireccional entre todos los clientes
 *    conectados (latencia <50ms, sin depender de delays de PostgreSQL WAL ni RLS).
 * 2. Web BroadcastChannel API: Sincronización instantánea de 0ms entre todas las pestañas
 *    y ventanas del mismo navegador.
 * 3. PostgreSQL CDC: Captura de eventos INSERT, UPDATE, DELETE a nivel de base de datos.
 */

import { supabase } from './supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const GLOBAL_REALTIME_CHANNEL = 'bricklar_global_realtime'
export const BROWSER_BROADCAST_CHANNEL = 'bricklar_tasks_sync'

export type RealtimeSyncDomain =
  | 'tasks'
  | 'workdays'
  | 'settlements'
  | 'cash_movements'
  | 'notifications'
  | 'audit_logs'

export interface RealtimeSyncPayload {
  domain: RealtimeSyncDomain
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'assign'
    | 'status_change'
    | 'approve'
    | 'reject'
    | 'reorder'
    | 'general'
  entityId?: string
  assignedCourierId?: string | null
  previousCourierId?: string | null
  taskCode?: string
  taskTitle?: string
  userId?: string
  timestamp: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
}

// Canal compartido global de Supabase Realtime (singleton)
let globalChannel: RealtimeChannel | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let isSubscribing = false

// Instancia única del BroadcastChannel del navegador
let localBroadcastChannel: BroadcastChannel | null = null

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    localBroadcastChannel = new BroadcastChannel(BROWSER_BROADCAST_CHANNEL)
  } catch (err) {
    console.warn('[RealtimeSync] BroadcastChannel no soportado o bloqueado:', err)
  }
}

/**
 * Destruye el canal global de Supabase de forma segura (por ejemplo, al cerrar sesión).
 */
export function resetGlobalRealtimeChannel(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  isSubscribing = false
  if (globalChannel) {
    try {
      supabase.removeChannel(globalChannel)
    } catch (err) {
      console.warn('[RealtimeSync] Error al remover canal global:', err)
    }
    globalChannel = null
  }
}

/**
 * Obtiene o inicializa el canal global de Supabase con capacidades de Broadcast y CDC activadas.
 */
export function getGlobalRealtimeChannel(): RealtimeChannel {
  if (!globalChannel) {
    globalChannel = supabase.channel(GLOBAL_REALTIME_CHANNEL, {
      config: {
        broadcast: { self: false },
      },
    })
  }
  return globalChannel
}

/**
 * Asegura que el canal global de Supabase esté suscrito y conectado.
 * Retorna una promesa que resuelve `true` si se unió exitosamente o ya estaba unido.
 */
export async function ensureGlobalChannelSubscribed(timeoutMs = 3000): Promise<boolean> {
  const channel = getGlobalRealtimeChannel()

  if (channel.state === 'joined') {
    return true
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(channel.state === 'joined')
      }
    }, timeoutMs)

    if (channel.state !== 'joining' && !isSubscribing) {
      isSubscribing = true
      channel.subscribe((status, err) => {
        isSubscribing = false
        if (status === 'SUBSCRIBED') {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            resolve(true)
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (err) {
            console.warn('[RealtimeSync] Canal con estado:', status, err)
          }
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            resolve(false)
          }
        }
      })
    } else {
      // Si ya está en proceso de unirse, esperar a que complete o timeout
      const checkInterval = setInterval(() => {
        if (channel.state === 'joined') {
          clearInterval(checkInterval)
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            resolve(true)
          }
        }
      }, 50)

      setTimeout(() => clearInterval(checkInterval), timeoutMs)
    }
  })
}

/**
 * Emite un evento de sincronización a través de Supabase WebSocket y Browser BroadcastChannel.
 */
export async function broadcastSyncEvent(
  domain: RealtimeSyncDomain,
  action: RealtimeSyncPayload['action'],
  payloadData?: Partial<Omit<RealtimeSyncPayload, 'domain' | 'action' | 'timestamp'>>
): Promise<void> {
  const fullPayload: RealtimeSyncPayload = {
    domain,
    action,
    timestamp: new Date().toISOString(),
    ...payloadData,
  }

  const isDev = import.meta.env.DEV

  // 1. Difundir vía Web API BroadcastChannel a otras pestañas/ventanas locales (0ms)
  try {
    if (localBroadcastChannel) {
      localBroadcastChannel.postMessage(fullPayload)
      if (isDev) {
        console.log(`[RealtimeSync Browser Tab Broadcast] ${domain}:${action}`, fullPayload)
      }
    }
  } catch (err) {
    console.warn('[RealtimeSync] Error al enviar BroadcastChannel local:', err)
  }

  // 2. Difundir vía Supabase Realtime Broadcast a todos los usuarios/dispositivos conectados
  try {
    const isJoined = await ensureGlobalChannelSubscribed(2000)
    const channel = getGlobalRealtimeChannel()

    if (isJoined || channel.state === 'joined') {
      const sendResult = await channel.send({
        type: 'broadcast',
        event: 'sync_event',
        payload: fullPayload,
      })
      if (isDev) {
        console.log(`[RealtimeSync Supabase WebSocket Broadcast] ${domain}:${action}`, sendResult, fullPayload)
      }
    } else {
      console.warn('[RealtimeSync] No se pudo enviar broadcast porque el canal no está unido.')
    }
  } catch (err) {
    console.warn('[RealtimeSync] Error al enviar Supabase Realtime Broadcast:', err)
  }
}

/**
 * Registra un listener para el BroadcastChannel del navegador.
 */
export function onLocalBroadcast(callback: (payload: RealtimeSyncPayload) => void): () => void {
  if (!localBroadcastChannel) return () => {}

  const handleMessage = (event: MessageEvent<RealtimeSyncPayload>) => {
    if (event.data && event.data.domain) {
      callback(event.data)
    }
  }

  localBroadcastChannel.addEventListener('message', handleMessage)
  return () => {
    localBroadcastChannel?.removeEventListener('message', handleMessage)
  }
}
