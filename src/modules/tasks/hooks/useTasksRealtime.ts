import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/modules/auth/useAuth'
import { useToast } from '@/shared/components/ui'
import {
  getGlobalRealtimeChannel,
  onLocalBroadcast,
  type RealtimeSyncPayload,
} from '@/shared/lib/realtimeSync'

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
 * Hook de sincronización en tiempo real multicapa:
 * 1. WebSocket Broadcast Global (Supabase): Latencia <50ms entre cualquier dispositivo.
 * 2. Web BroadcastChannel (Pestañas locales): Sincronización 0ms sin tráfico de red.
 * 3. PostgreSQL Changes CDC (Supabase): Captura de eventos INSERT, UPDATE, DELETE a nivel de base de datos.
 * 4. Invalida y re-consulta de forma activa TanStack Query para tareas, dashboard, liquidaciones y jornadas.
 */
export function useTasksRealtime() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const toast = useToast()

  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const refetchAllActiveQueries = useCallback(() => {
    // 1. Tareas y Asignaciones
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.refetchQueries({ queryKey: ['tasks'], type: 'active' })

    // 2. Motorizados y Jornadas
    queryClient.invalidateQueries({ queryKey: ['couriers'] })
    queryClient.refetchQueries({ queryKey: ['couriers'], type: 'active' })

    queryClient.invalidateQueries({ queryKey: ['workdays'] })
    queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })

    // 3. Saldos, Movimientos y Liquidaciones
    queryClient.invalidateQueries({ queryKey: ['cash_movements'] })
    queryClient.refetchQueries({ queryKey: ['cash_movements'], type: 'active' })

    queryClient.invalidateQueries({ queryKey: ['settlements'] })
    queryClient.refetchQueries({ queryKey: ['settlements'], type: 'active' })

    queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
    queryClient.refetchQueries({ queryKey: ['courier_pending_balances'], type: 'active' })

    queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
    queryClient.refetchQueries({ queryKey: ['all_couriers_pending_balances'], type: 'active' })

    // 4. Panel Dashboard (Admin)
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })

    // 5. Notificaciones de usuario
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

      refetchAllActiveQueries()

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
        } else if (payload.action === 'assign' && isTargetCourier && !wasTargetCourier) {
          toastRef.current.info(
            'Nueva tarea asignada',
            `Se te ha asignado la tarea${codeStr}${titleStr}`
          )
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
        } else if (payload.action === 'reject' && isTargetCourier) {
          toastRef.current.error(
            'Gestión rechazada',
            `Tu gestión${codeStr} ha sido rechazada por administración.`
          )
        }
      }
    }

    // Escuchar mensajes del BroadcastChannel local entre pestañas
    const unsubscribeLocal = onLocalBroadcast(handleBroadcastEvent)

    // ─── 2. Conectar al Canal Compartido de Supabase ─────────────────────────
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

        if (isDev) {
          console.log(`[Realtime CDC Tasks Event: ${eventType}]`, {
            userId,
            new_assigned: newRow?.assigned_courier_id,
            old_assigned: oldRow?.assigned_courier_id,
            code: newRow?.code || oldRow?.code,
          })
        }

        refetchAllActiveQueries()

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
        refetchAllActiveQueries()
      }
    )

    // Listener PostgreSQL CDC sobre 'workdays'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workdays' },
      () => {
        refetchAllActiveQueries()
      }
    )

    // Listener PostgreSQL CDC sobre 'settlements'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settlements' },
      () => {
        refetchAllActiveQueries()
      }
    )

    // Listener PostgreSQL CDC sobre 'cash_movements'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_movements' },
      () => {
        refetchAllActiveQueries()
      }
    )

    // Listener PostgreSQL CDC sobre 'notifications'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      () => {
        refetchAllActiveQueries()
      }
    )

    // ─── 3. Resiliencia: Listener de visibilidad, foco y red ────────────────
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        if (isDev) console.log('[Realtime Resilience] App visible/foco. Ejecutando refetch activo.')
        refetchAllActiveQueries()
      }
    }

    const handleOnline = () => {
      if (isDev) console.log('[Realtime Resilience] Red restablecida. Ejecutando refetch activo.')
      refetchAllActiveQueries()
    }

    window.addEventListener('visibilitychange', handleSync)
    window.addEventListener('focus', handleSync)
    window.addEventListener('online', handleOnline)

    // Suscribir al canal global
    globalChannel.subscribe((status, err) => {
      if (isDev) {
        console.log(`[Realtime Hub Status] ${status}`)
        if (err) {
          console.error('[Realtime Hub Error]', err)
        }
      }

      if (status === 'SUBSCRIBED') {
        refetchAllActiveQueries()
      }
    })

    return () => {
      unsubscribeLocal()
      window.removeEventListener('visibilitychange', handleSync)
      window.removeEventListener('focus', handleSync)
      window.removeEventListener('online', handleOnline)
    }
  }, [profile?.id, profile?.role, profile?.full_name, refetchAllActiveQueries])
}

