import { supabase } from '@/shared/lib/supabaseClient'
import { broadcastSyncEvent } from '@/shared/lib/realtimeSync'
import type { AppNotification, CreateNotificationPayload } from '../types/notifications.types'

/**
 * Obtener las notificaciones del usuario ordenadas por fecha reciente.
 */
export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.warn('[Notifications] Error fetching notifications:', error.message)
    return []
  }

  return (data ?? []).map((n) => ({
    id: n.id,
    user_id: n.user_id,
    title: n.title,
    body: n.body,
    type: (n.type as AppNotification['type']) || 'info',
    task_id: n.task_id,
    workday_id: n.workday_id,
    branch_id: n.branch_id,
    created_by: n.created_by,
    created_at: n.created_at,
    read_at: n.read_at,
    dismissed_at: n.dismissed_at,
    data: (n.data as Record<string, unknown>) || null,
    is_read: !!n.read_at,
  }))
}

/**
 * Crear una notificación en la base de datos y emitir evento Realtime.
 */
export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession()
    const senderId = payload.createdBy || session?.session?.user?.id || null

    const { error } = await supabase.from('notifications').insert({
      user_id: payload.userId,
      title: payload.title,
      body: payload.body,
      type: payload.type || 'info',
      task_id: payload.taskId || null,
      workday_id: payload.workdayId || null,
      branch_id: payload.branchId || null,
      created_by: senderId,
      data: (payload.data as any) || null,
    })

    if (error) {
      console.warn('[Notifications] Error inserting notification:', error.message)
    } else {
      // Emitir evento Realtime para sincronizar la campana y la bandeja
      broadcastSyncEvent('notifications', 'create', {
        assignedCourierId: payload.userId,
        entityId: payload.taskId || payload.workdayId || undefined,
        taskTitle: payload.title,
      })
    }
  } catch (err) {
    console.warn('[Notifications] createNotification caught exception:', err)
  }
}

/**
 * Marcar una notificación como leída.
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.warn('[Notifications] Error marking notification as read:', error.message)
  }
}

/**
 * Marcar todas las notificaciones no leídas de un usuario como leídas.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) {
    console.warn('[Notifications] Error marking all as read:', error.message)
  }
}
