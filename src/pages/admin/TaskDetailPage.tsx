import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  UserPlus,
  RefreshCw,
  Edit3,
  Trash2,
  ExternalLink,
  Phone,
  MessageCircle,
  Building,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  Clock,
  Camera,
  Eye,
  CalendarClock,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Navigation,
  Star,
} from 'lucide-react'
import { useTask } from '@/modules/tasks/hooks/useTask'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import type { CustomerFeedback } from '@/modules/tasks/types/task.types'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { TaskPriorityBadge } from '@/modules/tasks/components/TaskPriorityBadge'
import { TaskTypeBadge } from '@/modules/tasks/components/TaskTypeBadge'
import { getTaskFinancialDetails } from '@/modules/tasks/utils/taskCalculations'
import { TaskHistoryPanel } from '@/modules/tasks/components/TaskHistoryPanel'
import { AssignCourierModal } from '@/modules/tasks/components/AssignCourierModal'
import { TaskStatusModal } from '@/modules/tasks/components/TaskStatusModal'
import { RescheduleTaskModal } from '@/modules/tasks/components/RescheduleTaskModal'
import { TaskFormModal } from '@/modules/tasks/components/TaskFormModal'
import {
  Card,
  CardTitle,
  Button,
  Avatar,
  Divider,
  Skeleton,
  ConfirmDialog,
  ImageViewerModal,
  useToast,
} from '@/shared/components/ui'
import { formatDate } from '@/shared/utils/format'
import { formatGeoDistance, type DeliveryGeoVerification } from '@/shared/utils/geoHelper'

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { task, isLoading, isError, error, history, assignments } = useTask(id)
  const { deleteTask, isDeleting } = useTaskMutations()

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerTitle, setViewerTitle] = useState('')

  const metadata = task?.metadata as {
    reference_photos?: string[]
    delivery_proof_url?: string
    delivery_proof_captured_at?: string
    delivery_verification?: DeliveryGeoVerification
    customer_feedback?: CustomerFeedback
  } | null

  const referencePhotos = Array.isArray(metadata?.reference_photos) ? metadata.reference_photos : []
  const deliveryProofPhoto = task?.evidence_url || metadata?.delivery_proof_url || null
  const geoVerification = metadata?.delivery_verification || null
  const customerFeedback = metadata?.customer_feedback || null

  const openReferenceViewer = (idx: number) => {
    setViewerImages(referencePhotos)
    setViewerIndex(idx)
    setViewerTitle(`Fotos de Referencia - ${task?.code}`)
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
            {geoVerification?.verified && (
              geoVerification.is_within_geofence ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-xs shadow-2xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  Geoverificada ({formatGeoDistance(geoVerification.distance_meters)})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs shadow-2xs">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                  GPS a {formatGeoDistance(geoVerification.distance_meters)}
                </span>
              )
            )}
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
            onClick={() => setIsRescheduleOpen(true)}
            leftIcon={<CalendarClock className="h-4 w-4 text-orange-600" />}
            className="border-orange-200 text-orange-700 hover:bg-orange-50 font-bold"
          >
            Reprogramar Tarea
          </Button>

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

      {/* Banner Informativo de Reprogramación si aplica */}
      {task.status === 'rescheduled' && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-3 text-xs text-orange-950 shadow-2xs">
          <CalendarClock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-sm text-orange-900">Esta tarea fue Reprogramada</p>
            <p className="mt-0.5 text-orange-800">
              {task.notes || 'Se generó una nueva orden para continuar con la entrega en una nueva fecha.'}
            </p>
          </div>
        </div>
      )}

      {task.rescheduled_from_task_id && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3 text-xs text-sky-950 shadow-2xs">
          <CalendarClock className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-sm text-sky-900">Tarea Creada por Reprogramación</p>
            <p className="mt-0.5 text-sky-800">
              Esta gestión proviene de una reprogramación de fecha anterior.
            </p>
          </div>
        </div>
      )}

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
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Contacto / Entidad</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {task.contact_name || task.provider_name || task.institution_name || 'No especificado'}
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
                <p className="text-xs text-slate-500 italic pt-1 font-medium">
                  Ref: {task.address_reference}
                </p>
              )}

              {task.maps_url && (
                <div className="pt-2">
                  <a
                    href={task.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir ubicación en Google Maps / Waze
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* 📸 Fotos e Imágenes de Referencia */}
          {referencePhotos.length > 0 && (
            <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-accent" />
                  Fotos de Referencia del Producto / Documentos
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-accent border border-sky-200">
                  {referencePhotos.length} {referencePhotos.length === 1 ? 'Foto adjunta' : 'Fotos adjuntas'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {referencePhotos.map((photoUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openReferenceViewer(idx)}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-2xs hover:shadow-md transition-all group bg-slate-50 cursor-pointer"
                  >
                    <img
                      src={photoUrl}
                      alt={`Referencia ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="h-5 w-5 drop-shadow" />
                    </div>
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-bold text-white">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* 📸 Comprobante de Entrega Digital / POD */}
          {deliveryProofPhoto && (
            <Card className="p-6 bg-emerald-50/70 border border-emerald-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Comprobante de Entrega Digital (Prueba de Entrega POD)
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Respaldo Digital
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    Esta fotografía fue capturada por el repartidor como constancia de recepción o gestión en el punto de destino.
                  </p>
                  {metadata?.delivery_proof_captured_at && (
                    <p className="text-2xs font-mono text-emerald-800">
                      Capturado: {new Date(metadata.delivery_proof_captured_at).toLocaleString()}
                    </p>
                  )}
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openProofViewer(deliveryProofPhoto)}
                      leftIcon={<Eye className="h-4 w-4 text-emerald-700" />}
                      className="bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                    >
                      Ver Fotografía Completa
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openProofViewer(deliveryProofPhoto)}
                  className="relative aspect-video rounded-xl overflow-hidden border border-emerald-300 shadow-sm hover:shadow-md transition-all group bg-slate-900 cursor-pointer block"
                >
                  <img
                    src={deliveryProofPhoto}
                    alt="Comprobante de entrega"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs">
                    <Eye className="h-4 w-4 drop-shadow" />
                    <span>Ampliar</span>
                  </div>
                </button>
              </div>
            </Card>
          )}

          {/* 🛡️ Auditoría de Geoverificación Satelital Antifraude (Admin) */}
          {geoVerification?.verified && (
            <Card className={`p-6 rounded-2xl shadow-2xs space-y-4 border ${
              geoVerification.is_within_geofence
                ? 'bg-emerald-50/70 border-emerald-200/90'
                : 'bg-amber-50/70 border-amber-200/90'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-xl text-white shadow-2xs ${
                    geoVerification.is_within_geofence ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}>
                    {geoVerification.is_within_geofence ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <ShieldAlert className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {geoVerification.is_within_geofence
                        ? 'Auditoría Antifraude: Entrega Geoverificada en Sitio ✓'
                        : 'Auditoría Antifraude: Registro GPS Fuera de Radio'}
                    </h2>
                    <p className="text-xs text-slate-600">
                      Coordenadas capturadas satelitalmente al momento de finalizar la tarea.
                    </p>
                  </div>
                </div>

                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                  geoVerification.is_within_geofence
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {geoVerification.is_within_geofence ? 'Geocerca Válida' : 'Alerta Geocerca'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                    Distancia al Destino
                  </span>
                  <p className="text-base font-mono font-black text-slate-900 mt-0.5">
                    {formatGeoDistance(geoVerification.distance_meters)}
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                    GPS Repartidor
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-800 mt-0.5 truncate">
                    {geoVerification.courier_lat?.toFixed(5)}, {geoVerification.courier_lng?.toFixed(5)}
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                    Hora de Captura
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                    {geoVerification.captured_at
                      ? new Date(geoVerification.captured_at).toLocaleTimeString()
                      : 'No registrada'}
                  </p>
                </div>
              </div>

              {geoVerification.courier_lat && geoVerification.courier_lng && (
                <div className="pt-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${geoVerification.courier_lat},${geoVerification.courier_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs"
                  >
                    <Navigation className="h-3.5 w-3.5 text-indigo-600" />
                    Ver ubicación exacta de la entrega en Google Maps
                  </a>
                </div>
              )}
            </Card>
          )}

          {/* Aspectos Financieros */}
          {(() => {
            const fin = getTaskFinancialDetails(task)
            return (
              <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  {task.status === 'completed' ? 'Detalles Financieros Ejecutados' : 'Detalles Financieros Previstos'}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cobro */}
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">
                        {task.status === 'completed' ? 'Cobro Ejecutado' : 'Cobro Previsto al Cliente'}
                      </span>
                      {fin.isActualCollection && (
                        <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Confirmado en Entrega
                        </span>
                      )}
                    </div>
                    {fin.requiresCollection ? (
                      <div>
                        <span className="text-2xl font-black text-emerald-800 font-mono block">
                          {fin.currencySymbol}
                          {fin.displayCollectionAmount.toFixed(2)}
                        </span>
                        {fin.isActualCollection && fin.collectionDiscrepancy !== 0 && (
                          <span className="text-2xs font-bold text-slate-500 block pt-0.5">
                            Monto previsto inicial: {fin.currencySymbol}{fin.expectedCollectionAmount.toFixed(2)} ({fin.collectionDiscrepancy > 0 ? `+${fin.currencySymbol}${fin.collectionDiscrepancy.toFixed(2)}` : `-${fin.currencySymbol}${Math.abs(fin.collectionDiscrepancy).toFixed(2)}`})
                          </span>
                        )}
                        {fin.collectionDiscrepancyReason && (
                          <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5 font-medium">
                            <strong>Motivo ajuste:</strong> {fin.collectionDiscrepancyReason}
                          </p>
                        )}
                        <span className="text-2xs font-semibold text-emerald-600 block pt-1">
                          Método: {task.expected_payment_method || 'Efectivo'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 block">No requiere cobro</span>
                    )}
                  </div>

                  {/* Pago / Compra */}
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800">
                        {task.status === 'completed' ? 'Pago / Compra Ejecutado' : 'Pago / Viático Previsto'}
                      </span>
                      {fin.isActualPaid && (
                        <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          Pagado en Gestión
                        </span>
                      )}
                    </div>
                    {fin.requiresPayment ? (
                      <div>
                        <span className="text-2xl font-black text-amber-900 font-mono block">
                          {fin.currencySymbol}
                          {fin.displayPaymentAmount.toFixed(2)}
                        </span>
                        {fin.isActualPaid && fin.paymentDiscrepancy !== 0 && (
                          <span className="text-2xs font-bold text-slate-500 block pt-0.5">
                            Monto previsto inicial: {fin.currencySymbol}{fin.expectedPaymentAmount.toFixed(2)} ({fin.paymentDiscrepancy > 0 ? `+${fin.currencySymbol}${fin.paymentDiscrepancy.toFixed(2)}` : `-${fin.currencySymbol}${Math.abs(fin.paymentDiscrepancy).toFixed(2)}`})
                          </span>
                        )}
                        {fin.invoiceNumber && (
                          <span className="text-2xs font-mono font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                            Factura/Recibo: {fin.invoiceNumber}
                          </span>
                        )}
                        {fin.paymentDiscrepancyReason && (
                          <p className="text-xs text-amber-900 bg-amber-100/70 p-2 rounded-lg border border-amber-200 mt-1.5 font-medium">
                            <strong>Motivo diferencia:</strong> {fin.paymentDiscrepancyReason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 block">No requiere pago</span>
                    )}
                  </div>
                </div>
              </Card>
            )
          })()}

          {/* Programación y Notas */}
          <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="h-4 w-4 text-accent" />
              Programación y Notas Adicionales
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">Fecha Programada</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">{formatDate(task.scheduled_date)}</span>
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

          {/* Card Calificación del Cliente */}
          {customerFeedback && (
            <Card className="p-5 bg-white border-amber-200/80 shadow-2xs space-y-3.5 bg-gradient-to-br from-amber-50/40 to-white">
              <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">
                    Calificación del Cliente
                  </h3>
                </div>
                <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                  {customerFeedback.rating} / 5 ⭐
                </span>
              </div>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${
                      s <= customerFeedback.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>

              {customerFeedback.tags && customerFeedback.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customerFeedback.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-white text-slate-800 border border-amber-200 shadow-2xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {customerFeedback.comment && (
                <p className="text-xs text-slate-700 bg-white/90 p-3 rounded-xl border border-amber-200/70 italic leading-relaxed">
                  "{customerFeedback.comment}"
                </p>
              )}

              <span className="text-3xs text-slate-400 block pt-1">
                Registrado el {formatDate(customerFeedback.submitted_at)}
              </span>
            </Card>
          )}

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

      <RescheduleTaskModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        task={task}
        onSuccess={(newTaskId) => {
          navigate(`/admin/tareas/${newTaskId}`)
        }}
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

      {/* Visor de Fotos en Pantalla Completa */}
      <ImageViewerModal
        images={viewerImages}
        initialIndex={viewerIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        title={viewerTitle || `Fotos - ${task.code}`}
      />
    </div>
  )
}
