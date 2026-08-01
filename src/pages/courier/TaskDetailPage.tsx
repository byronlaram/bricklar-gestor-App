import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Phone,
  MessageCircle,
  MapPin,
  Navigation,
  CheckCircle2,
  Play,
  AlertCircle,
} from 'lucide-react'
import { useTask } from '@/modules/tasks/hooks/useTask'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { TaskPriorityBadge } from '@/modules/tasks/components/TaskPriorityBadge'
import { TaskTypeBadge } from '@/modules/tasks/components/TaskTypeBadge'
import { CompleteTaskModal } from '@/modules/courier/components/CompleteTaskModal'

export default function CourierTaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { task, isLoading, isError } = useTask(id)
  const { changeStatus, isChangingStatus } = useTaskMutations()

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-foreground-muted">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-xs">Cargando datos de la entrega...</p>
      </div>
    )
  }

  if (isError || !task) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-base font-bold text-foreground">No se encontró la tarea</h2>
        <button
          onClick={() => navigate('/motorizado/tareas')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-foreground border border-border rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Mis Tareas
        </button>
      </div>
    )
  }

  const handleStartRoute = async () => {
    try {
      await changeStatus({ task_id: task.id, new_status: 'en_route', notes: 'Inició ruta' })
    } catch (err) {
      console.error(err)
    }
  }

  const handleStartManagement = async () => {
    try {
      await changeStatus({ task_id: task.id, new_status: 'in_progress', notes: 'Llegó a gestión' })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-4 space-y-5 animate-fade-in pb-28">
      {/* Botón Volver */}
      <button
        onClick={() => navigate('/motorizado/tareas')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground-muted hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a mis tareas
      </button>

      {/* Header Móvil */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-accent px-2.5 py-0.5 rounded bg-accent/10 border border-accent/20">
            {task.code}
          </span>
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
          <TaskTypeBadge type={task.task_type} />
        </div>

        <h1 className="text-lg font-bold text-foreground">{task.title}</h1>
      </div>

      {/* Botones de Acción Directa Móvil (Llamar, WhatsApp, Mapa) */}
      <div className="grid grid-cols-3 gap-2">
        {task.phone ? (
          <a
            href={`tel:${task.phone}`}
            className="flex flex-col items-center justify-center p-3 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded-2xl text-center transition cursor-pointer active:scale-95"
          >
            <Phone className="h-5 w-5 mb-1" />
            <span className="text-[11px] font-bold">Llamar</span>
          </a>
        ) : (
          <div className="flex flex-col items-center justify-center p-3 bg-muted/40 text-foreground-muted rounded-2xl text-center opacity-50">
            <Phone className="h-5 w-5 mb-1" />
            <span className="text-[11px]">Sin Teléfono</span>
          </div>
        )}

        {task.whatsapp ? (
          <a
            href={`https://wa.me/${task.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl text-center transition cursor-pointer active:scale-95"
          >
            <MessageCircle className="h-5 w-5 mb-1" />
            <span className="text-[11px] font-bold">WhatsApp</span>
          </a>
        ) : (
          <div className="flex flex-col items-center justify-center p-3 bg-muted/40 text-foreground-muted rounded-2xl text-center opacity-50">
            <MessageCircle className="h-5 w-5 mb-1" />
            <span className="text-[11px]">Sin WhatsApp</span>
          </div>
        )}

        {task.maps_url ? (
          <a
            href={task.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-2xl text-center transition cursor-pointer active:scale-95"
          >
            <Navigation className="h-5 w-5 mb-1" />
            <span className="text-[11px] font-bold">Waze / Maps</span>
          </a>
        ) : (
          <div className="flex flex-col items-center justify-center p-3 bg-muted/40 text-foreground-muted rounded-2xl text-center opacity-50">
            <Navigation className="h-5 w-5 mb-1" />
            <span className="text-[11px]">Sin Mapa</span>
          </div>
        )}
      </div>

      {/* Detalles de la Entrega */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">
          Ubicación e Instrucciones
        </h2>

        <div>
          <span className="text-[11px] text-foreground-muted block">Contacto</span>
          <span className="text-sm font-semibold text-foreground">
            {task.contact_name || 'Sin nombre especificado'}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-foreground-muted block">Dirección</span>
          <p className="text-xs font-medium text-foreground flex items-start gap-1.5 pt-0.5">
            <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <span>{task.address || 'Sin dirección'}</span>
          </p>
          {task.address_reference && (
            <p className="text-xs text-foreground-muted italic pt-1 pl-5">
              Ref: {task.address_reference}
            </p>
          )}
        </div>

        <div>
          <span className="text-[11px] text-foreground-muted block mb-1">Descripción / Instrucciones</span>
          <p className="text-xs text-foreground-subtle bg-muted/30 p-3 rounded-xl border border-border/40 whitespace-pre-wrap">
            {task.description}
          </p>
        </div>
      </div>

      {/* Aspectos Financieros */}
      {task.requires_collection && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
            Cobro Requerido al Entregar
          </span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {task.expected_collection_currency === 'USD' ? 'US$' : 'C$'}
            {task.expected_collection_amount?.toFixed(2)}
          </p>
        </div>
      )}

      {/* Barra Fija Inferior de Acción Móvil */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-card/95 backdrop-blur-md border-t border-border z-20 shadow-lg">
        {task.status === 'assigned' && (
          <button
            onClick={handleStartRoute}
            disabled={isChangingStatus}
            className="w-full py-3.5 px-4 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isChangingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Navigation className="h-4 w-4" />
                Iniciar Ruta a este Destino
              </>
            )}
          </button>
        )}

        {task.status === 'en_route' && (
          <button
            onClick={handleStartManagement}
            disabled={isChangingStatus}
            className="w-full py-3.5 px-4 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isChangingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4" />
                Llegué al Lugar (En Gestión)
              </>
            )}
          </button>
        )}

        {task.status === 'in_progress' && (
          <button
            onClick={() => setIsCompleteModalOpen(true)}
            className="w-full py-3.5 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Finalizar Gestión / Registrar Resultado
          </button>
        )}

        {(task.status === 'completed' || task.status === 'not_completed') && (
          <div className="p-3 text-center text-xs font-semibold text-foreground-muted bg-muted rounded-xl">
            Esta tarea ya fue finalizada ({task.status === 'completed' ? 'Completada' : 'No Completada'}).
          </div>
        )}
      </div>

      {/* Modal de Finalización */}
      <CompleteTaskModal
        task={task}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
      />
    </div>
  )
}
