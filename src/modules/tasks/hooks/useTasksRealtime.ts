import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/modules/auth/useAuth'
import { useToast } from '@/shared/components/ui'
import {
  getGlobalRealtimeChannel,
  ensureGlobalChannelSubscribed,
  onLocalBroadcast,
  type RealtimeSyncPayload,
} from '@/shared/lib/realtimeSync'
import { sendNativeNotification } from '@/shared/utils/webPushService'

interface TaskPayloadRow {
  id?: string
  code?: string
  title?: string
  assigned_courier_id?: string | null
  status?: string
  branch_id?: string
  scheduled_date?: string
  approval_status?: string
}

interface AssignmentPayloadRow {
  id?: string
  task_id?: string
  courier_id?: string
  assigned_by?: string
}

/**
 * Hook de sincronización en tiempo real multicapa y ultra-resiliente:
 * 1. WebSocket Broadcast Global (Supabase): Latencia <50ms entre cualquier usuario/dispositivo.
 * 2. Web BroadcastChannel (Pestañas locales): Sincronización instantánea de 0ms sin latencia ni tráfico externo.
 * 3. PostgreSQL Changes CDC (Supabase): Captura directa de eventos INSERT, UPDATE, DELETE a nivel de BD.
 * 4. Reactividad Activa: Invalida y re-consulta inmediatamente consultas activas de tareas, dashboard, liquidaciones y jornadas.
 * 5. Resiliencia de Enfoque: Al cambiar de pestaña/aplicación o regresar de suspensión, sincroniza automáticamente los datos.
 */
