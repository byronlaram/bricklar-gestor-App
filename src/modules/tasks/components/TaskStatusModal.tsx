import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { TaskWithCourier } from '../types/task.types'
import type { TaskStatus } from '@/shared/types'
import { TASK_STATUS_LABELS } from '@/shared/types'
import { useTaskMutations } from '../hooks/useTaskMutations'
import { TaskStatusBadge } from './TaskStatusBadge'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@/shared/components/ui'

interface TaskStatusModalProps {
  task: TaskWithCourier | null
  isOpen: boolean
  onClose: () => void
}

const ALL_SYSTEM_STATUSES: TaskStatus[] = [
  'pending',
  'assigned',
  'en_route',
  'in_progress',
  'completed',
  'not_completed',
  'rescheduled',
  'cancelled',
  'archived',
]

export function TaskStatusModal({ task, isOpen, onClose }: TaskStatusModalProps) {
  const [newStatus, setNewStatus] = useState<TaskStatus | ''>('')
  const [notes, setNotes] = useState<string>('')
  const [cancellationReason, setCancellationReason] = useState<string>('')

  const { changeStatus, isChangingStatus, statusError } = useTaskMutations()

  const availableStatuses = task
    ? ALL_SYSTEM_STATUSES.filter((st) => st !== task.status)
    : []

  useEffect(() => {
    if (task && availableStatuses.length > 0) {
      setNewStatus(availableStatuses[0])
      setNotes('')
      setCancellationReason('')
    }
  }, [task])

  if (!task) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStatus) return

    try {
      await changeStatus({
        task_id: task.id,
        new_status: newStatus as TaskStatus,
        notes: notes.trim() || undefined,
        cancellation_reason:
          newStatus === 'cancelled' ? cancellationReason.trim() || undefined : undefined,
      })
      onClose()
    } catch (err) {
      console.error('Error changing status:', err)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent size="md">
        <ModalHeader onClose={onClose}>
          <ModalTitle>Cambiar Estado de Tarea</ModalTitle>
          <ModalDescription>Tarea {task.code}: {task.title}</ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ModalBody className="space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Banner de Estado Actual */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Estado actual:</span>
              <TaskStatusBadge status={task.status} />
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Nuevo Estado
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
                >
                  {availableStatuses.map((st) => (
                    <option key={st} value={st}>
                      {TASK_STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>

              {newStatus === 'rescheduled' && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Recomendación:</strong> Para clonar los datos hacia una nueva fecha y crear de inmediato la nueva tarea para el motorizado, puedes usar directamente el botón <strong>«Reprogramar Tarea»</strong> en la vista principal o de detalle.
                  </span>
                </div>
              )}

              {newStatus === 'cancelled' && (
                <Input
                  label="Motivo de Cancelación"
                  type="text"
                  required
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Ej: Cliente canceló el pedido por demora..."
                />
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Observaciones / Motivo de la corrección {['completed', 'cancelled'].includes(task.status) ? '(Requerido)' : '(Opcional)'}
                </label>
                <textarea
                  rows={2}
                  required={['completed', 'cancelled'].includes(task.status)}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Justifique el motivo del cambio de estado para la auditoría..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs resize-none"
                />
              </div>

              {statusError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {(statusError as Error).message}
                </p>
              )}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isChangingStatus}
            >
              Actualizar Estado
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
