import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Bike,
  User,
  DollarSign,
  Camera,
} from 'lucide-react'
import { TaskTypeBadge } from './TaskTypeBadge'
import { TaskStatusBadge } from './TaskStatusBadge'
import type { TaskWithCourier } from '../types/task.types'
import { Button } from '@/shared/components/ui'
import { getTaskPhotos } from '@/pages/courier/TasksPage'

interface SortableTaskCardProps {
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
  onStartManagement?: (task: TaskWithCourier) => void
  onOpenStatusModal: (task: TaskWithCourier) => void
  onPreviewPhotos?: (photos: string[], title: string) => void
}

export function SortableTaskCard({
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
  onStartManagement,
  onOpenStatusModal,
  onPreviewPhotos,
}: SortableTaskCardProps) {
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
    'bg-[#FAF8FE] border-purple-100/70',
    'bg-[#F5F8FE] border-blue-100/70',
    'bg-[#F3F9F6] border-emerald-100/70',
    'bg-[#FCFAF4] border-amber-100/70',
    'bg-[#FCF5F7] border-rose-100/70',
  ]
  const cardStyle = cardStyles[index % cardStyles.length]
  const photos = getTaskPhotos(task)

  return (
    <div ref={setNodeRef} style={style} className="touch-action-none">
      <div
        className={`${cardStyle} rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xs hover:shadow-xs transition-all border ${
          isDragging ? 'ring-2 ring-indigo-600 shadow-xl scale-[1.02] bg-indigo-50/60' : ''
        }`}
      >
        {/* Header: Asa de Arrastre + Parada # + Controles Táctiles + Badges Tipo, Foto y Estado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
          <div className="flex items-center justify-between w-full gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {/* Control Asa Táctil (Drag Handle) */}
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 cursor-grab active:cursor-grabbing touch-none shrink-0"
                title="Arrastrar para reordenar parada"
                aria-label="Arrastrar para reordenar"
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

              {/* 📸 Indicador Prominente de Fotos */}
              {photos.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onPreviewPhotos) {
                      onPreviewPhotos(photos, task.title)
                    } else {
                      onNavigate(task)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 font-extrabold text-xs shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Esta tarea tiene fotos. Toca para verlas."
                >
                  <Camera className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                  <span>{photos.length > 1 ? `${photos.length} Fotos` : 'Tiene Foto'}</span>
                </button>
              )}
            </div>

            {/* Badge de Estado Ajustado Nítidamente a la Derecha */}
            <div className="shrink-0">
              <TaskStatusBadge status={task.status} />
            </div>
          </div>
        </div>

        {/* Título, Cliente y Dirección Destacada */}
        <div
          onClick={() => onNavigate(task)}
          className="space-y-1.5 cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-extrabold text-[#0A2540] group-hover:text-[#004594] transition-colors leading-snug">
              {task.title}
            </h3>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#004594] transition-colors shrink-0 mt-0.5" />
          </div>

          {(task.contact_name || task.provider_name || task.institution_name || task.company_name) && (
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              <span>{task.contact_name || task.provider_name || task.institution_name || task.company_name}</span>
            </p>
          )}

          {task.address && (
            <div className="p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 text-xs font-medium text-slate-700 flex items-start gap-2 shadow-2xs">
              <MapPin className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{task.address}</span>
            </div>
          )}
        </div>

        {/* Resumen Financiero Integrado (Cobro / Pago) */}
        {(task.requires_collection || task.requires_payment) && (
          <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 flex items-center justify-between text-xs font-extrabold shadow-2xs">
            <span className="text-slate-600 flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-emerald-600" /> Monto de Operación:
            </span>
            {task.requires_collection && (
              <span className="text-emerald-700 font-mono">
                Cobrar C${task.expected_collection_amount || 0}
              </span>
            )}
            {task.requires_payment && (
              <span className="text-amber-700 font-mono">
                Pagar C${task.expected_payment_amount || 0}
              </span>
            )}
          </div>
        )}

        {/* Botones de Acción de Ruta */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-1.5">
            {/* Botón Mapa */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenMap(task)}
              leftIcon={<Navigation className="h-3.5 w-3.5 text-indigo-700" />}
              className="text-2xs font-bold rounded-xl"
            >
              Mapa
            </Button>

            {/* Botón Llamar */}
            {task.phone && (
              <a
                href={`tel:${task.phone}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl hover:bg-emerald-100 transition cursor-pointer"
              >
                <Phone className="h-3.5 w-3.5" />
                Llamar
              </a>
            )}

            {/* Botón WhatsApp */}
            {task.phone && (
              <button
                type="button"
                onClick={() => onOpenWhatsApp(task.phone)}
                className="inline-flex items-center justify-center p-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl hover:bg-emerald-100 transition cursor-pointer"
                title="Enviar mensaje de WhatsApp"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Botones Inteligentes Secuenciales de Estado */}
          {task.status === 'assigned' ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onStartRoute(task)}
              leftIcon={<Bike className="h-3.5 w-3.5" />}
              className="text-2xs font-extrabold rounded-xl bg-[#004594] hover:bg-[#083570] text-white shadow-xs"
            >
              🚗 Iniciar Ruta
            </Button>
          ) : task.status === 'en_route' ? (
            <Button
              size="sm"
              variant="warning"
              onClick={() => onStartManagement?.(task)}
              leftIcon={<MapPin className="h-3.5 w-3.5" />}
              className="text-2xs font-extrabold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
            >
              📍 Llegué / En Gestión
            </Button>
          ) : (
            <Button
              size="sm"
              variant="confirm"
              onClick={() => onOpenStatusModal(task)}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              className="text-2xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              ✅ Finalizar Gestión
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
