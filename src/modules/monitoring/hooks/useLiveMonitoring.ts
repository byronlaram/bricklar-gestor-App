import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useCouriers } from '@/modules/tasks/hooks/useCouriers'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useWorkdays } from '@/modules/workdays/hooks/useWorkday'
import { getLocalDateString } from '@/shared/utils/date'
import type {
  CourierLivePosition,
  CourierMonitoringSummary,
  MonitoringFilters,
} from '../types/monitoring.types'
import type { Workday } from '@/modules/workdays/types/workdays.types'

const CHANNEL_NAME = 'courier-tracking'
const ONLINE_TIMEOUT_MS = 90_000 // 90 segundos sin ping se considera inactivo

export function useLiveMonitoring(filters: MonitoringFilters) {
  const todayStr = getLocalDateString()
  const [livePositions, setLivePositions] = useState<Record<string, CourierLivePosition>>({})

  // 1. Obtener lista de motorizados de la sucursal
  const { data: couriers = [], isLoading: isLoadingCouriers } = useCouriers(filters.branch_id)

  // 2. Obtener tareas de hoy
  const { data: tasksData, isLoading: isLoadingTasks, refetch: refetchTasks } = useTasks({
    branch_id: filters.branch_id,
    date: todayStr,
    page_size: 200,
  })

  // 3. Obtener jornadas activas de hoy
  const { data: workdays = [] } = useWorkdays({
    branch_id: filters.branch_id,
    date: todayStr,
  })

  const tasks = useMemo(() => tasksData?.data || [], [tasksData])

  // Escucha en tiempo real de pings de GPS via Supabase Broadcast
  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME, {
      config: { broadcast: { self: true } },
    })

    channel
      .on('broadcast', { event: 'location_update' }, (payload) => {
        const position = payload.payload as CourierLivePosition
        if (position && position.courier_id) {
          setLivePositions((prev) => ({
            ...prev,
            [position.courier_id]: position,
          }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Consolidar resumen de cada motorizado
  const couriersSummary = useMemo<CourierMonitoringSummary[]>(() => {
    const now = Date.now()

    return couriers.map((courier) => {
      const livePos = livePositions[courier.id]
      const courierWorkday = workdays.find(
        (w: Workday) => w.courier_id === courier.id && w.status === 'open'
      )

      // Determinar si está en línea (ping en los últimos 90s)
      const lastPingTime = livePos?.timestamp ? new Date(livePos.timestamp).getTime() : 0
      const isOnline = !!courierWorkday && now - lastPingTime < ONLINE_TIMEOUT_MS

      // Tareas de este motorizado
      const courierTasks = tasks.filter((t) => t.assigned_courier_id === courier.id)
      const completedTasks = courierTasks.filter((t) => t.status === 'completed')
      const pendingTasks = courierTasks.filter((t) =>
        ['assigned', 'en_route', 'in_progress'].includes(t.status)
      )

      // Tarea activa (en ruta o en gestión)
      const activeTask =
        courierTasks.find((t) => ['en_route', 'in_progress'].includes(t.status)) ||
        pendingTasks[0] ||
        null

      const progressPercentage =
        courierTasks.length > 0
          ? Math.round((completedTasks.length / courierTasks.length) * 100)
          : 0

      return {
        courier_id: courier.id,
        courier_name: courier.full_name || courier.display_name || 'Motorizado',
        courier_phone: courier.phone,
        avatar_url: courier.avatar_url,
        workday_id: courierWorkday?.id || null,
        is_online: isOnline,
        last_ping: livePos?.timestamp || null,
        position: livePos
          ? {
              latitude: livePos.latitude,
              longitude: livePos.longitude,
              heading: livePos.heading ?? null,
              speed: livePos.speed ?? null,
              accuracy: livePos.accuracy ?? null,
            }
          : null,
        active_task: activeTask,
        assigned_tasks_count: courierTasks.length,
        completed_tasks_count: completedTasks.length,
        pending_tasks_count: pendingTasks.length,
        progress_percentage: progressPercentage,
      }
    })
  }, [couriers, livePositions, workdays, tasks])

  // Tareas filtradas para renderizar pines en el mapa
  const mapTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      if (filters.courier_id && t.assigned_courier_id !== filters.courier_id) {
        return false
      }
      if (filters.status_filter && filters.status_filter !== 'all') {
        return t.status === filters.status_filter
      }
      return true
    })

    return result
  }, [tasks, filters.courier_id, filters.status_filter])

  // Métricas operacionales globales
  const stats = useMemo(() => {
    const totalCouriers = couriers.length
    const activeWorkdaysCount = workdays.filter((w: Workday) => w.status === 'open').length
    const couriersEnRouteCount = couriersSummary.filter(
      (c) => c.active_task?.status === 'en_route'
    ).length
    const totalTasksToday = tasks.length
    const completedTasksToday = tasks.filter((t) => t.status === 'completed').length
    const pendingTasksToday = tasks.filter((t) =>
      ['pending', 'assigned', 'en_route', 'in_progress'].includes(t.status)
    ).length

    return {
      totalCouriers,
      activeWorkdaysCount,
      couriersEnRouteCount,
      totalTasksToday,
      completedTasksToday,
      pendingTasksToday,
    }
  }, [couriers, workdays, couriersSummary, tasks])

  return {
    couriersSummary,
    mapTasks,
    stats,
    isLoading: isLoadingCouriers || isLoadingTasks,
    refetchTasks,
  }
}