export function useTasksRealtime() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const toast = useToast()

  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  // ─── Funciones Granulares de Invalidación y Re-consulta Activa ───────────
  const invalidateTasks = useCallback((specificTaskId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.refetchQueries({ queryKey: ['tasks'], type: 'active' })

    if (specificTaskId) {
      queryClient.invalidateQueries({ queryKey: ['task', specificTaskId] })
      queryClient.refetchQueries({ queryKey: ['task', specificTaskId], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['task-history', specificTaskId] })
      queryClient.invalidateQueries({ queryKey: ['task-assignments', specificTaskId] })
    }
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })
    queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
    queryClient.refetchQueries({ queryKey: ['all_couriers_pending_balances'], type: 'active' })
  }, [queryClient])

  const invalidateWorkdays = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workdays'] })
    queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })
    queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
    queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
  }, [queryClient])

  const invalidateSettlements = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['settlements'] })
    queryClient.refetchQueries({ queryKey: ['settlements'], type: 'active' })
    queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
    queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
  }, [queryClient])

  const invalidateCashMovements = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cash_movements'] })
    queryClient.refetchQueries({ queryKey: ['cash_movements'], type: 'active' })
    queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
    queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
  }, [queryClient])

  const invalidateNotifications = useCallback(() => {
    if (profile?.id) {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] })
      queryClient.refetchQueries({ queryKey: ['notifications', profile.id], type: 'active' })
    }
  }, [queryClient, profile?.id])

  useEffect(() => {
    const userId = profile?.id
    if (!userId) return

    const isCourier = profile?.role === 'courier'
    const isDev = import.meta.env.DEV

    if (isDev) {
      console.log(`[Realtime Hub] Inicializando suscripción para ${profile.full_name} (${userId})`)
    }

    // ─── 1. Procesar Eventos de Difusión Rápida (Broadcast) ────────────────
    const handleBroadcastEvent = (payload: RealtimeSyncPayload) => {
      if (isDev) {
        console.log(`[Realtime Broadcast Received: ${payload.domain}:${payload.action}]`, payload)
      }

      if (payload.domain === 'workdays') {
        invalidateWorkdays()
      } else if (payload.domain === 'settlements') {
        invalidateSettlements()
      } else if (payload.domain === 'cash_movements') {
        invalidateCashMovements()
      } else if (payload.domain === 'notifications') {
        invalidateNotifications()
      } else {
        invalidateTasks(payload.entityId)
      }

      // Notificaciones Toasts específicas para motorizados
      if (isCourier) {
        const isTargetCourier = payload.assignedCourierId === userId
        const wasTargetCourier = payload.previousCourierId === userId

        const codeStr = payload.taskCode ? ` [${payload.taskCode}]` : ''
        const titleStr = payload.taskTitle ? `: ${payload.taskTitle}` : ''

        if (payload.action === 'create' && isTargetCourier) {
          toastRef.current.info(
            'Nueva tarea asignada',
            `Se ha añadido a tu ruta la tarea${codeStr}${titleStr}`
          )
          sendNativeNotification({
            title: 'Nueva Tarea Asignada',
            body: `Se ha añadido a tu ruta la tarea${codeStr}${titleStr}`,
            url: '/motorizado/tareas',
          })
        } else if (payload.action === 'assign' && isTargetCourier && !wasTargetCourier) {
          toastRef.current.info(
            'Nueva tarea asignada',
            `Se te ha asignado la tarea${codeStr}${titleStr}`
          )
          sendNativeNotification({
            title: 'Nueva Tarea Asignada',
            body: `Se te ha asignado la tarea${codeStr}${titleStr}`,
            url: '/motorizado/tareas',
          })
        } else if (payload.action === 'assign' && wasTargetCourier && !isTargetCourier) {
          toastRef.current.warning(
            'Tarea reasignada',
            `La tarea${codeStr} ha sido reasignada a otro motorizado.`
          )
        } else if (payload.action === 'approve' && isTargetCourier) {
          toastRef.current.success(
            'Gestión aprobada',
            `Tu gestión${codeStr} ha sido aprobada por administración.`
          )
          sendNativeNotification({
            title: 'Gestión Aprobada',
            body: `Tu gestión${codeStr} ha sido aprobada por administración.`,
            url: '/motorizado/tareas',
          })
        } else if (payload.action === 'reject' && isTargetCourier) {
          toastRef.current.error(
            'Gestión rechazada',
            `Tu gestión${codeStr} ha sido rechazada por administración.`
          )
          sendNativeNotification({
            title: 'Gestión Rechazada',
            body: `Tu gestión${codeStr} ha sido rechazada por administración.`,
            url: '/motorizado/tareas',
          })
        }
      }
    }

    // Escuchar mensajes del BroadcastChannel local entre pestañas
    const unsubscribeLocal = onLocalBroadcast(handleBroadcastEvent)

    // ─── 2. Conectar al Canal Compartido de Supabase Realtime ───────────────
    const globalChannel = getGlobalRealtimeChannel()

    // Listener Broadcast WebSocket
    globalChannel.on('broadcast', { event: 'sync_event' }, ({ payload }) => {
      handleBroadcastEvent(payload as RealtimeSyncPayload)
    })

    // Listener PostgreSQL CDC sobre 'tasks'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        const newRow = payload.new as TaskPayloadRow | undefined
        const oldRow = payload.old as TaskPayloadRow | undefined
        const eventType = payload.eventType
        const targetTaskId = newRow?.id || oldRow?.id

        if (isDev) {
          console.log(`[Realtime CDC Tasks Event: ${eventType}]`, {
            userId,
            new_assigned: newRow?.assigned_courier_id,
            old_assigned: oldRow?.assigned_courier_id,
            code: newRow?.code || oldRow?.code,
          })
        }

        invalidateTasks(targetTaskId)

        // Toasts contextuales de respaldo por CDC
        if (isCourier) {
          const isAssignedToMe = newRow?.assigned_courier_id === userId
          const wasAssignedToMe = oldRow?.assigned_courier_id === userId

          if (isAssignedToMe && (eventType === 'INSERT' || !wasAssignedToMe)) {
            const codeStr = newRow?.code ? ` [${newRow.code}]` : ''
            const titleStr = newRow?.title ? `: ${newRow.title}` : ''
            toastRef.current.info(
              'Nueva tarea asignada',
              `Se ha añadido a tu ruta la tarea${codeStr}${titleStr}`
            )
          } else if (wasAssignedToMe && !isAssignedToMe && eventType === 'UPDATE') {
            const codeStr = oldRow?.code ? ` [${oldRow.code}]` : ''
            toastRef.current.warning(
              'Tarea reasignada',
              `La tarea${codeStr} ha sido retirada o reasignada a otro motorizado.`
            )
          }
        }
      }
    )

    // Listener PostgreSQL CDC sobre 'task_assignments'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_assignments' },
      (payload) => {
        const row = (payload.new || payload.old) as AssignmentPayloadRow | undefined
        if (isDev) {
          console.log(`[Realtime CDC Assignment Event: ${payload.eventType}]`, row)
        }
        invalidateTasks(row?.task_id)
      }
    )

    // Listener PostgreSQL CDC sobre 'workdays'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workdays' },
      () => {
        invalidateWorkdays()
      }
    )

    // Listener PostgreSQL CDC sobre 'settlements'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settlements' },
      () => {
        invalidateSettlements()
      }
    )

    // Listener PostgreSQL CDC sobre 'cash_movements'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_movements' },
      () => {
        invalidateCashMovements()
      }
    )

    // Listener PostgreSQL CDC sobre 'notifications'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      () => {
        invalidateNotifications()
      }
    )

    // Asegurar suscripción activa al canal global
    ensureGlobalChannelSubscribed().catch((err) => {
      if (isDev) console.error('[Realtime Hub Error]', err)
    })

    // ─── 3. Resiliencia de Enfoque, Red y Reconexión Automática ────────────
    const handleRevalidateActiveState = () => {
      invalidateTasks()
      invalidateWorkdays()
      invalidateSettlements()
      invalidateCashMovements()
      invalidateNotifications()
      ensureGlobalChannelSubscribed().catch(() => {})
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isDev) console.log('[Realtime Resilience] Pestaña activa: sincronizando datos...')
        handleRevalidateActiveState()
      }
    }

    const handleWindowFocus = () => {
      handleRevalidateActiveState()
    }

    const handleOnline = () => {
      if (isDev) console.log('[Realtime Resilience] Red restablecida: sincronizando datos...')
      handleRevalidateActiveState()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('online', handleOnline)

    return () => {
      unsubscribeLocal()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('online', handleOnline)
    }
  }, [
    profile?.id,
    profile?.role,
    profile?.full_name,
    invalidateTasks,
    invalidateWorkdays,
    invalidateSettlements,
    invalidateCashMovements,
    invalidateNotifications,
  ])
}
