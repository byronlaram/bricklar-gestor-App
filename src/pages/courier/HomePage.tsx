import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  CheckCircle2,
  Clock,
  Navigation,
  Banknote,
  Gauge,
  ArrowRight,
  Loader2,
  ChevronRight,
  Phone,
  MessageCircle,
  MapPin,
  AlertCircle,
  StopCircle,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { useActiveWorkday, useWorkdayMutations } from '@/modules/workdays/hooks/useWorkday'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { StartWorkdayModal } from '@/modules/courier/components/StartWorkdayModal'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { TaskPriorityBadge } from '@/modules/tasks/components/TaskPriorityBadge'

export default function CourierHomePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = new Date().toISOString().split('T')[0]

  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [endKm, setEndKm] = useState<number | ''>('')
  const [isEndOpen, setIsEndOpen] = useState(false)

  const { data: activeWorkday, isLoading: isLoadingWorkday } = useActiveWorkday(profile?.id)
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({
    branch_id: branchId,
    courier_id: profile?.id,
    date: todayStr,
    page_size: 50,
  })

  const { endWorkday, isEnding } = useWorkdayMutations()

  const tasks = tasksData?.data || []
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'assigned' || t.status === 'en_route' || t.status === 'in_progress')
  const completedTasks = tasks.filter((t) => t.status === 'completed')

  // Total cobrado hoy
  const totalCollectedToday = completedTasks.reduce((acc, t) => {
    return acc + (t.expected_collection_amount || 0)
  }, 0)

  const handleEndSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkday || !endKm) return

    try {
      await endWorkday({
        workday_id: activeWorkday.id,
        final_km: Number(endKm),
      })
      setIsEndOpen(false)
    } catch (err) {
      console.error('Error ending workday:', err)
    }
  }

  return (
    <div className="p-4 space-y-5 animate-fade-in pb-20">
      {/* Saludo de Bienvenida */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            ¡Hola, {profile?.display_name || profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-xs text-foreground-muted">
            {new Date().toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Banner de Jornada Laboral */}
      {isLoadingWorkday ? (
        <div className="p-5 bg-card border border-border rounded-2xl flex items-center justify-center gap-2 text-xs text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Verificando jornada...
        </div>
      ) : !activeWorkday ? (
        <div className="p-5 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-background border border-emerald-500/30 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-md">
              <Play className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Apertura de Jornada</h2>
              <p className="text-xs text-foreground-muted">Inicia tu jornada para comenzar a operar.</p>
            </div>
          </div>

          <button
            onClick={() => setIsStartModalOpen(true)}
            className="w-full py-3 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4 fill-current" />
            Iniciar Jornada de Hoy
          </button>
        </div>
      ) : (
        <div className="p-4 bg-card border border-border rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Jornada Activa
              </span>
            </div>

            <button
              onClick={() => setIsEndOpen(true)}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer flex items-center gap-1"
            >
              <StopCircle className="h-3.5 w-3.5" />
              Solicitar Cierre
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40 text-xs">
            <div>
              <span className="text-foreground-muted text-[11px] block">Km Inicial:</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-accent" />
                {activeWorkday.initial_km} km
              </span>
            </div>

            <div>
              <span className="text-foreground-muted text-[11px] block">Fondo en Caja:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                C${activeWorkday.initial_cash}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas de Resumen de Tareas */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 bg-card border border-border rounded-xl text-center shadow-xs">
          <p className="text-[10px] text-foreground-muted font-medium">Por Entregar</p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400">{pendingTasks.length}</p>
        </div>

        <div className="p-3 bg-card border border-border rounded-xl text-center shadow-xs">
          <p className="text-[10px] text-foreground-muted font-medium">Completadas</p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{completedTasks.length}</p>
        </div>

        <div className="p-3 bg-card border border-border rounded-xl text-center shadow-xs">
          <p className="text-[10px] text-foreground-muted font-medium">Recaudado</p>
          <p className="text-lg font-black text-foreground">C${totalCollectedToday}</p>
        </div>
      </div>

      {/* Sección Tareas del Día */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Mis Tareas de Hoy</h2>
          <button
            onClick={() => navigate('/motorizado/tareas')}
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver todas ({tasks.length})
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {isLoadingTasks ? (
          <div className="p-8 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            Cargando tus entregas...
          </div>
        ) : pendingTasks.length === 0 ? (
          <div className="p-6 bg-card border border-border rounded-2xl text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-semibold text-foreground">¡Todo al día!</p>
            <p className="text-[11px] text-foreground-muted">No tienes entregas pendientes asignadas para hoy.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/motorizado/tareas/${task.id}`)}
                className="p-4 bg-card border border-border rounded-2xl shadow-xs hover:border-accent/50 transition cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-accent block">{task.code}</span>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{task.title}</h3>
                  </div>
                  <TaskStatusBadge status={task.status} showIcon={false} />
                </div>

                {task.contact_name && (
                  <p className="text-xs text-foreground-muted flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-foreground-subtle shrink-0" />
                    <span className="truncate">{task.contact_name} — {task.address || 'Sin dirección'}</span>
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <TaskPriorityBadge priority={task.priority} />
                  <span className="font-semibold text-accent flex items-center gap-1">
                    Ver Detalle
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Cierre de Jornada */}
      {isEndOpen && activeWorkday && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Solicitar Cierre de Jornada</h3>
            <p className="text-xs text-foreground-muted">
              Ingresa el kilometraje final para entregar tu turno a administración.
            </p>

            <form onSubmit={handleEndSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">
                  Kilometraje Final (Km inicial: {activeWorkday.initial_km})
                </label>
                <input
                  type="number"
                  required
                  min={activeWorkday.initial_km}
                  placeholder="Ej: 45310"
                  value={endKm}
                  onChange={(e) => setEndKm(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEndOpen(false)}
                  className="px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground border border-border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEnding}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5"
                >
                  {isEnding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirmar Cierre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Apertura Jornada */}
      <StartWorkdayModal
        branchId={branchId}
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
      />
    </div>
  )
}
