import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { TaskWithCourier } from '../types/task.types'
import type { TaskStatus } from '@/shared/types'
import { ALLOWED_TRANSITIONS, TASK_STATUS_LABELS } from '@/shared/types'
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

export function TaskStatusModal({ task, isOpen, onClose }: TaskStatusModalProps) {
  const [newStatus, setNewStatus] = useState<TaskStatus | ''>('')
  const [notes, setNotes] = useState<string>('')
  const [cancellationReason, setCancellationReason] = useState<string>('')

  const { changeStatus, isChangingStatus, statusError } = useTaskMutations()

  useEffect(() => {
    if (task) {
      const allowed = ALLOWED_TRANSITIONS[task.status] || []
      setNewStatus(allowed[0] || '')
      setNotes('')
      setCancellationReason('')
    }
  }, [task])

  if (!task) return null

  const allowedStatuses = ALLOWED_TRANSITIONS[task.status] || []

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

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
            {/* Banner de Estado Actual */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Estado actual:</span>
              <TaskStatusBadge status={task.status} />
            </div>

            {allowedStatuses.length === 0 ? (
              <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Esta tarea ha alcanzado un estado final y no admite más cambios en su ciclo operativo.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nuevo Estado Permitido
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
                  >
                    {allowedStatuses.map((st) => (
                      <option key={st} value={st}>
                        {TASK_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>

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
                    Observaciones / Notas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalles adicionales sobre este cambio de estado..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs resize-none"
                  />
                </div>

                {statusError && (
                  <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {(statusError as Error).message}
                  </p>
                )}
              </div>
            )}
          </ModalBody>

          {allowedStatuses.length > 0 && (
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
          )}
        </form>
      </ModalContent>
    </Modal>
  )
}
