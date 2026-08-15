import {
  Bell,
  CheckCheck,
  Package,
  DollarSign,
  AlertCircle,
  Info,
  Megaphone,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/useAuth'
import {
  Card,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  EmptyState,
} from '@/shared/components/ui'

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

  return (data ?? []).map((n) => ({
    id: n.id,
    user_id: n.user_id,
    title: n.title,
    body: n.body,
    type: (n.type as Notification['type']) || 'info',
    is_read: !!n.read_at,
    created_at: n.created_at,
  }))
}

async function markAllRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
}

async function markOneRead(id: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
}

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: React.ReactNode; colorClass: string }
> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    colorClass: 'text-sky-700 bg-sky-50 border-sky-200',
  },
  warning: {
    icon: <AlertCircle className="h-4 w-4" />,
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  success: {
    icon: <CheckCheck className="h-4 w-4" />,
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  task: {
    icon: <Package className="h-4 w-4" />,
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  settlement: {
    icon: <DollarSign className="h-4 w-4" />,
    colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
  },
  announcement: {
    icon: <Megaphone className="h-4 w-4" />,
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
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
    <div className="space-y-5 animate-fade-in pb-20 max-w-2xl mx-auto">
      {/* Header Durazno Pastel */}
      <div className="bg-orange-50/70 border border-orange-100/90 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Centro de Alertas
            {unreadCount > 0 && (
              <Badge variant="assigned" size="sm" className="bg-orange-600 text-white font-bold">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-xs text-orange-950 font-medium mt-0.5">Alertas y avisos operativos de administración.</p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            isLoading={markAllMutation.isPending}
            leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
            className="text-2xs font-bold shrink-0"
          >
            Marcar todas leídas
          </Button>
        )}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="Sin notificaciones"
          description="Aquí aparecerán las alertas, asignaciones de tareas y avisos de administración."
          icon={<Bell className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info
            return (
              <Card
                key={notif.id}
                isHoverable
                onClick={() => {
                  if (!notif.is_read) markOneMutation.mutate(notif.id)
                }}
                className={`p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-start gap-3.5 cursor-pointer transition-all ${
                  notif.is_read ? 'opacity-70' : 'hover:border-indigo-200'
                }`}
              >
                {/* Icono + punto no leído */}
                <div className="relative shrink-0">
                  <div className={`p-2.5 rounded-xl border ${config.colorClass}`}>
                    {config.icon}
                  </div>
                  {!notif.is_read && (
                    <span
                      className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-600 border-2 border-white"
                    />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0 space-y-1">
                  <CardTitle className={`text-xs ${notif.is_read ? 'text-slate-600' : 'text-slate-900 font-bold'}`}>
                    {notif.title}
                  </CardTitle>
                  <p className="text-xs text-slate-600 line-clamp-2 font-medium">{notif.body}</p>
                  <p className="text-2xs text-slate-400 font-mono font-semibold">{formatTime(notif.created_at)}</p>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
