import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Eye,
  UserPlus,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Navigation,
  CheckCircle2,
  FileImage,
  ListFilter,
  DollarSign,
  PackageCheck,
  Check,
  X,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useCouriers } from '@/modules/tasks/hooks/useCouriers'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import type { TaskFilters as FilterType, TaskWithCourier } from '@/modules/tasks/types/task.types'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { TaskPriorityBadge } from '@/modules/tasks/components/TaskPriorityBadge'
import { TaskTypeBadge } from '@/modules/tasks/components/TaskTypeBadge'
import { TaskFilters } from '@/modules/tasks/components/TaskFilters'
import { TaskFormModal } from '@/modules/tasks/components/TaskFormModal'
import { AssignCourierModal } from '@/modules/tasks/components/AssignCourierModal'
import { TaskStatusModal } from '@/modules/tasks/components/TaskStatusModal'
import { RejectTaskModal } from '@/modules/tasks/components/RejectTaskModal'
import {
  Card,
  MetricCard,
  Button,
  Avatar,
  TableSkeleton,
  EmptyState,
  ConfirmDialog,
  Badge,
  useToast,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'

export default function TasksPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data: branches = [] } = useBranches()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || (branches[0]?.id ?? '')
  const todayStr = getLocalDateString()

  const [filters, setFilters] = useState<FilterType>({
    branch_id: defaultBranchId,
    date: todayStr,
    page: 1,
    page_size: 15,
  })

  // Sincronizar automáticamente la sucursal activa cuando carguen las sucursales
  useEffect(() => {
    if (!filters.branch_id && branches.length > 0) {
      const fallbackId = profile?.primary_branch_id || profile?.branch_ids[0] || branches[0].id
      setFilters((prev) => ({ ...prev, branch_id: fallbackId }))
    }
  }, [branches, filters.branch_id, profile])

  // State para modales
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<TaskWithCourier | null>(null)
  const [assignTaskTarget, setAssignTaskTarget] = useState<TaskWithCourier | null>(null)
  const [statusTaskTarget, setStatusTaskTarget] = useState<TaskWithCourier | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; code: string } | null>(null)
  const [rejectTaskTarget, setRejectTaskTarget] = useState<TaskWithCourier | null>(null)
  const [previewEvidenceUrl, setPreviewEvidenceUrl] = useState<string | null>(null)

  const toast = useToast()
  const effectiveBranchId = filters.branch_id || defaultBranchId || (branches[0]?.id ?? '')
  const { data, isLoading, isError, error } = useTasks(filters)
  const { data: couriers = [] } = useCouriers(effectiveBranchId)
  const { deleteTask, isDeleting, approveTask, isApproving, rejectTask, isRejecting } = useTaskMutations()

  const tasks = data?.data || []
  const totalPages = data?.total_pages || 1
  const totalCount = data?.count || 0

  // Métricas rápidas
  const enRouteCount = tasks.filter((t) => t.status === 'en_route').length
  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const pendingApprovalCount = tasks.filter((t) => t.approval_status === 'pending').length

  const handleCreateNew = () => {
    setTaskToEdit(null)
    setIsFormOpen(true)
  }

  const handleEdit = (task: TaskWithCourier) => {
    setTaskToEdit(task)
    setIsFormOpen(true)
  }

  const handleApprove = async (task: TaskWithCourier) => {
    try {
      await approveTask({ taskId: task.id })
      toast.success('Gestión aprobada', `La tarea ${task.code} fue aprobada e incorporada a la ruta del motorizado.`)
    } catch (err: unknown) {
      console.error('Error al aprobar tarea:', err)
      toast.error('Error al aprobar', (err as Error)?.message || 'No fue posible aprobar la gestión.')
    }
  }

  const handleConfirmReject = async (reason: string) => {
    if (!rejectTaskTarget) return
    try {
      await rejectTask({ taskId: rejectTaskTarget.id, reason })
      toast.success('Gestión rechazada', `La tarea ${rejectTaskTarget.code} fue rechazada con motivo.`)
      setRejectTaskTarget(null)
    } catch (err: unknown) {
      console.error('Error al rechazar tarea:', err)
      toast.error('Error al rechazar', (err as Error)?.message || 'No fue posible rechazar la gestión.')
    }
  }

  const confirmDelete = async () => {
    if (!taskToDelete) return
    try {
      await deleteTask(taskToDelete.id)
      toast.success('La tarea se eliminó correctamente.')
      setTaskToDelete(null)
    } catch (err: unknown) {
      console.error('Error al eliminar tarea:', err)
      toast.error(
        'Error al eliminar tarea',
        (err as Error)?.message || 'No fue posible eliminar la tarea. Intenta nuevamente.'
      )
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header y Acción Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Tareas</h1>
          <p className="text-xs text-slate-500">
            Administra, asigna y aprueba operaciones de la sucursal en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Sucursal Activa */}
          {branches.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <Building2 className="h-4 w-4 text-accent shrink-0" />
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">Sucursal:</span>
              <select
                value={filters.branch_id || ''}
                onChange={(e) => setFilters((f) => ({ ...f, branch_id: e.target.value, page: 1 }))}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
                aria-label="Seleccionar sucursal activa"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            onClick={handleCreateNew}
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            className="shrink-0 font-semibold shadow-md"
          >
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Banner Alerta de Aprobaciones Pendientes */}
      {pendingApprovalCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-down shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-extrabold shrink-0 shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-amber-900">
                Tienes {pendingApprovalCount} gestión{pendingApprovalCount > 1 ? 'es' : ''} pendiente{pendingApprovalCount > 1 ? 's' : ''} de aprobación
              </h3>
              <p className="text-2xs text-amber-700 font-medium">
                Registradas por motorizados durante su jornada. Requieren tu autorización para ingresar a la ruta activa.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="warning"
            onClick={() => setFilters((f) => ({ ...f, approval_status: 'pending', page: 1 }))}
            className="shrink-0 text-xs font-bold font-mono shadow-2xs"
          >
            Ver Pendientes ({pendingApprovalCount})
          </Button>
        </div>
      )}

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Visibles"
          value={totalCount}
          subtitle="Coincidentes con filtros"
          icon={<ListFilter className="h-4 w-4 text-accent" />}
          accentColor="accent"
        />

        <MetricCard
          title="Pendientes Aprobación"
          value={pendingApprovalCount}
          subtitle="Creadas por motorizados"
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          accentColor="warning"
        />

        <MetricCard
          title="En Ruta"
          value={enRouteCount}
          subtitle="En proceso por motorizado"
          icon={<Navigation className="h-4 w-4 text-sky-600" />}
          accentColor="primary"
        />

        <MetricCard
          title="Completadas"
          value={completedCount}
          subtitle="Finalizadas exitosamente"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          accentColor="success"
        />
      </div>

      {/* Componente de Filtros */}
      <TaskFilters
        filters={filters}
        onFilterChange={setFilters}
        couriers={couriers}
        branches={branches}
      />

      {/* Tabla de Tareas */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton columns={7} rows={6} />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-xs text-rose-600 font-semibold bg-rose-50 border-t border-b border-rose-200">
            Error al cargar tareas: {(error as Error).message}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No se encontraron tareas"
            description="No hay tareas registradas que coincidan con los criterios de búsqueda o fecha seleccionados."
            icon={<PackageCheck className="h-8 w-8 text-slate-400" />}
            action={
              <Button variant="primary" size="sm" onClick={handleCreateNew} leftIcon={<Plus className="h-4 w-4" />}>
                Crear Tarea
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-2xs">
                  <th className="py-3.5 px-4">Código / Título</th>
                  <th className="py-3.5 px-3">Tipo & Origen</th>
                  <th className="py-3.5 px-3">Contacto / Cliente</th>
                  <th className="py-3.5 px-3">Motorizado</th>
                  <th className="py-3.5 px-3 text-center">Aprobación / Finanzas</th>
                  <th className="py-3.5 px-3">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Código / Título */}
                    <td className="py-3 px-4 max-w-[220px]">
                      <div
                        onClick={() => navigate(`/admin/tareas/${task.id}`)}
                        className="cursor-pointer group/title"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-2xs font-bold text-accent group-hover/title:underline">
                            {task.code}
                          </span>
                          {task.evidence_url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPreviewEvidenceUrl(task.evidence_url!)
                              }}
                              className="text-2xs text-[#004594] bg-blue-50 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                              title="Ver evidencia"
                            >
                              <FileImage className="h-3 w-3" /> Foto
                            </button>
                          )}
                        </div>
                        <div className="font-semibold text-slate-900 truncate group-hover/title:text-accent transition-colors" title={task.title}>
                          {task.title}
                        </div>
                      </div>
                      <div className="text-2xs text-slate-400 pt-0.5 font-medium">
                        {task.scheduled_date} {task.scheduled_start_time ? `• ${task.scheduled_start_time}` : ''}
                      </div>
                    </td>

                    {/* Tipo & Origen */}
                    <td className="py-3 px-3 space-y-1">
                      <TaskTypeBadge type={task.task_type} />
                      <div>
                        {task.creation_origin === 'courier_created' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                            📱 Por Motorizado
                          </span>
                        ) : (
                          <TaskPriorityBadge priority={task.priority} />
                        )}
                      </div>
                    </td>

                    {/* Contacto / Cliente */}
                    <td className="py-3 px-3 max-w-[180px]">
                      <div className="font-semibold text-slate-900 truncate">
                        {task.contact_name || task.company_name || 'Sin contacto'}
                      </div>
                      {task.phone && (
                        <div className="text-2xs text-slate-400 font-mono">{task.phone}</div>
                      )}
                    </td>

                    {/* Motorizado */}
                    <td className="py-3 px-3">
                      {task.courier ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.courier.full_name} size="sm" />
                          <span className="font-semibold text-slate-800 truncate text-xs">
                            {task.courier.display_name || task.courier.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xs text-slate-400 italic">Sin asignar</span>
                      )}
                    </td>

                    {/* Aprobación / Finanzas */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {/* Estado de Aprobación */}
                        {task.approval_status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                            ⏳ Pendiente Aprobación
                          </span>
                        ) : task.approval_status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-extrabold px-2 py-0.5 rounded-full" title={task.rejection_reason || ''}>
                            ❌ Rechazada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                            ✅ Aprobada
                          </span>
                        )}

                        {/* Montos */}
                        {task.requires_collection && (
                          <Badge variant="completed" size="sm">
                            <DollarSign className="h-3 w-3 inline mr-0.5" />
                            Cobrar C${task.expected_collection_amount ?? 0}
                          </Badge>
                        )}
                        {task.requires_payment && (
                          <Badge variant="pending" size="sm">
                            Pagar C${task.expected_payment_amount ?? 0}
                          </Badge>
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
                        {/* Si está pendiente de aprobación: botones destacados Aprobar / Rechazar */}
                        {task.approval_status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(task)}
                              disabled={isApproving}
                              className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-extrabold rounded-xl shadow-2xs flex items-center gap-1 transition cursor-pointer"
                              title="Aprobar e incorporar a ruta"
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              <span>Aprobar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRejectTaskTarget(task)}
                              disabled={isRejecting}
                              className="h-8 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-2xs font-extrabold rounded-xl shadow-2xs flex items-center gap-1 transition cursor-pointer"
                              title="Rechazar gestión"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={3} />
                              <span>Rechazar</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate(`/admin/tareas/${task.id}`)}
                              className="h-8 w-8 text-slate-500 hover:text-accent hover:bg-slate-100"
                              title="Ver detalle"
                              aria-label="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setAssignTaskTarget(task)}
                              className="h-8 w-8 text-slate-500 hover:text-sky-600 hover:bg-sky-50"
                              title="Asignar motorizado"
                              aria-label="Asignar motorizado"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(task)}
                          className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Editar tarea"
                          aria-label="Editar tarea"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setTaskToDelete({ id: task.id, code: task.code })}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Eliminar tarea"
                          aria-label="Eliminar tarea"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">
              Página <span className="font-bold text-slate-900">{filters.page}</span> de{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modales Reutilizables */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setTaskToEdit(null)
        }}
        taskToEdit={taskToEdit}
        branchId={effectiveBranchId}
        branches={branches}
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

      <RejectTaskModal
        isOpen={!!rejectTaskTarget}
        onClose={() => setRejectTaskTarget(null)}
        task={rejectTaskTarget}
        onConfirm={handleConfirmReject}
        isLoading={isRejecting}
      />

      {/* Modal de Previsualización de Evidencia */}
      <Modal isOpen={!!previewEvidenceUrl} onClose={() => setPreviewEvidenceUrl(null)}>
        <ModalContent size="md">
          <ModalHeader onClose={() => setPreviewEvidenceUrl(null)}>
            <ModalTitle>Evidencia de Gestión</ModalTitle>
          </ModalHeader>
          <ModalBody className="p-4 flex items-center justify-center">
            {previewEvidenceUrl && (
              <img src={previewEvidenceUrl} alt="Comprobante / Evidencia" className="max-h-[75vh] w-auto rounded-2xl shadow-lg border" />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        onClose={() => {
          if (!isDeleting) setTaskToDelete(null)
        }}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Eliminar Tarea"
        description={`¿Estás seguro de que deseas eliminar la tarea ${taskToDelete?.code}? Esta acción no se puede deshacer.`}
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar Definitivamente'}
      />
    </div>
  )
}
