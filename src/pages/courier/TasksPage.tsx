import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Search,
  Plus,
  Navigation,
  Phone,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  GripVertical,
  MapPin,
  Bike,
  User,
  DollarSign,
  Receipt,
  Clock,
  Camera,
  RotateCcw,
  Undo2,
  Map,
  ListFilter,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import { useCourierLiveLocation } from '@/modules/courier/hooks/useCourierLiveLocation'
import { CourierRouteMap } from '@/modules/courier/components/CourierRouteMap'
import type { TaskWithCourier, Task } from '@/modules/tasks/types/task.types'
import { TaskTypeBadge } from '@/modules/tasks/components/TaskTypeBadge'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { CompleteTaskModal } from '@/modules/courier/components/CompleteTaskModal'
import { NewCourierGestionModal } from '@/modules/courier/components/NewCourierGestionModal'
import { StartWorkdayModal } from '@/modules/courier/components/StartWorkdayModal'
import {
  Button,
  Input,
  Skeleton,
  EmptyState,
  useToast,
  Card,
  ImageViewerModal,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'
import { cn } from '@/shared/utils/cn'

// ─── Utilidad para extraer fotos de una tarea ─────────────────────────────

export function getTaskPhotos(task: Task | TaskWithCourier): string[] {
  const metadata = task?.metadata as { reference_photos?: string[]; photos?: string[] } | null
  if (Array.isArray(metadata?.reference_photos) && metadata.reference_photos.length > 0) {
    return metadata.reference_photos.filter(Boolean)
  }
  if (Array.isArray(metadata?.photos) && metadata.photos.length > 0) {
    return metadata.photos.filter(Boolean)
  }
  if (task?.evidence_url) {
    return [task.evidence_url]
  }
  return []
}

// ─── Componente de Tarjeta de Tarea Ordenable (Drag & Drop + Calle) ─────────

interface TaskCardItemProps {
  task: TaskWithCourier
  index: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onNavigate: (task: TaskWithCourier) => void
  onOpenMap: (task: TaskWithCourier) => void
  onOpenWhatsApp: (phone?: string | null) => void
  onStartRoute: (task: TaskWithCourier) => void
  onCancelRoute: (task: TaskWithCourier) => void
  onStartManagement: (task: TaskWithCourier) => void
  onComplete: (task: TaskWithCourier) => void
  onPreviewPhotos: (photos: string[], title: string) => void
  isChangingStatus: boolean
}

function TaskCardItem({
  task,
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onNavigate,
  onOpenMap,
  onOpenWhatsApp,
  onStartRoute,
  onCancelRoute,
  onStartManagement,
  onComplete,
  onPreviewPhotos,
  isChangingStatus,
}: TaskCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.75 : 1,
  }

  const cardStyles = [
    'bg-[#FAF8FE] border-purple-100/80',
    'bg-[#F5F8FE] border-blue-100/80',
    'bg-[#F3F9F6] border-emerald-100/80',
    'bg-[#FCFAF4] border-amber-100/80',
    'bg-[#FCF5F7] border-rose-100/80',
  ]
  const cardStyle = cardStyles[index % cardStyles.length]
  const photos = getTaskPhotos(task)
  const retryCount = (task.metadata as { retry_count?: number } | null)?.retry_count || 0

  return (
    <div ref={setNodeRef} style={style} className="touch-action-none">
      <div
        className={`${cardStyle} rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-2xs hover:shadow-xs transition-all border ${
          isDragging ? 'ring-2 ring-indigo-600 shadow-xl scale-[1.02] bg-indigo-50/60' : ''
        }`}
      >
        {/* Header: Asa de Arrastre + Parada # + Botones Táctiles Subir/Bajar + Tipo + Badge Fotos + Reintento + Estado */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {/* Control Asa Táctil (Drag Handle) */}
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 cursor-grab active:cursor-grabbing touch-none shrink-0"
              title="Arrastrar para ordenar parada"
              aria-label="Arrastrar para ordenar"
            >
              <GripVertical className="h-5 w-5" />
            </button>

            {/* Número de Parada Ordinal */}
            <span className="flex h-8 px-2.5 items-center justify-center rounded-full bg-indigo-900 text-white font-extrabold text-xs shadow-xs shrink-0 font-mono">
              Parada #{index + 1}
            </span>

            {/* ⬆️⬇️ Selectores Táctiles Grandes y Separados para Subir / Bajar */}
            <div className="flex flex-col gap-1 bg-white/95 p-1 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0">
              <button
                type="button"
                disabled={isFirst}
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveUp()
                }}
                className="h-7 w-7 sm:h-6 sm:w-6 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 text-slate-700 hover:text-indigo-700 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                title="Subir parada de posición"
                aria-label="Subir una posición"
              >
                <ChevronUp className="h-4.5 w-4.5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveDown()
                }}
                className="h-7 w-7 sm:h-6 sm:w-6 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 text-slate-700 hover:text-indigo-700 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                title="Bajar parada de posición"
                aria-label="Bajar una posición"
              >
                <ChevronDown className="h-4.5 w-4.5 stroke-[2.5]" />
              </button>
            </div>

            <TaskTypeBadge type={task.task_type} />

            {/* 🔄 Badge de Reintento si fue pausada previamente */}
            {retryCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs shadow-2xs shrink-0">
                <RotateCcw className="h-3 w-3 text-amber-700" />
                <span>Reintento #{retryCount}</span>
              </span>
            )}

            {/* 📸 Indicador Prominente de Fotos / Imágenes */}
            {photos.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onPreviewPhotos(photos, task.title)
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 font-extrabold text-xs shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                title="Esta tarea tiene fotos. Toca para verlas."
              >
                <Camera className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                <span>{photos.length > 1 ? `${photos.length} Fotos` : 'Tiene Foto'}</span>
              </button>
            )}
          </div>

          <div className="shrink-0">
            <TaskStatusBadge status={task.status} />
          </div>
        </div>

        {/* Título, Contacto/Institución, Dirección y Miniatura de Foto si existe */}
        <div
          onClick={() => onNavigate(task)}
          className="space-y-2 cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-extrabold text-[#0A2540] group-hover:text-[#004594] transition-colors leading-snug">
                  {task.title}
                </h3>
              </div>

              {(task.contact_name || task.institution_name || task.provider_name) && (
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>{task.contact_name || task.institution_name || task.provider_name}</span>
                </p>
              )}

              {task.address && (
                <div className="p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 text-xs font-medium text-slate-700 flex items-start gap-2 shadow-2xs">
                  <MapPin className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{task.address}</span>
                </div>
              )}
            </div>

            {/* 📸 Miniatura Rápida de Foto si la tarea tiene imágenes */}
            {photos.length > 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onPreviewPhotos(photos, task.title)
                }}
                className="relative group/photo shrink-0 cursor-pointer self-start"
                title="Toca para ampliar foto"
              >
                <img
                  src={photos[0]}
                  alt="Foto de referencia"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white shadow-xs ring-1 ring-sky-300 hover:ring-sky-500 hover:scale-105 transition-all"
                />
                <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                  <Camera className="h-4 w-4 text-white drop-shadow" />
                </div>
                {photos.length > 1 && (
                  <span className="absolute -bottom-1 -right-1 bg-sky-700 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    +{photos.length - 1}
                  </span>
                )}
              </div>
            )}

            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#004594] transition-colors shrink-0 mt-0.5" />
          </div>
        </div>

        {/* 💵 CONTENEDORES DE MONTOS VISIBLES (Cobro a recibir / Pago a proveedor) */}
        {(task.requires_collection || task.requires_payment || task.scheduled_start_time) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Cobro en Verde */}
              {task.requires_collection && (
                <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-950 border border-emerald-300 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-2xs">
                  <DollarSign className="h-4 w-4 text-emerald-700" />
                  <span>Cobrar: </span>
                  <span className="font-mono text-emerald-800 text-sm">
                    C$ {(task.expected_collection_amount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Pago en Rojo/Rosa */}
              {task.requires_payment && (
                <div className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-950 border border-rose-300 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-2xs">
                  <Receipt className="h-4 w-4 text-rose-700" />
                  <span>Pagar: </span>
                  <span className="font-mono text-rose-800 text-sm">
                    -C$ {(task.expected_payment_amount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            {task.scheduled_start_time && (
              <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-2xs font-extrabold text-slate-700 px-2.5 py-1 rounded-xl font-mono shadow-2xs">
                <Clock className="h-3 w-3 text-slate-500" /> {task.scheduled_start_time}
              </span>
            )}
          </div>
        )}

        {/* 🛠️ HERRAMIENTAS DE CALLE (GPS / WhatsApp / Llamar) + BOTÓN DE ACCIÓN DE ESTADO */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/60">
          <div className="flex items-center gap-1.5">
            {/* Botón Mapa GPS */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenMap(task)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-900 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition cursor-pointer shadow-2xs"
              title="Abrir en Google Maps / Waze"
            >
              <Navigation className="h-3.5 w-3.5 text-indigo-600" />
              <span>Mapa GPS</span>
            </button>

            {/* Botón WhatsApp */}
            {task.phone && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenWhatsApp(task.phone)
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
                title="Abrir chat de WhatsApp"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

            {/* Botón Llamar */}
            {task.phone && (
              <a
                href={`tel:${task.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center p-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                title="Llamar por teléfono"
              >
                <Phone className="h-3.5 w-3.5 text-slate-600" />
              </a>
            )}
          </div>

          {/* Botones de Estado Secuenciales */}
          <div className="flex items-center gap-1.5">
            {task.status === 'assigned' && (
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartRoute(task)
                }}
                isLoading={isChangingStatus}
                leftIcon={<Bike className="h-3.5 w-3.5" />}
                className="text-xs font-extrabold rounded-xl bg-[#004594] hover:bg-[#083570] text-white shadow-xs"
              >
                Iniciar Ruta
              </Button>
            )}

            {task.status === 'en_route' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancelRoute(task)
                  }}
                  disabled={isChangingStatus}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Deshacer inicio de ruta y regresar a la lista de hoy"
                >
                  <Undo2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Deshacer</span>
                </button>
                <Button
                  size="sm"
                  variant="warning"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartManagement(task)
                  }}
                  isLoading={isChangingStatus}
                  leftIcon={<MapPin className="h-3.5 w-3.5" />}
                  className="text-xs font-extrabold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  Llegué al Lugar
                </Button>
              </div>
            )}

            {task.status === 'in_progress' && (
              <Button
                size="sm"
                variant="confirm"
                onClick={(e) => {
                  e.stopPropagation()
                  onComplete(task)
                }}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                className="text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Finalizar / Opciones
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Pantalla Principal Unificada de Mis Tareas / Mi Ruta ──────────────────

export default function CourierTasksPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = getLocalDateString()
  const toast = useToast()

  const viewMode = (searchParams.get('view') === 'map' ? 'map' : 'list') as 'list' | 'map'
  const setViewMode = (mode: 'list' | 'map') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (mode === 'map') {
        next.set('view', 'map')
      } else {
        next.delete('view')
      }
      return next
    })
  }

  const { lastPosition } = useCourierLiveLocation()
  const { data: activeWorkday } = useActiveWorkday(profile?.id)
  const [isStartWorkdayOpen, setIsStartWorkdayOpen] = useState(false)
  const [isNewGestionOpen, setIsNewGestionOpen] = useState(false)
  const [completeTargetTask, setCompleteTargetTask] = useState<TaskWithCourier | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')

  const { data: tasksData, isLoading } = useTasks({
    courier_id: profile?.id,
    date: todayStr,
    search: searchTerm || undefined,
    page_size: 100,
  })

  const { changeStatus, isChangingStatus, reorderTasks } = useTaskMutations()
  const allTasks = tasksData?.data || []

  // Visor de fotos de tareas
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [previewTitle, setPreviewTitle] = useState<string>('')

  const handlePreviewPhotos = (photos: string[], title: string) => {
    setPreviewImages(photos)
    setPreviewTitle(title)
  }

  // Sensores calibrados para móvil y escritorio
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Filtrar tareas activas (pendientes del día) vs completadas
  const approvedTasks = useMemo(
    () => allTasks.filter((t) => !t.approval_status || t.approval_status === 'approved'),
    [allTasks]
  )

  const activeTasks = useMemo(
    () => approvedTasks.filter((t) => ['assigned', 'en_route', 'in_progress', 'not_completed'].includes(t.status)),
    [approvedTasks]
  )

  const completedTasks = useMemo(
    () => approvedTasks.filter((t) => t.status === 'completed'),
    [approvedTasks]
  )

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

  const handleStartRoute = async (task: TaskWithCourier) => {
    if (!requireActiveWorkday('poner una tarea en ruta')) return

    // Validar que no haya otra tarea activa ('en_route' o 'in_progress')
    const currentActiveTask = allTasks.find(
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

  const handleCancelRoute = async (task: TaskWithCourier) => {
    try {
      await changeStatus({
        task_id: task.id,
        new_status: 'assigned',
        notes: 'Inicio de ruta cancelado / revertido por el motorizado',
      })
      toast.info('Ruta cancelada', `Parada ${task.code} volvió a tu cola de asignadas.`)
    } catch (err: unknown) {
      toast.error('Error al cancelar ruta', (err as Error)?.message || 'No se pudo cancelar la ruta.')
    }
  }

  const handleStartManagement = async (task: TaskWithCourier) => {
    if (!requireActiveWorkday('gestionar entregas')) return
    try {
      await changeStatus({ task_id: task.id, new_status: 'in_progress', notes: 'Llegó al lugar de gestión' })
      toast.success('Llegaste al lugar', `Tarea ${task.code} ahora en gestión.`)
    } catch (err: unknown) {
      toast.error('Error al actualizar estado', (err as Error)?.message || 'No se pudo actualizar el estado.')
    }
  }

  const handleOpenCompleteModal = (task: TaskWithCourier) => {
    if (!requireActiveWorkday('finalizar o cobrar tareas')) return
    setCompleteTargetTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = activeTasks.findIndex((t) => t.id === active.id)
    const newIndex = activeTasks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newItems = arrayMove(activeTasks, oldIndex, newIndex)
    const payload = newItems.map((task, idx) => ({
      id: task.id,
      route_order: idx + 1,
    }))

    try {
      await reorderTasks(payload)
      toast.info('Ruta actualizada', 'El nuevo orden de paradas ha sido guardado.')
    } catch (err: unknown) {
      toast.error('Error al reordenar', (err as Error)?.message || 'No se pudo guardar la posición.')
    }
  }

  const handleMoveItem = async (currentIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= activeTasks.length) return
    const newItems = arrayMove(activeTasks, currentIndex, targetIndex)
    const payload = newItems.map((task, idx) => ({
      id: task.id,
      route_order: idx + 1,
    }))

    try {
      await reorderTasks(payload)
      toast.info('Ruta actualizada', 'El nuevo orden de paradas ha sido guardado.')
    } catch (err: unknown) {
      toast.error('Error al reordenar', (err as Error)?.message || 'No se pudo guardar la posición.')
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
      toast.warning('Sin ubicación', 'Esta tarea no contiene dirección ni coordenadas registradas.')
    }
  }

  const openWhatsApp = (phone?: string | null) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleanPhone.startsWith('505') ? cleanPhone : '505' + cleanPhone}`, '_blank')
  }

  const todayFormatted = new Date().toLocaleDateString('es-NI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-4 animate-fade-in pb-24 max-w-2xl mx-auto">
      {/* 1. Header Ejecutivo Banpro */}
      <div className="bg-[#FAF8FE] border border-purple-100/70 rounded-3xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540] flex items-center gap-2">
            <Navigation className="h-5 w-5 text-indigo-700" />
            Mis Tareas & Ruta de Hoy
          </h1>
          <p className="text-xs text-indigo-900/80 font-medium capitalize mt-0.5">
            📅 {todayFormatted}
          </p>
        </div>

        <button
          onClick={() => {
            if (requireActiveWorkday('registrar una nueva gestión')) {
              setIsNewGestionOpen(true)
            }
          }}
          className="h-10 px-4 rounded-2xl bg-[#004594] hover:bg-[#083570] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>+ Nueva Gestión</span>
        </button>
      </div>

      {/* Selector de Modo de Vista: Lista vs Mapa de Ruta */}
      <div className="flex items-center justify-center p-1 bg-slate-200/80 rounded-2xl border border-slate-300/70 shadow-2xs">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer',
            viewMode === 'list'
              ? 'bg-white text-[#0A2540] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <ListFilter className="h-4 w-4" />
          <span>📋 Lista de Entregas</span>
          <span className={cn(
            'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono',
            viewMode === 'list' ? 'bg-slate-100 text-slate-700' : 'bg-slate-300/70 text-slate-700'
          )}>
            {approvedTasks.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('map')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer',
            viewMode === 'map'
              ? 'bg-[#004594] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Map className="h-4 w-4" />
          <span>🗺️ Mapa de Ruta</span>
          {activeTasks.length > 0 && (
            <span
              className={cn(
                'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                viewMode === 'map' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
              )}
            >
              {activeTasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Alerta de Jornada no iniciada */}
      {(!activeWorkday || activeWorkday.status !== 'open') && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 rounded-3xl shadow-sm flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl shrink-0">
              <Bike className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-100">
                Jornada no iniciada
              </h3>
              <p className="text-xs text-white/95 leading-tight mt-0.5">
                Debes abrir tu jornada para iniciar rutas, gestionar paradas y cobrar entregas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsStartWorkdayOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white text-[#0A2540] text-xs font-extrabold shadow-xs hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            Iniciar Jornada
          </button>
        </div>
      )}

      {/* MODO MAPA DE RUTA */}
      {viewMode === 'map' ? (
        <div className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-[520px] rounded-2xl" />
          ) : (
            <CourierRouteMap
              tasks={approvedTasks}
              courierLocation={
                lastPosition
                  ? {
                      latitude: lastPosition.latitude,
                      longitude: lastPosition.longitude,
                      heading: lastPosition.heading,
                    }
                  : null
              }
              onStartRoute={handleStartRoute}
              onCancelRoute={handleCancelRoute}
              onStartManagement={handleStartManagement}
              onComplete={handleOpenCompleteModal}
              isChangingStatus={isChangingStatus}
            />
          )}
        </div>
      ) : (
        /* MODO LISTA DE TAREAS */
        <div className="space-y-4">
          {/* 2. Barra de Búsqueda */}
          <div className="relative">
            <Input
              placeholder="Buscar por cliente, título o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              className="bg-white"
            />
          </div>

          {/* 3. Píldoras de Filtro Rápido */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer',
                  statusFilter === 'all'
                    ? 'bg-[#004594] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                Todas ({approvedTasks.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer',
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                Pendientes ({activeTasks.length})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer',
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                Completadas ({completedTasks.length})
              </button>
            </div>

            <span className="text-2xs font-bold text-slate-500 font-mono hidden sm:inline">
              {activeTasks.length} en ruta
            </span>
          </div>

      {/* 4. Lista Principal de Tareas */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      ) : approvedTasks.length === 0 ? (
        <EmptyState
          title="No tienes tareas asignadas hoy"
          description="Pide a administración que te asigne tareas para ver tu hoja de ruta del día."
          icon={<Bike className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-5">
          {/* TAREAS ACTIVAS (CON CAPACIDAD DE ORDENAR PARADAS) */}
          {(statusFilter === 'all' || statusFilter === 'pending') && (
            <div className="space-y-3">
              {activeTasks.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-center text-xs text-emerald-900 font-bold shadow-xs">
                  🎉 ¡Felicidades! Has completado todas las paradas activas de tu ruta de hoy.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={activeTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3.5">
                      {activeTasks.map((task, idx) => (
                        <TaskCardItem
                          key={task.id}
                          task={task}
                          index={idx}
                          isFirst={idx === 0}
                          isLast={idx === activeTasks.length - 1}
                          onMoveUp={() => handleMoveItem(idx, idx - 1)}
                          onMoveDown={() => handleMoveItem(idx, idx + 1)}
                          onNavigate={(t) => navigate(`/motorizado/tareas/${t.id}`)}
                          onOpenMap={openNavigation}
                          onOpenWhatsApp={openWhatsApp}
                          onStartRoute={handleStartRoute}
                          onCancelRoute={handleCancelRoute}
                          onStartManagement={handleStartManagement}
                          onComplete={handleOpenCompleteModal}
                          onPreviewPhotos={handlePreviewPhotos}
                          isChangingStatus={isChangingStatus}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}

          {/* HISTORIAL DE TAREAS COMPLETADAS HOY */}
          {(statusFilter === 'all' || statusFilter === 'completed') && completedTasks.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Completadas Hoy ({completedTasks.length})
              </h2>

              <div className="space-y-2.5">
                {completedTasks.map((task) => {
                  const completedPhotos = getTaskPhotos(task)
                  return (
                    <Card
                      key={task.id}
                      isHoverable
                      onClick={() => navigate(`/motorizado/tareas/${task.id}`)}
                      className="p-4 bg-white border border-emerald-100 rounded-2xl flex items-center justify-between text-xs cursor-pointer hover:bg-emerald-50/50 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 line-through">
                              {task.title}
                            </p>
                            {completedPhotos.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePreviewPhotos(completedPhotos, `Comprobante de Entrega - ${task.code}`)
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                                title="Ver comprobante de entrega"
                              >
                                <Camera className="h-3 w-3 text-emerald-700" />
                                <span>{task.evidence_url ? '📸 Comprobante POD' : `${completedPhotos.length} fotos`}</span>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-2xs text-slate-400 font-mono mt-0.5">
                            <span>{task.code}</span>
                            {task.requires_collection && (
                              <span className="text-emerald-700 font-bold font-sans">
                                (Cobrado: C${task.expected_collection_amount})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {/* Visor Flotante de Fotos */}
      <ImageViewerModal
        images={previewImages}
        title={previewTitle}
        isOpen={previewImages.length > 0}
        onClose={() => setPreviewImages([])}
      />

      {/* Modal de Finalizar y Cobrar Tarea */}
      <CompleteTaskModal
        task={completeTargetTask}
        isOpen={!!completeTargetTask}
        onClose={() => setCompleteTargetTask(null)}
      />

      {/* Modal de Nueva Gestión */}
      <NewCourierGestionModal
        isOpen={isNewGestionOpen}
        onClose={() => setIsNewGestionOpen(false)}
        branchId={branchId}
        workdayId={activeWorkday?.id}
      />

      {/* Modal de Inicio de Jornada */}
      <StartWorkdayModal
        branchId={branchId}
        isOpen={isStartWorkdayOpen}
        onClose={() => setIsStartWorkdayOpen(false)}
      />
    </div>
  )
}
