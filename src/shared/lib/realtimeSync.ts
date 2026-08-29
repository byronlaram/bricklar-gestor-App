/**
 * ─── Central Realtime Synchronization Hub ─────────────────────────────────────
 * Capa de sincronización instantánea y reactiva:
 * 1. Supabase Realtime Broadcast: Difusión WebSocket bidireccional entre todos los clientes
 *    conectados (latencia <50ms, sin depender de delays de PostgreSQL WAL ni RLS).
 * 2. Web BroadcastChannel API: Sincronización instantánea de 0ms entre todas las pestañas
 *    y ventanas del mismo navegador.
 */

import { supabase } from './supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const GLOBAL_REALTIME_CHANNEL = 'bricklar_global_realtime'
export const BROWSER_BROADCAST_CHANNEL = 'bricklar_tasks_sync'

export type RealtimeSyncDomain = 'tasks' | 'workdays' | 'settlements' | 'cash_movements' | 'notifications'

export interface RealtimeSyncPayload {
  domain: RealtimeSyncDomain
  action: 'create' | 'update' | 'delete' | 'assign' | 'status_change' | 'approve' | 'reject' | 'reorder' | 'general'
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
 * Resetea y destruye limpiamente el canal global de Supabase para evitar suscripciones huérfanas
 * o colisiones de callbacks al cerrar o alternar sesión de usuario.
 */
export function resetGlobalRealtimeChannel(): void {
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
 * Obtiene o inicializa el canal global de Supabase con capacidades de Broadcast activadas.
 */
export function getGlobalRealtimeChannel(): RealtimeChannel {
  if (!globalChannel) {
    globalChannel = supabase.channel(GLOBAL_REALTIME_CHANNEL, {
      config: {
        broadcast: { self: false }, // No rebotar eventos al mismo socket emisor
      },
    })
  }
  return globalChannel
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
    const channel = getGlobalRealtimeChannel()
    await channel.send({
      type: 'broadcast',
      event: 'sync_event',
      payload: fullPayload,
    })
    if (isDev) {
      console.log(`[RealtimeSync Supabase WebSocket Broadcast] ${domain}:${action}`, fullPayload)
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
