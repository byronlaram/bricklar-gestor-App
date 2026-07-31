import {
  Bell,
  CheckCheck,
  Package,
  DollarSign,
  AlertCircle,
  Info,
  Megaphone,
  Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/AuthContext'

interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: 'info' | 'warning' | 'success' | 'task' | 'settlement' | 'announcement'
  is_read: boolean
  created_at: string
}

async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.warn('[Notifications] table may not exist yet:', error.message)
    return []
  }

  return (data ?? []) as Notification[]
}

async function markAllRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
}

async function markOneRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: React.ReactNode; colorClass: string; badgeClass: string }
> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    badgeClass: 'bg-sky-500',
  },
  warning: {
    icon: <AlertCircle className="h-4 w-4" />,
    colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    badgeClass: 'bg-amber-500',
  },
  success: {
    icon: <CheckCheck className="h-4 w-4" />,
    colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    badgeClass: 'bg-emerald-500',
  },
  task: {
    icon: <Package className="h-4 w-4" />,
    colorClass: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20',
    badgeClass: 'bg-violet-500',
  },
  settlement: {
    icon: <DollarSign className="h-4 w-4" />,
    colorClass: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20',
    badgeClass: 'bg-teal-500',
  },
  announcement: {
    icon: <Megaphone className="h-4 w-4" />,
    colorClass: 'text-accent bg-accent/10 border-accent/20',
    badgeClass: 'bg-accent',
  },
}

export default function CourierNotificationsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const userId = profile?.id ?? ''

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => fetchNotifications(userId),
    enabled: !!userId,
    refetchInterval: 1000 * 60,
    staleTime: 1000 * 30,
  })

  const markAllMutation = useMutation({
    mutationFn: () => markAllRead(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  })

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markOneRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('es-NI', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            Notificaciones
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-accent text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Alertas y mensajes de administración.</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground-muted border border-border hover:text-foreground hover:bg-muted/50 rounded-xl transition cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas leídas
          </button>
        )}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
          <p className="text-sm">Cargando notificaciones...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-foreground-muted">
          <Bell className="h-12 w-12 opacity-20" />
          <p className="text-sm font-medium">Sin notificaciones</p>
          <p className="text-xs text-center max-w-xs">
            Aquí aparecerán las alertas, asignaciones de tareas y mensajes de administración.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info
            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) markOneMutation.mutate(notif.id)
                }}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer ${
                  notif.is_read
                    ? 'bg-card border-border opacity-70 hover:opacity-100'
                    : 'bg-card border-border shadow-xs hover:shadow-md'
                }`}
              >
                {/* Icono + punto no leído */}
                <div className="relative shrink-0">
                  <div className={`p-2 rounded-xl border ${config.colorClass}`}>
                    {config.icon}
                  </div>
                  {!notif.is_read && (
                    <span
                      className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-card ${config.badgeClass}`}
                    />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className={`text-sm font-semibold ${notif.is_read ? 'text-foreground-muted' : 'text-foreground'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-foreground-muted line-clamp-2">{notif.body}</p>
                  <p className="text-[11px] text-foreground-subtle">{formatTime(notif.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
