import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TaskWithCourier } from '@/modules/tasks/types/task.types'

interface AdminSortableTaskRowProps {
  task: TaskWithCourier
  index: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  isReordering: boolean
  children: React.ReactNode
}

export function AdminSortableTaskRow({
  task,
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  isReordering,
  children,
}: AdminSortableTaskRowProps) {
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
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
    position: isDragging ? ('relative' as const) : undefined,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-slate-50/80 transition-colors group ${
        isDragging ? 'bg-indigo-50/80 shadow-lg ring-2 ring-indigo-400 rounded-xl' : ''
      }`}
    >
      {/* Columna de Orden: Drag Handle + Número + Flechas ↑↓ */}
      <td className="py-2 px-3 w-[90px]">
        <div className="flex items-center gap-1.5">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={isReordering}
            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 cursor-grab active:cursor-grabbing touch-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Arrastrar para cambiar posición"
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Número de orden */}
          <span className="text-2xs font-black font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full min-w-[22px] text-center">
            {index + 1}
          </span>

          {/* Flechas ↑↓ */}
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              disabled={isFirst || isReordering}
              onClick={(e) => { e.stopPropagation(); onMoveUp() }}
              className="h-5 w-5 flex items-center justify-center rounded bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 text-slate-500 hover:text-indigo-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-90"
              title="Subir una posición"
              aria-label="Subir una posición"
            >
              <ChevronUp className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              disabled={isLast || isReordering}
              onClick={(e) => { e.stopPropagation(); onMoveDown() }}
              className="h-5 w-5 flex items-center justify-center rounded bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 text-slate-500 hover:text-indigo-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-90"
              title="Bajar una posición"
              aria-label="Bajar una posición"
            >
              <ChevronDown className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </td>

      {/* Resto de columnas inyectadas como children */}
      {children}
    </tr>
  )
}
