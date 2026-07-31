import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Loader2,
  Eye,
  UserPlus,
  RefreshCw,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Navigation,
  CheckCircle2,
  ListFilter,
  DollarSign,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useCouriers } from '@/modules/tasks/hooks/useCouriers'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import type { TaskFilters as FilterType, TaskWithCourier } from '@/modules/tasks/types/task.types'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { TaskPriorityBadge } from '@/modules/tasks/components/TaskPriorityBadge'
import { TaskTypeBadge } from '@/modules/tasks/components/TaskTypeBadge'
import { TaskFilters } from '@/modules/tasks/components/TaskFilters'
import { TaskFormModal } from '@/modules/tasks/components/TaskFormModal'
import { AssignCourierModal } from '@/modules/tasks/components/AssignCourierModal'
import { TaskStatusModal } from '@/modules/tasks/components/TaskStatusModal'

export default function TasksPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''

  const [filters, setFilters] = useState<FilterType>({
    branch_id: defaultBranchId,
    page: 1,
    page_size: 15,
  })

  // State para modales
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<TaskWithCourier | null>(null)
  const [assignTaskTarget, setAssignTaskTarget] = useState<TaskWithCourier | null>(null)
  const [statusTaskTarget, setStatusTaskTarget] = useState<TaskWithCourier | null>(null)

  const { data, isLoading, isError, error } = useTasks(filters)
  const { data: couriers = [] } = useCouriers(filters.branch_id || defaultBranchId)
  const { deleteTask } = useTaskMutations()

  const tasks = data?.data || []
  const totalPages = data?.total_pages || 1
  const totalCount = data?.count || 0

  // Métricas rápidas
  const pendingCount = tasks.filter((t) => t.status === 'pending').length
  const enRouteCount = tasks.filter((t) => t.status === 'en_route').length
  const completedCount = tasks.filter((t) => t.status === 'completed').length

  const handleCreateNew = () => {
    setTaskToEdit(null)
    setIsFormOpen(true)
  }

  const handleEdit = (task: TaskWithCourier) => {
    setTaskToEdit(task)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string, code: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la tarea ${code}?`)) {
      try {
        await deleteTask(id)
      } catch (err) {
        console.error('Error al eliminar tarea:', err)
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header y Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Tareas</h1>
          <p className="text-xs text-foreground-muted">
            Administra, asigna y da seguimiento a las operaciones en tiempo real.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl shadow-md transition cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <ListFilter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Total Visibles</p>
            <p className="text-lg font-bold text-foreground">{totalCount}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Pendientes</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">En Ruta</p>
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{enRouteCount}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Completadas</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {completedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Componente de Filtros */}
      <TaskFilters filters={filters} onFilterChange={setFilters} couriers={couriers} />

      {/* Tabla de Tareas */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Cargando tareas...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-xs text-destructive">
            Error al cargar tareas: {(error as Error).message}
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">No se encontraron tareas</p>
            <p className="text-xs text-foreground-muted">
              Prueba cambiando los filtros o crea una nueva tarea.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 text-foreground-muted font-semibold border-b border-border">
                  <th className="py-3 px-4">Código / Título</th>
                  <th className="py-3 px-3">Tipo & Prioridad</th>
                  <th className="py-3 px-3">Contacto / Cliente</th>
                  <th className="py-3 px-3">Motorizado</th>
                  <th className="py-3 px-3 text-center">Finanzas</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/30 transition-colors group">
                    {/* Código / Título */}
                    <td className="py-3 px-4 max-w-[220px]">
                      <div
                        onClick={() => navigate(`/admin/tareas/${task.id}`)}
                        className="cursor-pointer group/title"
                      >
                        <div className="font-mono text-[11px] font-bold text-accent group-hover/title:underline">{task.code}</div>
                        <div className="font-medium text-foreground truncate group-hover/title:text-accent transition-colors" title={task.title}>
                          {task.title}
                        </div>
                      </div>
                      <div className="text-[10px] text-foreground-muted pt-0.5">
                        {task.scheduled_date} {task.scheduled_start_time ? `• ${task.scheduled_start_time}` : ''}
                      </div>
                    </td>

                    {/* Tipo & Prioridad */}
                    <td className="py-3 px-3 space-y-1">
                      <TaskTypeBadge type={task.task_type} />
                      <div>
                        <TaskPriorityBadge priority={task.priority} />
                      </div>
                    </td>

                    {/* Contacto / Cliente */}
                    <td className="py-3 px-3 max-w-[180px]">
                      <div className="font-medium text-foreground truncate">
                        {task.contact_name || task.company_name || 'Sin contacto'}
                      </div>
                      {task.phone && (
                        <div className="text-[10px] text-foreground-muted">{task.phone}</div>
                      )}
                    </td>

                    {/* Motorizado */}
                    <td className="py-3 px-3">
                      {task.courier ? (
                        <div className="font-medium text-sky-600 dark:text-sky-400 truncate">
                          {task.courier.display_name || task.courier.full_name}
                        </div>
                      ) : (
                        <span className="text-[11px] text-foreground-muted italic">Sin asignar</span>
                      )}
                    </td>

                    {/* Finanzas */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {task.requires_collection && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <DollarSign className="h-3 w-3" />
                            Cobrar C${task.expected_collection_amount ?? 0}
                          </span>
                        )}
                        {task.requires_payment && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            Pagar C${task.expected_payment_amount ?? 0}
                          </span>
                        )}
                        {!task.requires_collection && !task.requires_payment && (
                          <span className="text-[10px] text-foreground-muted">—</span>
                        )}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-3">
                      <TaskStatusBadge status={task.status} />
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/admin/tareas/${task.id}`)}
                          title="Ver detalle"
                          className="p-1.5 text-foreground-muted hover:text-accent hover:bg-accent/10 rounded-md transition cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setAssignTaskTarget(task)}
                          title="Asignar motorizado"
                          className="p-1.5 text-foreground-muted hover:text-sky-500 hover:bg-sky-500/10 rounded-md transition cursor-pointer"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setStatusTaskTarget(task)}
                          title="Cambiar estado"
                          className="p-1.5 text-foreground-muted hover:text-purple-500 hover:bg-purple-500/10 rounded-md transition cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleEdit(task)}
                          title="Editar"
                          className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-muted rounded-md transition cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(task.id, task.code)}
                          title="Eliminar"
                          className="p-1.5 text-foreground-muted hover:text-destructive hover:bg-destructive/10 rounded-md transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border">
            <span className="text-xs text-foreground-muted">
              Página <span className="font-semibold text-foreground">{filters.page}</span> de{' '}
              <span className="font-semibold text-foreground">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={filters.page === 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                className="p-1.5 rounded-lg border border-border text-foreground-muted hover:text-foreground disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={filters.page === totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                className="p-1.5 rounded-lg border border-border text-foreground-muted hover:text-foreground disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        taskToEdit={taskToEdit}
        branchId={filters.branch_id || defaultBranchId}
      />

      <AssignCourierModal
        isOpen={!!assignTaskTarget}
        onClose={() => setAssignTaskTarget(null)}
        task={assignTaskTarget}
      />

      <TaskStatusModal
        isOpen={!!statusTaskTarget}
        onClose={() => setStatusTaskTarget(null)}
        task={statusTaskTarget}
      />
    </div>
  )
}
