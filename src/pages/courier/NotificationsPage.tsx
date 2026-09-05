import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  Package,
  DollarSign,
  AlertCircle,
  Info,
  Megaphone,
  ChevronRight,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/modules/auth/useAuth'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/modules/notifications/services/notificationsService'
import type { AppNotification } from '@/modules/notifications/types/notifications.types'
import {
  getNotificationPermissionState,
  requestPushNotificationPermission,
  playNotificationChime,
  sendNativeNotification,
} from '@/shared/utils/webPushService'
import {
  Card,
  CardTitle,
  Button,
  Skeleton,
  EmptyState,
  useToast,
} from '@/shared/components/ui'
import { cn } from '@/shared/utils/cn'

const TYPE_CONFIG: Record<
  AppNotification['type'],
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
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const userId = profile?.id ?? ''

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'task' | 'settlement'>('all')
  const [permissionState, setPermissionState] = useState<NotificationPermission>(() =>
    getNotificationPermissionState()
  )

  const handleEnablePush = async () => {
    const granted = await requestPushNotificationPermission()
    if (granted) {
      setPermissionState('granted')
      toast.success(
        'Alertas Activadas',
        'Ahora recibirás avisos sonoros de nuevas tareas en tu teléfono.'
      )
    } else {
      toast.warning(
        'Permiso Requerido',
        'Por favor permite las notificaciones en los ajustes de tu navegador.'
      )
    }
  }

  const handleTestSound = () => {
    playNotificationChime()
    sendNativeNotification({
      title: 'Prueba de Alerta Bricklar',
      body: 'El sistema de sonido y vibración está funcionando correctamente.',
      url: '/motorizado/alertas',
    })
    toast.info('Sonido Emitido', 'Se ha reproducido la señal acústica de prueba.')
  }

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getNotifications(userId),
    enabled: !!userId,
    refetchInterval: 1000 * 30,
    staleTime: 1000 * 15,
  })

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  })

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.is_read
    if (activeTab === 'task') return n.type === 'task' || n.type === 'success' || n.type === 'warning'
    if (activeTab === 'settlement') return n.type === 'settlement'
    return true
  })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('es-NI', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.is_read) {
      markOneMutation.mutate(notif.id)
    }

    if (notif.task_id) {
      navigate('/motorizado/tareas')
    } else if (notif.workday_id || notif.type === 'settlement') {
      navigate('/motorizado/liquidacion')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in pb-20 max-w-2xl mx-auto">
      {/* Header Banpro SaaS */}
      <div className="bg-[#003875]/90 border border-blue-800 rounded-2xl p-5 shadow-xs text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-300" />
            Centro de Alertas
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                {unreadCount} nuevas
              </span>
            )}
          </h1>
          <p className="text-xs text-blue-100 font-medium mt-0.5">
            Avisos de tareas asignadas, revisiones de caja y confirmaciones operativas.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            isLoading={markAllMutation.isPending}
            leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
            className="text-2xs font-bold shrink-0 bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            Marcar todas leídas
          </Button>
        )}
      </div>

      {/* Banner de Permisos de Notificación Push Nativa */}
      {permissionState !== 'granted' ? (
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl shrink-0 mt-0.5">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Activar Alertas Nativas en este Dispositivo</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Recibe sonido y vibración cuando se te asigne una nueva tarea o se apruebe tu liquidación.
              </p>
            </div>
          </div>

          <Button
            onClick={handleEnablePush}
            variant="primary"
            size="sm"
            className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
          >
            Activar Alertas
          </Button>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
            <CheckCheck className="h-4 w-4 text-emerald-600" />
            <span>Alertas nativas y sonido activados en este teléfono</span>
          </div>
          <button
            onClick={handleTestSound}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
          >
            Probar Sonido
          </button>
        </div>
      )}

      {/* Tabs / Filtros Rápidos */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer',
            activeTab === 'all'
              ? 'bg-[#003875] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          Todas ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('unread')}
          className={cn(
            'px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer',
            activeTab === 'unread'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          No leídas ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('task')}
          className={cn(
            'px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer',
            activeTab === 'task'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          Tareas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settlement')}
          className={cn(
            'px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer',
            activeTab === 'settlement'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          Liquidaciones
        </button>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          title={activeTab === 'unread' ? 'No tienes alertas pendientes' : 'Sin notificaciones'}
          description="Aquí aparecerán las alertas automáticas de asignación de entregas, aprobaciones y avisos de administración."
          icon={<Bell className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info
            return (
              <Card
                key={notif.id}
                isHoverable
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-start gap-3.5 cursor-pointer transition-all ${
                  notif.is_read ? 'opacity-75' : 'hover:border-blue-300 ring-1 ring-blue-50'
                }`}
              >
                {/* Icono + indicador no leído */}
                <div className="relative shrink-0 mt-0.5">
                  <div className={`p-2.5 rounded-xl border ${config.colorClass}`}>
                    {config.icon}
                  </div>
                  {!notif.is_read && (
                    <span
                      className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 border-2 border-white animate-pulse"
                    />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className={`text-xs ${notif.is_read ? 'text-slate-700 font-semibold' : 'text-slate-900 font-extrabold'}`}>
                      {notif.title}
                    </CardTitle>
                    <span className="text-[10px] text-slate-400 font-mono font-medium shrink-0">
                      {formatTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 font-medium leading-relaxed">
                    {notif.body}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 self-center" />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
