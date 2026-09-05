export type NotificationType =
  | 'info'
  | 'warning'
  | 'success'
  | 'task'
  | 'settlement'
  | 'announcement'

export interface AppNotification {
  id: string
  user_id: string
  title: string
  body: string
  type: NotificationType
  task_id: string | null
  workday_id: string | null
  branch_id: string | null
  created_by: string | null
  created_at: string
  read_at: string | null
  dismissed_at: string | null
  data: Record<string, unknown> | null
  is_read: boolean
}

export interface CreateNotificationPayload {
  userId: string
  title: string
  body: string
  type?: NotificationType
  taskId?: string | null
  workdayId?: string | null
  branchId?: string | null
  createdBy?: string | null
  data?: Record<string, unknown> | null
}
