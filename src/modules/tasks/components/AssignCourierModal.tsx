import { useState, useEffect } from 'react'
import { X, UserPlus, UserX, Loader2 } from 'lucide-react'
import type { TaskWithCourier } from '../types/task.types'
import { useCouriers } from '../hooks/useCouriers'
import { useTaskMutations } from '../hooks/useTaskMutations'

interface AssignCourierModalProps {
  task: TaskWithCourier | null
  isOpen: boolean
  onClose: () => void
}

export function AssignCourierModal({ task, isOpen, onClose }: AssignCourierModalProps) {
  const [selectedCourierId, setSelectedCourierId] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  const { data: couriers = [], isLoading: isLoadingCouriers } = useCouriers(task?.branch_id)
  const { assignTask, isAssigning } = useTaskMutations()

  useEffect(() => {
    if (task) {
      setSelectedCourierId(task.assigned_courier_id || '')
      setReason('')
    }
  }, [task])

  if (!isOpen || !task) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await assignTask({
        task_id: task.id,
        courier_id: selectedCourierId || null,
        reason: reason.trim() || undefined,
      })
      onClose()
    } catch (err) {
      console.error('Error assigning courier:', err)
    }
  }

  const isUnassigning = !selectedCourierId && !!task.assigned_courier_id

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
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Asignar Motorizado</h2>
            <p className="text-xs text-foreground-muted">Tarea: {task.code} - {task.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Seleccionar Motorizado
            </label>
            {isLoadingCouriers ? (
              <div className="flex items-center gap-2 text-xs text-foreground-muted py-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                Cargando motorizados...
              </div>
            ) : (
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              >
                <option value="">-- Ninguno (Sin asignar) --</option>
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.display_name || courier.full_name} {courier.phone ? `(${courier.phone})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Motivo / Notas de Asignación (Opcional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Reasignación por cambio de zona..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
            />
          </div>

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
              disabled={isAssigning}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : isUnassigning ? (
                <>
                  <UserX className="h-3.5 w-3.5" />
                  Desasignar
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Confirmar Asignación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
