import { useEffect } from 'react'
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
 * - Verifica el estado explícito de la suscripción (SUBSCRIBED, CHANNEL_ERROR, CLOSED, TIMED_OUT).
 * - Forzada tanto la invalidación como el refetch activo inmediato en TanStack Query v5.
 * - Incluye listeners de resiliencia para visibilitychange y online (desbloqueo de celular y reconexión de red).
 * - Despliega avisos Toast descriptivos al motorizado ante asignaciones entrantes/salientes.
 */
export function useTasksRealtime() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const toast = useToast()

  useEffect(() => {
    const userId = profile?.id
    if (!userId) return

    const isCourier = profile?.role === 'courier'
    const isAdmin = profile?.role === 'general_admin' || profile?.role === 'junior_admin'
    const isDev = import.meta.env.DEV

    if (isDev) {
      console.log(`[Realtime] Inicializando suscripción para usuario ${profile.full_name} (${userId}), rol: ${profile.role}`)
    }

    // Canal único por usuario
    const channelName = `tasks_realtime_v2_${userId}`
    const channel = supabase.channel(channelName)

    const refetchAllActiveQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.refetchQueries({ queryKey: ['tasks'], type: 'active' })

      queryClient.invalidateQueries({ queryKey: ['couriers'] })
      queryClient.refetchQueries({ queryKey: ['couriers'], type: 'active' })

      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })

      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.refetchQueries({ queryKey: ['notifications', userId], type: 'active' })

      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
        queryClient.refetchQueries({ queryKey: ['dashboard-kpis'], type: 'active' })
      }
    }

    // 1. Listener de eventos sobre la tabla 'tasks'
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
            toast.info(
              'Nueva tarea asignada',
              `Se ha añadido a tu ruta la tarea${codeStr}${titleStr}`
            )
          } else if (wasAssignedToMe && !isAssignedToMe && eventType === 'UPDATE') {
            const codeStr = oldRow?.code ? ` [${oldRow.code}]` : ''
            toast.warning(
              'Tarea reasignada',
              `La tarea${codeStr} ha sido retirada o reasignada a otro motorizado.`
            )
          }
        }
      }
    )

    // 2. Listener adicional sobre 'task_assignments'
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'task_assignments',
      },
      (payload) => {
        const row = payload.new as AssignmentPayloadRow | undefined
        if (isDev) {
          console.log('[Realtime Assignment Event INSERT]', row)
        }
        if (row?.courier_id === userId || isAdmin) {
          refetchAllActiveQueries()
        }
      }
    )

    // 3. Resiliencia: Listener de visibilidad de pantalla (desbloqueo de celular) y estado de red
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isDev) console.log('[Realtime Resilience] App volvió a visible/foco. Ejecutando refetch activo.')
        refetchAllActiveQueries()
      }
    }

    const handleOnline = () => {
      if (isDev) console.log('[Realtime Resilience] Conexión a red restablecida. Ejecutando refetch activo.')
      refetchAllActiveQueries()
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    // 4. Suscripción y registro de estado del canal
    channel.subscribe((status, err) => {
      if (isDev) {
        console.log(`[Realtime Channel ${channelName}] Status: ${status}`)
        if (err) {
          console.error(`[Realtime Channel ${channelName}] Error:`, err)
        }
      }
    })

    return () => {
      if (isDev) {
        console.log(`[Realtime] Limpiando canal ${channelName}`)
      }
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      supabase.removeChannel(channel)
    }
  }, [queryClient, profile?.id, profile?.role, profile?.full_name, toast])
}
