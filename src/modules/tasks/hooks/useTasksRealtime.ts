import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/modules/auth/useAuth'
import { useToast } from '@/shared/components/ui'
import {
  getGlobalRealtimeChannel,
  resetGlobalRealtimeChannel,
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
 * 4. Reactividad Pasiva: Solo invalida queries (TanStack refetch automático); sin refetchQueries explícito
 *    para evitar cascadas de egress al recibir eventos en ráfaga.
 * 5. Resiliencia de Enfoque: Al cambiar de pestaña solo invalida si han pasado más de 30 s desde el último ciclo.
 *
 * [Egress Fix H-01] refetchQueries eliminados → solo invalidateQueries.
 * [Egress Fix H-01] Debounce 400 ms en handleBroadcastEvent para colapsar ráfagas Broadcast+CDC.
 * [Egress Fix H-01] handleVisibilityChange acotado a >30 s sin invalidación previa.
 */
export function useTasksRealtime() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const toast = useToast()

  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  // ─── Refs para debounce y guard de visibilidad ──────────────────────────
  // debounceTimerRef: colapsa ráfagas Broadcast+CDC en una sola invalidación
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // lastInvalidateRef: timestamp del último ciclo de invalidación global
  const lastInvalidateRef = useRef<number>(0)

  // ─── Funciones Granulares de Invalidación (sin refetchQueries) ───────────
  // TanStack Query refetcha automáticamente las queries activas al invalidarlas;
  // llamar a refetchQueries de forma explícita genera una petición HTTP extra
  // duplicada que era la causa principal del egress excesivo (H-01).
  const invalidateTasks = useCallback((specificTaskId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })

    if (specificTaskId) {
      queryClient.invalidateQueries({ queryKey: ['task', specificTaskId] })
      queryClient.invalidateQueries({ queryKey: ['task-history', specificTaskId] })
      queryClient.invalidateQueries({ queryKey: ['task-assignments', specificTaskId] })
    }
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
  }, [queryClient])

  const invalidateWorkdays = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workdays'] })
    queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
    queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
  }, [queryClient])

  const invalidateSettlements = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['settlements'] })
    queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
    queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
  }, [queryClient])

  const invalidateCashMovements = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cash_movements'] })
    queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
    queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
  }, [queryClient])

  const invalidateNotifications = useCallback(() => {
    if (profile?.id) {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] })
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

    // ─── 1. Temporizador Unificado de Debounce para Broadcast y CDC ─────────
    // [Egress H-01] Broadcast y CDC comparten UN solo temporizador de 400 ms.
    // Esto garantiza que cuando una mutación emite eventos por ambos canales
    // (Broadcast local/WS + PostgreSQL CDC), se colapsen en una única ronda
    // de invalidaciones de TanStack Query, evitando peticiones duplicadas.
    const pendingInvalidations = {
      tasks: false,
      taskIds: new Set<string>(),
      workdays: false,
      settlements: false,
      cashMovements: false,
      notifications: false,
    }

    const scheduleDebouncedInvalidation = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        lastInvalidateRef.current = Date.now()

        if (pendingInvalidations.tasks) {
          if (pendingInvalidations.taskIds.size > 0) {
            pendingInvalidations.taskIds.forEach((id) => invalidateTasks(id))
          } else {
            invalidateTasks()
          }
        }
        if (pendingInvalidations.workdays) invalidateWorkdays()
        if (pendingInvalidations.settlements) invalidateSettlements()
        if (pendingInvalidations.cashMovements) invalidateCashMovements()
        if (pendingInvalidations.notifications) invalidateNotifications()

        // Resetear acumulación
        pendingInvalidations.tasks = false
        pendingInvalidations.taskIds.clear()
        pendingInvalidations.workdays = false
        pendingInvalidations.settlements = false
        pendingInvalidations.cashMovements = false
        pendingInvalidations.notifications = false
        debounceTimerRef.current = null
      }, 400)
    }

    const handleBroadcastEvent = (payload: RealtimeSyncPayload) => {
      if (isDev) {
        console.log(`[Realtime Broadcast Received: ${payload.domain}:${payload.action}]`, payload)
      }

      // Registrar entidades para la invalidación unificada
      if (payload.domain === 'workdays') {
        pendingInvalidations.workdays = true
      } else if (payload.domain === 'settlements') {
        pendingInvalidations.settlements = true
      } else if (payload.domain === 'cash_movements') {
        pendingInvalidations.cashMovements = true
      } else if (payload.domain === 'notifications') {
        pendingInvalidations.notifications = true
      } else {
        pendingInvalidations.tasks = true
        if (payload.entityId) {
          pendingInvalidations.taskIds.add(payload.entityId)
        }
      }

      scheduleDebouncedInvalidation()

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
    // IMPORTANTE: Resetear el canal antes de registrar listeners para evitar el error
    // "cannot add postgres_changes callbacks after subscribe()". El canal es un
    // singleton y si el efecto se re-ejecuta, el canal ya estaría suscrito.
    resetGlobalRealtimeChannel()
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

        // Registrar en acumulador y debouncar usando el mismo timer que Broadcast
        pendingInvalidations.tasks = true
        if (targetTaskId) {
          pendingInvalidations.taskIds.add(targetTaskId)
        }
        scheduleDebouncedInvalidation()

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
        pendingInvalidations.tasks = true
        if (row?.task_id) {
          pendingInvalidations.taskIds.add(row.task_id)
        }
        scheduleDebouncedInvalidation()
      }
    )

    // Listener PostgreSQL CDC sobre 'workdays'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workdays' },
      () => {
        pendingInvalidations.workdays = true
        scheduleDebouncedInvalidation()
      }
    )

    // Listener PostgreSQL CDC sobre 'settlements'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settlements' },
      () => {
        pendingInvalidations.settlements = true
        scheduleDebouncedInvalidation()
      }
    )

    // Listener PostgreSQL CDC sobre 'cash_movements'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_movements' },
      () => {
        pendingInvalidations.cashMovements = true
        scheduleDebouncedInvalidation()
      }
    )

    // Listener PostgreSQL CDC sobre 'notifications'
    globalChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      () => {
        pendingInvalidations.notifications = true
        scheduleDebouncedInvalidation()
      }
    )

    // Asegurar suscripción activa al canal global
    ensureGlobalChannelSubscribed().catch((err) => {
      if (isDev) console.error('[Realtime Hub Error]', err)
    })

    // ─── 3. Resiliencia de Enfoque, Red y Reconexión Automática ────────────
    const VISIBILITY_THROTTLE_MS = 30_000 // 30 segundos mínimo entre invalidaciones globales

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
        // [Egress H-01] Solo invalida si han pasado más de 30 s desde la última
        // invalidación global para evitar ráfagas al cambiar de pestaña repetidamente.
        const msSinceLast = Date.now() - lastInvalidateRef.current
        if (msSinceLast < VISIBILITY_THROTTLE_MS) {
          if (isDev) console.log(`[Realtime Resilience] Pestaña activa: omitiendo invalidación (${Math.round(msSinceLast / 1000)}s desde última)`)
          return
        }
        if (isDev) console.log('[Realtime Resilience] Pestaña activa: sincronizando datos...')
        lastInvalidateRef.current = Date.now()
        handleRevalidateActiveState()
      }
    }

    const handleOnline = () => {
      if (isDev) console.log('[Realtime Resilience] Red restablecida: sincronizando datos...')
      lastInvalidateRef.current = Date.now()
      handleRevalidateActiveState()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    // Nota: se omite window 'focus' intencionalmente — 'visibilitychange' ya
    // cubre el retorno al foco de ventana/pestaña sin duplicar invalidaciones.
    window.addEventListener('online', handleOnline)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      unsubscribeLocal()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [
    profile?.id,
    profile?.role,
    // profile?.full_name se omite intencionalmente: solo se usa en un console.log de desarrollo
    // y causaba re-suscripciones innecesarias al canal global.
    invalidateTasks,
    invalidateWorkdays,
    invalidateSettlements,
    invalidateCashMovements,
    invalidateNotifications,
  ])
}
