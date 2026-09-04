import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  Navigation,
  CheckCircle2,
  Play,
  AlertCircle,
  User,
  Clock,
  Camera,
  Eye,
  Undo2,
  RotateCcw,
} from 'lucide-react'
import { useTask } from '@/modules/tasks/hooks/useTask'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { TaskPriorityBadge } from '@/modules/tasks/components/TaskPriorityBadge'
import { TaskTypeBadge } from '@/modules/tasks/components/TaskTypeBadge'
import { CompleteTaskModal } from '@/modules/courier/components/CompleteTaskModal'
import { StartWorkdayModal } from '@/modules/courier/components/StartWorkdayModal'
import {
  Card,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  ImageViewerModal,
  useToast,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'

export default function CourierTaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const toast = useToast()
  const todayStr = getLocalDateString()

  const { data: activeWorkday } = useActiveWorkday(profile?.id)
  const { task, isLoading, isError } = useTask(id)
  const { data: todayTasksData } = useTasks({
    courier_id: profile?.id,
    date: todayStr,
    page_size: 100,
  })
  const { changeStatus, isChangingStatus } = useTaskMutations()

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [isStartWorkdayOpen, setIsStartWorkdayOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerTitle, setViewerTitle] = useState('')

  const todayTasks = todayTasksData?.data || []

  const metadata = task?.metadata as {
    reference_photos?: string[]
    delivery_proof_url?: string
  } | null

  const referencePhotos = Array.isArray(metadata?.reference_photos) ? metadata.reference_photos : []
  const deliveryProofPhoto = task?.evidence_url || metadata?.delivery_proof_url || null

  const openReferenceViewer = (idx: number) => {
    setViewerImages(referencePhotos)
    setViewerIndex(idx)
    setViewerTitle(`Foto de Referencia - ${task?.code}`)
    setIsViewerOpen(true)
  }

  const openProofViewer = (proofUrl: string) => {
    setViewerImages([proofUrl])
    setViewerIndex(0)
    setViewerTitle(`Comprobante de Entrega - ${task?.code}`)
    setIsViewerOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (isError || !task) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">No se encontró la tarea</h2>
        <Button
          variant="outline"
          onClick={() => navigate('/motorizado/tareas')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Volver a Mis Tareas
        </Button>
      </div>
    )
  }

  const requireActiveWorkday = (actionLabel: string = 'realizar esta acción'): boolean => {
    if (!activeWorkday || activeWorkday.status !== 'open') {
      toast.warning(
        'Jornada requerida',
        `Debes abrir tu jornada de hoy con el kilometraje inicial antes de ${actionLabel}.`
      )
      setIsStartWorkdayOpen(true)
      return false
    }
    return true
  }

  const handleStartRoute = async () => {
    if (!requireActiveWorkday('poner esta tarea en ruta')) return

    // Validar que no haya otra tarea activa
    const currentActiveTask = todayTasks.find(
      (t) => t.id !== task.id && ['en_route', 'in_progress'].includes(t.status)
    )

    if (currentActiveTask) {
      const statusLabel = currentActiveTask.status === 'en_route' ? 'en ruta' : 'en gestión'
      toast.warning(
        'Ya tienes una tarea en curso',
        `La parada ${currentActiveTask.code} (${currentActiveTask.title}) ya está ${statusLabel}. Debes completarla antes de iniciar una nueva ruta.`
      )
      return
    }

    try {
      await changeStatus({ task_id: task.id, new_status: 'en_route', notes: 'Inició ruta' })
      toast.success('Ruta iniciada', `Parada ${task.code} en camino.`)
    } catch (err: unknown) {
      toast.error('Error al iniciar ruta', (err as Error)?.message || 'No se pudo iniciar la ruta.')
    }
  }

  const handleCancelRoute = async () => {
    try {
      await changeStatus({
        task_id: task.id,
        new_status: 'assigned',
        notes: 'Inicio de ruta cancelado / revertido por el motorizado',
      })
      toast.info('Ruta cancelada', `Parada ${task.code} regresó a la lista de asignadas.`)
    } catch (err: unknown) {
      toast.error('Error al cancelar ruta', (err as Error)?.message || 'No se pudo cancelar la ruta.')
    }
  }

  const handleStartManagement = async () => {
    if (!requireActiveWorkday('gestionar esta entrega')) return
    try {
      await changeStatus({ task_id: task.id, new_status: 'in_progress', notes: 'Llegó a gestión' })
      toast.success('Llegaste al lugar', `Tarea ${task.code} ahora en gestión.`)
    } catch (err: unknown) {
      toast.error('Error al actualizar estado', (err as Error)?.message || 'No se pudo actualizar el estado.')
    }
  }

  const handleOpenCompleteModal = () => {
    if (!requireActiveWorkday('finalizar o cobrar esta tarea')) return
    setIsCompleteModalOpen(true)
  }

  const retryCount = (task.metadata as { retry_count?: number } | null)?.retry_count || 0

  return (
    <div className="space-y-5 animate-fade-in pb-28 max-w-2xl mx-auto">
      {/* Botón Volver */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/motorizado/tareas')}
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        className="text-slate-600 hover:text-slate-900 font-medium"
      >
        Volver a mis tareas
      </Button>

      {/* Header Móvil */}
      <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-indigo-700 px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-100">
            {task.code}
          </span>
          <TaskStatusBadge status={task.status} />
          {retryCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs">
              <RotateCcw className="h-3 w-3 text-amber-700" />
              Reintento #{retryCount}
            </span>
          )}
          <TaskPriorityBadge priority={task.priority} />
          <TaskTypeBadge type={task.task_type} />
        </div>

        <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">{task.title}</CardTitle>
      </Card>

      {/* Botones de Acción Directa Móvil (Llamar, WhatsApp, Mapa) */}
      <div className="grid grid-cols-3 gap-2.5">
        {task.phone ? (
          <a
            href={`tel:${task.phone}`}
            className="flex flex-col items-center justify-center p-3.5 bg-indigo-50/80 text-indigo-800 border border-indigo-200/80 rounded-2xl text-center transition cursor-pointer active:scale-95 shadow-2xs font-bold"
          >
            <Phone className="h-5 w-5 mb-1 text-indigo-700" />
            <span className="text-2xs">Llamar</span>
          </a>
        ) : (
          <div className="flex flex-col items-center justify-center p-3.5 bg-slate-100 text-slate-400 rounded-2xl text-center opacity-50">
            <Phone className="h-5 w-5 mb-1" />
            <span className="text-2xs">Sin Teléfono</span>
          </div>
        )}

        {task.whatsapp ? (
          <a
            href={`https://wa.me/${task.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-2xl text-center transition cursor-pointer active:scale-95 shadow-2xs font-bold"
          >
            <MessageCircle className="h-5 w-5 mb-1 text-emerald-600" />
            <span className="text-2xs">WhatsApp</span>
          </a>
        ) : (
          <div className="flex flex-col items-center justify-center p-3.5 bg-slate-100 text-slate-400 rounded-2xl text-center opacity-50">
            <MessageCircle className="h-5 w-5 mb-1" />
            <span className="text-2xs">Sin WhatsApp</span>
          </div>
        )}

        {task.maps_url ? (
          <a
            href={task.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3.5 bg-purple-50 text-purple-800 border border-purple-200/80 rounded-2xl text-center transition cursor-pointer active:scale-95 shadow-2xs font-bold"
          >
            <Navigation className="h-5 w-5 mb-1 text-purple-600" />
            <span className="text-2xs">Waze / Maps</span>
          </a>
        ) : (
          <div className="flex flex-col items-center justify-center p-3.5 bg-slate-100 text-slate-400 rounded-2xl text-center opacity-50">
            <Navigation className="h-5 w-5 mb-1" />
            <span className="text-2xs">Sin Mapa</span>
          </div>
        )}
      </div>

      {/* 📸 Fotos de Referencia del Producto / Paquete a Retirar */}
      {referencePhotos.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-sky-50 to-indigo-50/50 border border-sky-200/80 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-sky-600 text-white shadow-2xs">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Fotos del Producto / Paquete
                </h2>
                <p className="text-[11px] text-sky-800 font-medium">
                  Toca una foto para ampliarla y verificar qué retirar
                </p>
              </div>
            </div>
            <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              {referencePhotos.length} {referencePhotos.length === 1 ? 'Foto' : 'Fotos'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {referencePhotos.map((photoUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => openReferenceViewer(idx)}
                className="relative aspect-4/3 rounded-xl overflow-hidden border border-sky-200/90 shadow-2xs active:scale-95 transition-all group bg-white cursor-pointer"
              >
                <img
                  src={photoUrl}
                  alt={`Producto ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Eye className="h-5 w-5 drop-shadow" />
                </div>
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white">
                  Foto {idx + 1}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 📸 Comprobante de Entrega Digital / POD */}
      {deliveryProofPhoto && (
        <Card className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-600 text-white shadow-2xs">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                  Comprobante de Entrega Digital
                </h2>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Foto de respaldo capturada en la entrega
                </p>
              </div>
            </div>
            <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              POD Registrado
            </span>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => openProofViewer(deliveryProofPhoto)}
              className="relative aspect-video max-h-52 w-full rounded-xl overflow-hidden border border-emerald-300 shadow-2xs active:scale-98 transition-all group bg-slate-900 cursor-pointer block"
            >
              <img
                src={deliveryProofPhoto}
                alt="Comprobante de entrega"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs">
                <Eye className="h-4 w-4 drop-shadow" />
                <span>Toca para ver comprobante completo</span>
              </div>
            </button>
          </div>
        </Card>
      )}

      {/* Detalles de la Entrega */}
      <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
          Ubicación e Instrucciones
        </h2>

        <div>
          <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold block">Contacto</span>
          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
            <User className="h-4 w-4 text-indigo-600" />
            {task.contact_name || task.provider_name || task.institution_name || task.company_name || 'Sin nombre especificado'}
          </span>
        </div>

        <div>
          <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold block">Dirección</span>
          <p className="text-xs font-bold text-slate-900 flex items-start gap-1.5 pt-0.5 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/70">
            <MapPin className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
            <span>{task.address || 'Sin dirección'}</span>
          </p>
          {task.address_reference && (
            <p className="text-xs text-slate-600 italic pt-1.5 pl-5 font-medium">
              Ref: {task.address_reference}
            </p>
          )}
        </div>

        {task.scheduled_start_time && (
          <div>
            <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold block">Hora Programada</span>
            <span className="text-xs font-bold text-slate-900 font-mono flex items-center gap-1.5 mt-0.5">
              <Clock className="h-4 w-4 text-indigo-600" />
              {task.scheduled_start_time}
            </span>
          </div>
        )}

        <div>
          <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Descripción / Instrucciones</span>
          <p className="text-xs text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 whitespace-pre-wrap leading-relaxed font-medium">
            {task.description || 'Sin instrucciones adicionales.'}
          </p>
        </div>
      </Card>

      {/* Aspectos Financieros */}
      {task.requires_collection && (
        <Card className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 block">
            Cobro Requerido al Entregar
          </span>
          <p className="text-3xl font-black text-emerald-900 font-tabular">
            {task.expected_collection_currency === 'USD' ? 'US$' : 'C$'}
            {task.expected_collection_amount?.toFixed(2)}
          </p>
        </Card>
      )}

      {/* Barra Fija Inferior de Acción Móvil */}
      <div className="fixed bottom-16 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-30 shadow-lg">
        <div className="max-w-2xl mx-auto">
          {task.status === 'assigned' && (
            <Button
              size="lg"
              variant="primary"
              onClick={handleStartRoute}
              isLoading={isChangingStatus}
              leftIcon={<Navigation className="h-4 w-4" />}
              className="w-full justify-center text-sm font-bold shadow-xs py-3"
            >
              Iniciar Ruta a este Destino
            </Button>
          )}

          {task.status === 'en_route' && (
            <div className="flex items-center gap-2">
              <Button
                size="lg"
                variant="outline"
                onClick={handleCancelRoute}
                disabled={isChangingStatus}
                leftIcon={<Undo2 className="h-4 w-4" />}
                className="shrink-0 px-3.5 text-xs font-bold text-slate-700 hover:text-slate-900 border-slate-300 py-3 shadow-2xs"
              >
                Deshacer
              </Button>
              <Button
                size="lg"
                variant="primary"
                onClick={handleStartManagement}
                isLoading={isChangingStatus}
                leftIcon={<Play className="h-4 w-4" />}
                className="flex-1 justify-center bg-purple-600 hover:bg-purple-700 text-white border-transparent text-sm font-bold shadow-xs py-3"
              >
                Llegué al Lugar (En Gestión)
              </Button>
            </div>
          )}

          {task.status === 'in_progress' && (
            <Button
              size="lg"
              variant="confirm"
              onClick={handleOpenCompleteModal}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              className="w-full justify-center text-sm font-bold shadow-xs py-3"
            >
              Finalizar / Registrar Resultado / Reintentar
            </Button>
          )}

          {(task.status === 'completed' || task.status === 'not_completed') && (
            <Badge
              variant={task.status === 'completed' ? 'completed' : 'pending'}
              size="md"
              className="w-full justify-center text-xs font-bold py-2.5"
            >
              Esta tarea ya fue finalizada ({task.status === 'completed' ? 'Completada' : 'No Completada'}).
            </Badge>
          )}
        </div>
      </div>

      {/* Modal de Finalización */}
      <CompleteTaskModal
        task={task}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
      />

      {/* Modal de Inicio de Jornada */}
      <StartWorkdayModal
        branchId={branchId}
        isOpen={isStartWorkdayOpen}
        onClose={() => setIsStartWorkdayOpen(false)}
      />

      {/* Visor a Pantalla Completa con Zoom */}
      <ImageViewerModal
        images={viewerImages}
        initialIndex={viewerIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        title={viewerTitle || `Foto - ${task.code}`}
      />
    </div>
  )
}
