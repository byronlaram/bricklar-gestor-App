import { useState } from 'react'
import { X, CheckCircle2, XCircle, Loader2, DollarSign, CreditCard } from 'lucide-react'
import type { TaskWithCourier } from '@/modules/tasks/types/task.types'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import type { PaymentMethod } from '@/shared/types'

interface CompleteTaskModalProps {
  task: TaskWithCourier | null
  isOpen: boolean
  onClose: () => void
}

export function CompleteTaskModal({ task, isOpen, onClose }: CompleteTaskModalProps) {
  const [outcome, setOutcome] = useState<'completed' | 'not_completed'>('completed')
  const [collectedAmount, setCollectedAmount] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState<string>('')
  const [failureReason, setFailureReason] = useState<string>('Cliente ausente')

  const { changeStatus, isChangingStatus, statusError } = useTaskMutations()

  if (!isOpen || !task) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (outcome === 'completed') {
        await changeStatus({
          task_id: task.id,
          new_status: 'completed',
          notes: notes.trim()
            ? `Cobrado: C$${collectedAmount || 0} (${paymentMethod}). Obs: ${notes}`
            : `Cobrado: C$${collectedAmount || 0} (${paymentMethod})`,
        })
      } else {
        await changeStatus({
          task_id: task.id,
          new_status: 'not_completed',
          notes: `Motivo: ${failureReason}. ${notes.trim()}`,
        })
      }
      onClose()
    } catch (err) {
      console.error('Error completing task:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-foreground-muted hover:text-foreground transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-base font-bold text-foreground">Finalizar Gestión de Tarea</h2>
          <p className="text-xs text-foreground-muted font-mono">{task.code} — {task.title}</p>
        </div>

        {/* Selector Exitoso / No Completado */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
          <button
            type="button"
            onClick={() => setOutcome('completed')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              outcome === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Completada
          </button>

          <button
            type="button"
            onClick={() => setOutcome('not_completed')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              outcome === 'not_completed'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <XCircle className="h-4 w-4" />
            No Completada
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {outcome === 'completed' ? (
            <>
              {task.requires_collection && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Monto Recaudado Real (C$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`Esperado: C$${task.expected_collection_amount || 0}`}
                      value={collectedAmount}
                      onChange={(e) => setCollectedAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" />
                      Método de Pago Recibido
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-foreground"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="bank_transfer">Transferencia Bancaria</option>
                      <option value="mobile_wallet">Billetera Móvil (Lafise / Banpro)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">
                  Notas de Entrega / Firma o Comprobante
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Entregado a recepcionista en 2do piso..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Motivo de Incidencia / No Entrega
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                >
                  <option value="Cliente ausente">Cliente ausente o no responde</option>
                  <option value="Dirección incorrecta">Dirección incorrecta o inalcanzable</option>
                  <option value="Rechazado por cliente">Pedido o gestión rechazada</option>
                  <option value="Falta de dinero">Cliente no contaba con el efectivo</option>
                  <option value="Problema mecánico">Falla mecánica / Contratiempo en ruta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">
                  Detalles Adicionales de la Incidencia
                </label>
                <textarea
                  rows={3}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explique lo ocurrido para el reporte de administración..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
                />
              </div>
            </>
          )}

          {statusError && (
            <p className="text-xs text-destructive font-medium">
              {(statusError as Error).message}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingStatus}
              className={`w-full py-3 px-4 text-sm font-bold text-white disabled:opacity-50 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 ${
                outcome === 'completed'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isChangingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando resultado...
                </>
              ) : outcome === 'completed' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Tarea Completada
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Registrar Incidencia
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
