import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Navigation,
  CheckCircle2,
  Loader2,
  DollarSign,
  Play,
  CheckSquare,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import type { TaskWithCourier } from '@/modules/tasks/types/task.types'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { TaskTypeBadge } from '@/modules/tasks/components/TaskTypeBadge'
import { CompleteTaskModal } from '@/modules/courier/components/CompleteTaskModal'

export default function CourierTasksPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = new Date().toISOString().split('T')[0]

  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [completeTargetTask, setCompleteTargetTask] = useState<TaskWithCourier | null>(null)

  const { data: tasksData, isLoading } = useTasks({
    branch_id: branchId,
    courier_id: profile?.id,
    date: todayStr,
    search: searchTerm || undefined,
    page_size: 100,
  })

  const { changeStatus, isChangingStatus } = useTaskMutations()

  const tasks = tasksData?.data || []

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'pending') {
      return (
        t.status === 'pending' ||
        t.status === 'assigned' ||
        t.status === 'en_route' ||
        t.status === 'in_progress'
      )
    }
    if (activeTab === 'completed') {
      return t.status === 'completed' || t.status === 'not_completed'
    }
    return true
  })

  const handleStartRoute = async (task: TaskWithCourier, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await changeStatus({ task_id: task.id, new_status: 'en_route', notes: 'Inició ruta' })
    } catch (err) {
      console.error(err)
    }
  }

  const handleStartManagement = async (task: TaskWithCourier, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await changeStatus({ task_id: task.id, new_status: 'in_progress', notes: 'Llegó al lugar de gestión' })
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenCompleteModal = (task: TaskWithCourier, e: React.MouseEvent) => {
    e.stopPropagation()
    setCompleteTargetTask(task)
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Mis Tareas Asignadas</h1>
        <span className="text-xs font-semibold px-2.5 py-1 bg-accent/10 text-accent rounded-full border border-accent/20">
          {filteredTasks.length} Tareas
        </span>
      </div>

      {/* Buscador táctil */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Buscar por cliente, código o título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground shadow-xs"
        />
      </div>

      {/* Pestañas Móviles */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-card text-accent shadow-xs'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          Pendientes
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          Completadas
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          Todas
        </button>
      </div>

      {/* Lista de Tareas */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          Cargando entregas...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-2">
          <CheckSquare className="h-8 w-8 text-foreground-muted mx-auto" />
          <p className="text-sm font-semibold text-foreground">No hay tareas en esta sección</p>
          <p className="text-xs text-foreground-muted">Revisa las demás pestañas o tu buscador.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => navigate(`/motorizado/tareas/${task.id}`)}
              className="bg-card border border-border rounded-2xl p-4 shadow-xs hover:border-accent/40 transition cursor-pointer space-y-3"
            >
              {/* Header de la Tarjeta */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-accent">{task.code}</span>
                    <TaskTypeBadge type={task.task_type} />
                  </div>
                  <h2 className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">{task.title}</h2>
                </div>
                <TaskStatusBadge status={task.status} />
              </div>

              {/* Contacto & Dirección */}
              <div className="text-xs text-foreground-muted space-y-1 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                {task.contact_name && (
                  <p className="font-medium text-foreground">{task.contact_name}</p>
                )}
                {task.address && (
                  <p className="flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{task.address}</span>
                  </p>
                )}
              </div>

              {/* Cobro si requiere */}
              {task.requires_collection && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20">
                  <DollarSign className="h-3.5 w-3.5" />
                  Cobro: C${task.expected_collection_amount || 0}
                </div>
              )}

              {/* Botones de Contacto Rápido */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                  {task.phone && (
                    <a
                      href={`tel:${task.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-sky-500/10 text-sky-600 rounded-xl hover:bg-sky-500/20 transition cursor-pointer"
                      title="Llamar"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}

                  {task.whatsapp && (
                    <a
                      href={`https://wa.me/${task.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-500/20 transition cursor-pointer"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}

                  {task.maps_url && (
                    <a
                      href={task.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-purple-500/10 text-purple-600 rounded-xl hover:bg-purple-500/20 transition cursor-pointer"
                      title="Abrir Mapa"
                    >
                      <Navigation className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Botón de Acción Principal en la tarjeta */}
                {task.status === 'assigned' && (
                  <button
                    onClick={(e) => handleStartRoute(task, e)}
                    disabled={isChangingStatus}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Iniciar Ruta
                  </button>
                )}

                {task.status === 'en_route' && (
                  <button
                    onClick={(e) => handleStartManagement(task, e)}
                    disabled={isChangingStatus}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    En Gestión
                  </button>
                )}

                {task.status === 'in_progress' && (
                  <button
                    onClick={(e) => handleOpenCompleteModal(task, e)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Finalizar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Finalizar Tarea */}
      <CompleteTaskModal
        task={completeTargetTask}
        isOpen={!!completeTargetTask}
        onClose={() => setCompleteTargetTask(null)}
      />
    </div>
  )
}
