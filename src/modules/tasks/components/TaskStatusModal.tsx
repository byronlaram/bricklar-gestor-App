import { useState, useEffect } from 'react'
import { X, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react'
import type { TaskWithCourier } from '../types/task.types'
import type { TaskStatus } from '@/shared/types'
import { ALLOWED_TRANSITIONS, TASK_STATUS_LABELS } from '@/shared/types'
import { useTaskMutations } from '../hooks/useTaskMutations'
import { TaskStatusBadge } from './TaskStatusBadge'

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

  if (!isOpen || !task) return null

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-foreground-muted hover:text-foreground transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Cambiar Estado de Tarea</h2>
            <p className="text-xs text-foreground-muted">Tarea: {task.code} - {task.title}</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/50">
          <span className="text-xs text-foreground-muted">Estado actual:</span>
          <TaskStatusBadge status={task.status} />
        </div>

        {allowedStatuses.length === 0 ? (
          <div className="p-4 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-500/20 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Esta tarea no admite más cambios de estado en su ciclo actual.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                Nuevo Estado Permitido
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              >
                {allowedStatuses.map((st) => (
                  <option key={st} value={st}>
                    {TASK_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>

            {newStatus === 'cancelled' && (
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                  Motivo de Cancelación <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Ej: Cliente canceló el pedido..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                Observaciones / Notas (Opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles adicionales sobre este cambio..."
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
              />
            </div>

            {statusError && (
              <p className="text-xs text-destructive font-medium">
                {(statusError as Error).message}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground border border-border rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isChangingStatus}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
              >
                {isChangingStatus ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Estado'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
