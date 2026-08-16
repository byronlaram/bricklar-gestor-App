import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from '@dnd-kit/sortable'
import { Bike, CheckCircle2, ChevronRight, Navigation } from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import { SortableTaskCard } from '@/modules/tasks/components/SortableTaskCard'
import { TaskStatusModal } from '@/modules/tasks/components/TaskStatusModal'
import type { TaskWithCourier } from '@/modules/tasks/types/task.types'
import { Card, Badge, Skeleton, EmptyState, useToast } from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'

export default function RoutePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const todayStr = getLocalDateString()

  const [statusTaskTarget, setStatusTaskTarget] = useState<TaskWithCourier | null>(null)

  const { data, isLoading } = useTasks({
    courier_id: profile?.id,
    date: todayStr,
    page_size: 50,
  })

  const { changeStatus, reorderTasks } = useTaskMutations()

  const tasks = data?.data || []

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

  // Filtrar y ordenar tareas activas (solo las aprobadas o creadas por admin)
  const approvedTasks = tasks.filter((t) => !t.approval_status || t.approval_status === 'approved')
  const activeTasks = approvedTasks.filter((t) =>
    ['assigned', 'en_route', 'in_progress', 'not_completed'].includes(t.status)
  )
  const completedTasks = approvedTasks.filter((t) => t.status === 'completed')

  const handleStartRoute = async (task: TaskWithCourier) => {
    try {
      await changeStatus({ task_id: task.id, new_status: 'en_route' })
      toast.success('Ruta iniciada', `Tarea ${task.code} en camino.`)
    } catch (err: unknown) {
      toast.error('Error al iniciar ruta', (err as Error)?.message || 'No se pudo iniciar la ruta.')
    }
  }

  const handleStartManagement = async (task: TaskWithCourier) => {
    try {
      await changeStatus({ task_id: task.id, new_status: 'in_progress', notes: 'Llegó al lugar de gestión' })
      toast.success('Llegaste al lugar', `Tarea ${task.code} ahora en gestión.`)
    } catch (err: unknown) {
      toast.error('Error al actualizar estado', (err as Error)?.message || 'No se pudo actualizar el estado.')
    }
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
      toast.info('Ruta actualizada', 'El nuevo orden de la ruta ha sido guardado.')
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
      toast.info('Ruta actualizada', 'El nuevo orden de la ruta ha sido guardado.')
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

  return (
    <div className="space-y-5 animate-fade-in pb-20 max-w-2xl mx-auto">
      {/* Header Lavanda Pastel Ejecutivo de la ruta */}
      <div className="bg-[#FAF8FE] border border-purple-100/70 rounded-3xl p-5 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540] flex items-center gap-2">
            <Navigation className="h-5 w-5 text-indigo-700" />
            Mi Ruta Inteligente
          </h1>
          <p className="text-xs text-indigo-900/80 font-medium mt-0.5">
            Orden de paradas para navegación rápida durante tu turno.
          </p>
        </div>
        <Badge variant="assigned" size="md">
          {activeTasks.length} Paradas
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tienes tareas asignadas hoy"
          description="Pide al administrador que te asigne tareas para ver tu hoja de ruta."
          icon={<Bike className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-6">
          {/* Tareas Activas en Ruta */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Hoja de Ruta en Progreso ({activeTasks.length})
            </h2>

            {activeTasks.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center text-xs text-emerald-800 font-bold shadow-xs">
                🎉 ¡Felicidades! Has completado todas las tareas activas de tu ruta.
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
                      <SortableTaskCard
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
                        onStartManagement={handleStartManagement}
                        onOpenStatusModal={(t) => setStatusTaskTarget(t)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Historial de Tareas Completadas */}
          {completedTasks.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Historial de Tareas Completadas Hoy ({completedTasks.length})
              </h2>

              <div className="space-y-2.5">
                {completedTasks.map((task) => (
                  <Card
                    key={task.id}
                    isHoverable
                    onClick={() => navigate(`/motorizado/tareas/${task.id}`)}
                    className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-700 line-through">
                          {task.title}
                        </p>
                        <p className="text-2xs text-slate-400 font-mono">{task.code}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de cambio de estado */}
      <TaskStatusModal
        isOpen={!!statusTaskTarget}
        onClose={() => setStatusTaskTarget(null)}
        task={statusTaskTarget}
      />
    </div>
  )
}
