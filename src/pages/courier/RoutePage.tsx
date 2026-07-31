import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  Bike,
  Building,
  User,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import { TaskTypeBadge } from '@/modules/tasks/components/TaskTypeBadge'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { TaskStatusModal } from '@/modules/tasks/components/TaskStatusModal'
import type { TaskWithCourier } from '@/modules/tasks/types/task.types'

export default function RoutePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const todayStr = new Date().toISOString().split('T')[0]

  const [statusTaskTarget, setStatusTaskTarget] = useState<TaskWithCourier | null>(null)

  const { data, isLoading } = useTasks({
    courier_id: profile?.id,
    date: todayStr,
    page_size: 50,
  })

  const { changeStatus } = useTaskMutations()

  const tasks = data?.data || []

  // Filtrar y ordenar activas en la ruta
  const activeTasks = tasks.filter((t) =>
    ['assigned', 'en_route', 'in_progress', 'not_completed'].includes(t.status)
  )
  const completedTasks = tasks.filter((t) => t.status === 'completed')

  const handleStartRoute = async (task: TaskWithCourier) => {
    try {
      await changeStatus({ task_id: task.id, new_status: 'en_route' })
    } catch (err) {
      console.error('Error al iniciar ruta:', err)
    }
  }

  const openNavigation = (task: TaskWithCourier) => {
    if (task.maps_url) {
      window.open(task.maps_url, '_blank')
    } else if (task.latitude && task.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${task.latitude},${task.longitude}`, '_blank')
    } else if (task.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address)}`, '_blank')
    } else {
      alert('Esta tarea no contiene dirección ni coordenadas registradas.')
    }
  }

  const openWhatsApp = (phone?: string | null) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleanPhone.startsWith('505') ? cleanPhone : '505' + cleanPhone}`, '_blank')
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in max-w-3xl mx-auto">
      {/* Header de la ruta */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            Mi Ruta del Día
          </h1>
          <p className="text-xs text-foreground-muted">
            Secuencia de diligencias y entregas para hoy.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
            {activeTasks.length} Pendientes
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-xs">Cargando la ruta del día...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <Bike className="h-10 w-10 text-foreground-subtle mx-auto" />
          <h2 className="text-sm font-semibold text-foreground">No tienes tareas asignadas hoy</h2>
          <p className="text-xs text-foreground-muted">
            Pide al administrador que te asigne tareas para ver tu hoja de ruta.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tareas Activas en Ruta */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              En Progreso ({activeTasks.length})
            </h2>

            {activeTasks.length === 0 ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                🎉 ¡Felicidades! Has completado todas las tareas activas de tu ruta.
              </div>
            ) : (
              activeTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3.5 hover:border-accent/40 transition-all"
                >
                  {/* Fila superior: Parada # + Código + Estado */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white font-bold text-xs shadow-xs">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-accent">{task.code}</span>
                      <TaskTypeBadge type={task.task_type} />
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </div>

                  {/* Título y Dirección */}
                  <div
                    onClick={() => navigate(`/motorizado/tareas/${task.id}`)}
                    className="cursor-pointer space-y-1.5 group"
                  >
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors flex items-center justify-between">
                      {task.title}
                      <ChevronRight className="h-4 w-4 text-foreground-subtle group-hover:text-accent transition-colors" />
                    </h3>

                    {task.address && (
                      <div className="flex items-start gap-1.5 text-xs text-foreground-muted">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
                        <span>{task.address}</span>
                      </div>
                    )}

                    {task.contact_name && (
                      <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                        <User className="h-3.5 w-3.5 text-foreground-subtle shrink-0" />
                        <span>{task.contact_name} {task.company_name ? `(${task.company_name})` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Cobro / Pago destacado */}
                  {(task.requires_collection || task.requires_payment) && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Monto de Operación:</span>
                      {task.requires_collection && (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          Cobrar C${task.expected_collection_amount ?? 0} ({task.expected_payment_method || 'efectivo'})
                        </span>
                      )}
                      {task.requires_payment && (
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          Pagar C${task.expected_payment_amount ?? 0}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botones de Acción de Ruta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                      {/* Botón Mapa */}
                      <button
                        onClick={() => openNavigation(task)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-xl hover:bg-sky-500/20 transition cursor-pointer"
                        title="Ver dirección en mapas"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Mapa
                      </button>

                      {/* Botón Llamar */}
                      {task.phone && (
                        <a
                          href={`tel:${task.phone}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition cursor-pointer"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Llamar
                        </a>
                      )}

                      {/* Botón WhatsApp */}
                      {task.phone && (
                        <button
                          onClick={() => openWhatsApp(task.phone)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition cursor-pointer"
                          title="Enviar mensaje de WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Botón de Estado */}
                    {task.status === 'assigned' ? (
                      <button
                        onClick={() => handleStartRoute(task)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        <Bike className="h-3.5 w-3.5" />
                        Iniciar Ruta
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatusTaskTarget(task)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Actualizar Estado
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tareas Completadas */}
          {completedTasks.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/40">
              <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Completadas Hoy ({completedTasks.length})
              </h2>

              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/motorizado/tareas/${task.id}`)}
                    className="bg-card/60 border border-border/50 rounded-xl p-3 flex items-center justify-between text-xs cursor-pointer hover:bg-card transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground line-through opacity-75">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-foreground-muted font-mono">{task.code}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-foreground-subtle" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de cambio de estado */}
      <TaskStatusModal
        isOpen={!!statusTaskTarget}
        onClose={() => setStatusTaskTarget(null)}
        task={statusTaskTarget}
      />
    </div>
  )
}
