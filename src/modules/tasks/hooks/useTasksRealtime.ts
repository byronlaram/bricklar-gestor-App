import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/useAuth'
import { useToast } from '@/shared/components/ui'

interface TaskPayloadRow {
  id?: string
  code?: string
  title?: string
  assigned_courier_id?: string | null
  status?: string
  branch_id?: string
  scheduled_date?: string
}

interface AssignmentPayloadRow {
  id?: string
  task_id?: string
  courier_id?: string
  assigned_by?: string
}

/**
 * Hook para suscribirse en tiempo real a los cambios de las tablas 'tasks' y 'task_assignments' en Supabase.
 * - Mantiene referencia estable de toast para evitar desconexiones espurias.
 * - Invalida y refresca de inmediato todas las queries activas de tareas, saldos, usuarios y KPIs.
 * - Escucha eventos INSERT, UPDATE y DELETE tanto en tasks como en task_assignments.
 * - Incluye listeners de resiliencia ante visibilitychange, focus y online (desbloqueo y reconexión).
 */
export function useTasksRealtime() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const toast = useToast()

  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  useEffect(() => {
    const userId = profile?.id
    if (!userId) return

    const isCourier = profile?.role === 'courier'
    const isAdmin = profile?.role === 'general_admin' || profile?.role === 'junior_admin'
    const isDev = import.meta.env.DEV

    if (isDev) {
      console.log(`[Realtime] Inicializando suscripción para usuario ${profile.full_name} (${userId}), rol: ${profile.role}`)
    }

    const refetchAllActiveQueries = () => {
      // 1. Tareas y asignaciones
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

      // 4. Notificaciones
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.refetchQueries({ queryKey: ['notifications', userId], type: 'active' })

      // 5. Dashboard KPIs (Admin)
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
        queryClient.refetchQueries({ queryKey: ['dashboard-kpis'], type: 'active' })
      }
    }

    // Canal único para evitar colisiones durante limpiezas asíncronas
    const channelId = Math.random().toString(36).substring(2, 7)
    const channelName = `tasks_realtime_${userId}_${channelId}`
    const channel = supabase.channel(channelName)

    // 1. Listener de eventos sobre la tabla 'tasks' (todos los eventos)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
      },
      (payload) => {
        const newRow = payload.new as TaskPayloadRow | undefined
        const oldRow = payload.old as TaskPayloadRow | undefined
        const eventType = payload.eventType

        if (isDev) {
          console.log(`[Realtime Tasks Event: ${eventType}]`, {
            userId,
            new_assigned: newRow?.assigned_courier_id,
            old_assigned: oldRow?.assigned_courier_id,
            code: newRow?.code || oldRow?.code,
          })
        }

        refetchAllActiveQueries()

        // Toasts contextuales para el motorizado
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

    // 2. Listener sobre 'task_assignments' (todos los eventos)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'task_assignments',
      },
      (payload) => {
        const row = (payload.new || payload.old) as AssignmentPayloadRow | undefined
        if (isDev) {
          console.log(`[Realtime Assignment Event: ${payload.eventType}]`, row)
        }
        if (row?.courier_id === userId || isAdmin) {
          refetchAllActiveQueries()
        }
      }
    )

    // 3. Resiliencia: Listener de visibilidad de pantalla, foco y estado de red
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        if (isDev) console.log('[Realtime Resilience] App activa/visible/foco. Ejecutando refetch activo.')
        refetchAllActiveQueries()
      }
    }

    const handleOnline = () => {
      if (isDev) console.log('[Realtime Resilience] Conexión a red restablecida. Ejecutando refetch activo.')
      refetchAllActiveQueries()
    }

    window.addEventListener('visibilitychange', handleSync)
    window.addEventListener('focus', handleSync)
    window.addEventListener('online', handleOnline)

    // 4. Suscripción con reconexión en caso de error
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

    channel.subscribe((status, err) => {
      if (isDev) {
        console.log(`[Realtime Channel ${channelName}] Status: ${status}`)
        if (err) {
          console.error(`[Realtime Channel ${channelName}] Error:`, err)
        }
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reconnectTimeout = setTimeout(() => {
          if (isDev) console.log('[Realtime] Reintentando sincronización tras error de canal...')
          refetchAllActiveQueries()
        }, 2500)
      }
    })

    return () => {
      if (isDev) {
        console.log(`[Realtime] Limpiando canal ${channelName}`)
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      window.removeEventListener('visibilitychange', handleSync)
      window.removeEventListener('focus', handleSync)
      window.removeEventListener('online', handleOnline)
      supabase.removeChannel(channel)
    }
  }, [queryClient, profile?.id, profile?.role, profile?.full_name])
}
