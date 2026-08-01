import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
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

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { task, isLoading, isError, error, history, assignments } = useTask(id)
  const { deleteTask } = useTaskMutations()

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-foreground-muted">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-xs">Cargando detalle de la tarea...</p>
      </div>
    )
  }

  if (isError || !task) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-foreground">No se encontró la tarea</h2>
        <p className="text-xs text-foreground-muted">
          {(error as Error)?.message || 'La tarea requerida no existe o fue eliminada.'}
        </p>
        <button
          onClick={() => navigate('/admin/tareas')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-foreground border border-border rounded-lg hover:bg-muted transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Tareas
        </button>
      </div>
    )
  }

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de eliminar la tarea ${task.code}?`)) {
      try {
        await deleteTask(task.id)
        navigate('/admin/tareas')
      } catch (err) {
        console.error('Error al eliminar tarea:', err)
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Botón Volver */}
      <button
        onClick={() => navigate('/admin/tareas')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground-muted hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a la lista de tareas
      </button>

      {/* Encabezado Principal */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-accent px-2.5 py-0.5 rounded bg-accent/10 border border-accent/20">
              {task.code}
            </span>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
            <TaskTypeBadge type={task.task_type} />
          </div>
          <h1 className="text-xl font-bold text-foreground">{task.title}</h1>
          <p className="text-xs text-foreground-muted max-w-2xl">{task.description}</p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-border/50">
          <button
            onClick={() => setIsAssignOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-xl transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Asignar Motorizado
          </button>

          <button
            onClick={() => setIsStatusOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Cambiar Estado
          </button>

          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border rounded-xl transition cursor-pointer"
          >
            <Edit3 className="h-4 w-4" />
            Editar
          </button>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 p-2 text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-xl transition cursor-pointer"
            title="Eliminar Tarea"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid Principal de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Información Detallada (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contacto y Dirección */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
              <User className="h-4 w-4 text-accent" />
              Contacto y Dirección de Entrega / Gestión
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-foreground-muted block">Contacto / Cliente</span>
                <span className="text-sm font-medium text-foreground">
                  {task.contact_name || 'No especificado'}
                </span>
                {task.company_name && (
                  <span className="text-xs text-foreground-muted block flex items-center gap-1 pt-0.5">
                    <Building className="h-3 w-3" />
                    {task.company_name}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-foreground-muted block">Teléfonos</span>
                <div className="flex flex-wrap items-center gap-3 pt-0.5">
                  {task.phone ? (
                    <a
                      href={`tel:${task.phone}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {task.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-foreground-muted">Sin teléfono</span>
                  )}

                  {task.whatsapp && (
                    <a
                      href={`https://wa.me/${task.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40">
              <span className="text-[11px] text-foreground-muted block mb-1">Dirección</span>
              <p className="text-xs font-medium text-foreground">
                {task.address || 'Sin dirección registrada'}
              </p>
              {task.address_reference && (
                <p className="text-xs text-foreground-muted italic pt-0.5">
                  Ref: {task.address_reference}
                </p>
              )}

              {task.maps_url && (
                <div className="pt-2">
                  <a
                    href={task.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg transition"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Abrir en Google Maps / Waze
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Aspectos Financieros */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Detalles Financieros Previstos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cobro */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block">
                  Cobro al Cliente
                </span>
                {task.requires_collection ? (
                  <div>
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      {task.expected_collection_currency === 'USD' ? 'US$' : 'C$'}
                      {task.expected_collection_amount?.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block pt-0.5">
                      Método: {task.expected_payment_method || 'Efectivo'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-foreground-muted block">No requiere cobro</span>
                )}
              </div>

              {/* Pago / Viático */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block">
                  Pago / Viático Previsto
                </span>
                {task.requires_payment ? (
                  <div>
                    <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {task.expected_payment_currency === 'USD' ? 'US$' : 'C$'}
                      {task.expected_payment_amount?.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-foreground-muted block">No requiere pago</span>
                )}
              </div>
            </div>
          </div>

          {/* Programación y Notas */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
              <Calendar className="h-4 w-4 text-accent" />
              Programación y Notas Adicionales
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] text-foreground-muted block">Fecha Programada</span>
                <span className="text-xs font-medium text-foreground">{task.scheduled_date}</span>
              </div>

              <div>
                <span className="text-[11px] text-foreground-muted block">Hora de Inicio</span>
                <span className="text-xs font-medium text-foreground">
                  {task.scheduled_start_time || 'No especificada'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-foreground-muted block">Hora Límite</span>
                <span className="text-xs font-medium text-foreground">
                  {task.scheduled_deadline || 'No especificada'}
                </span>
              </div>
            </div>

            {task.notes && (
              <div className="pt-2 border-t border-border/40">
                <span className="text-[11px] text-foreground-muted block mb-1">Notas Internas</span>
                <p className="text-xs text-foreground-subtle bg-muted/30 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                  {task.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Motorizado Asignado e Historial (1/3) */}
        <div className="space-y-6">
          {/* Card Motorizado */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Motorizado Asignado</span>
              <button
                onClick={() => setIsAssignOpen(true)}
                className="text-accent hover:underline text-[11px] cursor-pointer"
              >
                Cambiar
              </button>
            </h3>

            {task.courier ? (
              <div className="flex items-center gap-3 p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                <div className="h-10 w-10 rounded-full bg-sky-500/20 text-sky-600 font-bold flex items-center justify-center shrink-0">
                  {task.courier.full_name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {task.courier.display_name || task.courier.full_name}
                  </p>
                  {task.courier.phone && (
                    <p className="text-xs text-foreground-muted">{task.courier.phone}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center bg-muted/30 border border-dashed border-border rounded-xl text-xs text-foreground-muted">
                Sin motorizado asignado aún.
              </div>
            )}
          </div>

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
    </div>
  )
}
