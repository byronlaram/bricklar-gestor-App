import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  UserPlus,
  RefreshCw,
  Edit3,
  Trash2,
  MapPin,
  ExternalLink,
  Phone,
  MessageCircle,
  Building,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { useTask } from '@/modules/tasks/hooks/useTask'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { TaskPriorityBadge } from '@/modules/tasks/components/TaskPriorityBadge'
import { TaskTypeBadge } from '@/modules/tasks/components/TaskTypeBadge'
import { TaskHistoryPanel } from '@/modules/tasks/components/TaskHistoryPanel'
import { AssignCourierModal } from '@/modules/tasks/components/AssignCourierModal'
import { TaskStatusModal } from '@/modules/tasks/components/TaskStatusModal'
import { TaskFormModal } from '@/modules/tasks/components/TaskFormModal'
import {
  Card,
  CardTitle,
  Button,
  Avatar,
  Divider,
  Skeleton,
  ConfirmDialog,
  useToast,
} from '@/shared/components/ui'

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { task, isLoading, isError, error, history, assignments } = useTask(id)
  const { deleteTask, isDeleting } = useTaskMutations()

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError || !task) {
    return (
      <Card className="p-12 text-center space-y-4 max-w-lg mx-auto my-12 bg-white border-slate-200 shadow-card">
        <AlertCircle className="h-12 w-12 text-rose-600 mx-auto" />
        <div className="space-y-1">
          <CardTitle className="text-xl">No se encontró la tarea</CardTitle>
          <p className="text-xs text-slate-500">
            {(error as Error)?.message || 'La tarea requerida no existe o fue eliminada previamente.'}
          </p>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => navigate('/admin/tareas')}
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver a la Lista de Tareas
          </Button>
        </div>
      </Card>
    )
  }

  const confirmDelete = async () => {
    if (!task) return
    try {
      await deleteTask(task.id)
      toast.success('La tarea se eliminó correctamente.')
      setIsConfirmDeleteOpen(false)
      navigate('/admin/tareas')
    } catch (err: unknown) {
      console.error('Error al eliminar tarea:', err)
      toast.error(
        'Error al eliminar tarea',
        (err as Error)?.message || 'No fue posible eliminar la tarea. Intenta nuevamente.'
      )
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* Botón Volver */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/tareas')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="text-slate-600 hover:text-slate-900 -ml-2"
        >
          Volver a la lista de tareas
        </Button>
      </div>

      {/* Encabezado Principal */}
      <Card className="p-6 sm:p-8 bg-white border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-accent px-3 py-1 rounded-md bg-sky-50 border border-sky-200">
              {task.code}
            </span>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
            <TaskTypeBadge type={task.task_type} />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {task.title}
          </h1>

          {task.description && (
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAssignOpen(true)}
            leftIcon={<UserPlus className="h-4 w-4 text-sky-600" />}
            className="border-sky-200 text-sky-700 hover:bg-sky-50"
          >
            Asignar Motorizado
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusOpen(true)}
            leftIcon={<RefreshCw className="h-4 w-4 text-purple-600" />}
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            Cambiar Estado
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            leftIcon={<Edit3 className="h-4 w-4 text-slate-600" />}
          >
            Editar
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsConfirmDeleteOpen(true)}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            title="Eliminar Tarea"
            aria-label="Eliminar Tarea"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Grid Principal de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Información Detallada (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contacto y Dirección */}
          <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-4 w-4 text-accent" />
              Contacto y Dirección de Entrega / Gestión
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Contacto / Cliente</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {task.contact_name || 'No especificado'}
                </span>
                {task.company_name && (
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 pt-1 font-medium">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {task.company_name}
                  </span>
                )}
              </div>

              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Teléfonos</span>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {task.phone ? (
                    <a
                      href={`tel:${task.phone}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {task.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sin teléfono</span>
                  )}

                  {task.whatsapp && (
                    <a
                      href={`https://wa.me/${task.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>

            <Divider />

            <div>
              <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Dirección</span>
              <p className="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed">
                {task.address || 'Sin dirección registrada'}
              </p>
              {task.address_reference && (
                <p className="text-xs text-slate-500 italic pt-1">
                  Referencia: {task.address_reference}
                </p>
              )}

              {task.maps_url && (
                <div className="pt-3">
                  <a
                    href={task.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-accent bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Abrir en Google Maps / Waze
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Aspectos Financieros */}
          <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Detalles Financieros Previstos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cobro */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-xs font-bold text-emerald-800 block">
                  Cobro al Cliente
                </span>
                {task.requires_collection ? (
                  <div>
                    <span className="text-xl font-bold text-emerald-700">
                      {task.expected_collection_currency === 'USD' ? 'US$' : 'C$'}
                      {task.expected_collection_amount?.toFixed(2)}
                    </span>
                    <span className="text-2xs font-semibold text-emerald-600 block pt-0.5">
                      Método: {task.expected_payment_method || 'Efectivo'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 block">No requiere cobro</span>
                )}
              </div>

              {/* Pago / Viático */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                <span className="text-xs font-bold text-amber-800 block">
                  Pago / Viático Previsto
                </span>
                {task.requires_payment ? (
                  <div>
                    <span className="text-xl font-bold text-amber-700">
                      {task.expected_payment_currency === 'USD' ? 'US$' : 'C$'}
                      {task.expected_payment_amount?.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 block">No requiere pago</span>
                )}
              </div>
            </div>
          </Card>

          {/* Programación y Notas */}
          <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="h-4 w-4 text-accent" />
              Programación y Notas Adicionales
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Fecha Programada</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">{task.scheduled_date}</span>
              </div>

              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Hora de Inicio</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {task.scheduled_start_time || 'No especificada'}
                </span>
              </div>

              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Hora Límite</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">
                  {task.scheduled_deadline || 'No especificada'}
                </span>
              </div>
            </div>

            {task.notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Notas Internas</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed">
                  {task.notes}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Columna Derecha: Motorizado Asignado e Historial (1/3) */}
        <div className="space-y-6">
          {/* Card Motorizado */}
          <Card className="p-5 bg-white border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Motorizado Asignado
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAssignOpen(true)}
                className="text-accent text-2xs font-semibold h-7 px-2"
              >
                Cambiar
              </Button>
            </div>

            {task.courier ? (
              <div className="flex items-center gap-3 p-3.5 bg-sky-50 rounded-xl border border-sky-200">
                <Avatar name={task.courier.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {task.courier.display_name || task.courier.full_name}
                  </p>
                  {task.courier.phone && (
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{task.courier.phone}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                <p className="text-xs text-slate-500 font-medium">Sin motorizado asignado aún.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignOpen(true)}
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                >
                  Asignar Ahora
                </Button>
              </div>
            )}
          </Card>

          {/* Componente Historial */}
          <TaskHistoryPanel history={history} assignments={assignments} />
        </div>
      </div>

      {/* Modales */}
      <AssignCourierModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        task={task}
      />

      <TaskStatusModal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        task={task}
      />

      <TaskFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        taskToEdit={task}
        branchId={task.branch_id}
      />

      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => {
          if (!isDeleting) setIsConfirmDeleteOpen(false)
        }}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Eliminar Tarea"
        description={`¿Estás seguro de que deseas eliminar la tarea ${task.code}? Esta acción eliminará la orden de los listados activos conservando su registro de auditoría.`}
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar Definitivamente'}
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  )
}
