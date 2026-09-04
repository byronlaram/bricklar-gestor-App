import type { TaskWithCourier } from '@/modules/tasks/types/task.types'

export interface CourierLivePosition {
  courier_id: string
  courier_name: string
  courier_phone: string | null
  avatar_url: string | null
  branch_id: string
  workday_id?: string | null
  latitude: number
  longitude: number
  heading?: number | null       // Grados de orientación (0-360°)
  speed?: number | null         // Velocidad en km/h
  accuracy?: number | null      // Precisión en metros
  battery_level?: number | null // Nivel de batería opcional (0-100)
  timestamp: string             // ISO timestamp
  active_task_id?: string | null
  active_task_code?: string | null
  active_task_title?: string | null
  active_task_status?: string | null
}

export interface LiveTrackingPayload {
  type: 'location_update' | 'task_status_changed' | 'workday_changed'
  courier: CourierLivePosition
}

export interface CourierMonitoringSummary {
  courier_id: string
  courier_name: string
  courier_phone: string | null
  avatar_url: string | null
  workday_id: string | null
  is_online: boolean
  last_ping: string | null
  position: {
    latitude: number
    longitude: number
    heading: number | null
    speed: number | null
    accuracy: number | null
  } | null
  active_task: TaskWithCourier | null
  assigned_tasks_count: number
  completed_tasks_count: number
  pending_tasks_count: number
  progress_percentage: number
}

export interface MonitoringFilters {
  branch_id: string
  courier_id?: string
  status_filter?: 'all' | 'en_route' | 'in_progress' | 'pending' | 'completed'
}
