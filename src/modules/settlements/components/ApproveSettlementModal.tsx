import { useState, useEffect } from 'react'
import { X, CheckCircle2, AlertTriangle, Calculator, Loader2 } from 'lucide-react'
import type { Settlement } from '../types/settlements.types'
import { useSettlementMutations } from '../hooks/useSettlements'

interface ApproveSettlementModalProps {
  settlement: Settlement | null
  isOpen: boolean
  onClose: () => void
}

export function ApproveSettlementModal({ settlement, isOpen, onClose }: ApproveSettlementModalProps) {
  const [actualCash, setActualCash] = useState<number | ''>('')
  const [actualTransfers, setActualTransfers] = useState<number | ''>('')
  const [notes, setNotes] = useState<string>('')

  const { approveSettlement, isApproving, approveError } = useSettlementMutations()

  useEffect(() => {
    if (settlement) {
      setActualCash(settlement.actual_cash ?? settlement.expected_cash)
      setActualTransfers(settlement.actual_transfers ?? settlement.expected_transfers)
      setNotes(settlement.notes || '')
    }
  }, [settlement])

  if (!isOpen || !settlement) return null

  const numericCash = Number(actualCash || 0)
  const diff = numericCash - settlement.expected_cash

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await approveSettlement({
        settlement_id: settlement.id,
        actual_cash: numericCash,
        actual_transfers: Number(actualTransfers || 0),
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      console.error('Error approving settlement:', err)
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
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Arqueo y Cierre de Liquidación</h2>
            <p className="text-xs text-foreground-muted">
              Motorizado: {settlement.courier_profile?.display_name || settlement.courier_profile?.full_name}
            </p>
          </div>
        </div>

        {/* Resumen de Arqueo */}
        <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-foreground-muted">Efectivo Cobrado Esperado:</span>
            <span className="font-bold text-foreground">C${(settlement.expected_cash ?? 0).toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-foreground-muted">Gastos de Ruta Registrados:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              - C${(settlement.total_expenses ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border/40 font-bold">
            <span className="text-foreground">Efectivo Neto a Recibir en Caja:</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              C${((settlement.expected_cash ?? 0) - (settlement.total_expenses ?? 0)).toFixed(2)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Efectivo Entregado Físicamente por el Motorizado (C$) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          {/* Alert de Diferencia */}
          {diff !== 0 && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                diff > 0
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {diff > 0
                  ? `Sobrante detectado en caja: +C$${diff.toFixed(2)}`
                  : `Faltante detectado en caja: -C$${Math.abs(diff).toFixed(2)}`}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Observaciones del Administrador
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre el cuadre o resolución de faltantes/sobrantes..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
            />
          </div>

          {approveError && (
            <p className="text-xs text-destructive font-medium">
              {(approveError as Error).message}
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
              disabled={isApproving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Aprobando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aprobar y Cerrar Liquidación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
