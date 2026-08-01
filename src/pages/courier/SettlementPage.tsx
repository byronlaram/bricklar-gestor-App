import { useState } from 'react'
import {
  Calculator,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  DollarSign,
  CreditCard,
  Receipt,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import { useWorkdaySettlement, useSettlementMutations } from '@/modules/settlements/hooks/useSettlements'
import { SETTLEMENT_STATUS_LABELS } from '@/shared/types'

export default function CourierSettlementPage() {
  const { profile } = useAuth()
  const [notes, setNotes] = useState('')

  const { data: activeWorkday, isLoading: isLoadingWorkday } = useActiveWorkday(profile?.id)
  const { data: settlement, isLoading: isLoadingSettlement } = useWorkdaySettlement(activeWorkday?.id)

  const { submitSettlement, isSubmitting } = useSettlementMutations()

  const handleSubmitReview = async () => {
    if (!activeWorkday) return
    try {
      await submitSettlement({ workdayId: activeWorkday.id, notes: notes.trim() || undefined })
    } catch (err) {
      console.error('Error submitting settlement:', err)
    }
  }

  if (isLoadingWorkday || isLoadingSettlement) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-foreground-muted">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-xs">Cargando estado de tu liquidación...</p>
      </div>
    )
  }

  if (!activeWorkday) {
    return (
      <div className="p-8 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-foreground-muted mx-auto" />
        <h2 className="text-base font-bold text-foreground">No tienes una jornada activa hoy</h2>
        <p className="text-xs text-foreground-muted">
          Inicia tu jornada desde la pantalla de inicio para generar tu resumen de liquidación.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Liquidación de Turno</h1>
          <p className="text-xs text-foreground-muted">Resumen de cuadre de entregas y arqueo final.</p>
        </div>

        {settlement && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              settlement.status === 'approved'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : settlement.status === 'pending_review'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            }`}
          >
            {SETTLEMENT_STATUS_LABELS[settlement.status] || settlement.status}
          </span>
        )}
      </div>

      {/* Card de Resumen Financiero de la Liquidación */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2 flex items-center gap-1.5">
          <Calculator className="h-4 w-4 text-accent" />
          Desglose de la Jornada ({activeWorkday.work_date})
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-xl">
            <span className="text-foreground-muted flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Cobros en Efectivo Esperados:
            </span>
            <span className="font-bold text-foreground">
              C${settlement?.expected_cash.toFixed(2) || '0.00'}
            </span>
          </div>

          <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-xl">
            <span className="text-foreground-muted flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-sky-500" />
              Cobros en Transferencia / Billetera:
            </span>
            <span className="font-bold text-foreground">
              C${settlement?.expected_transfers.toFixed(2) || '0.00'}
            </span>
          </div>

          <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-xl">
            <span className="text-foreground-muted flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-amber-500" />
              Gastos / Egresos en Ruta:
            </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              - C${settlement?.total_expenses.toFixed(2) || '0.00'}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl font-bold text-sm">
            <span className="text-emerald-700 dark:text-emerald-400">Efectivo Neto a Entregar a Caja:</span>
            <span className="text-emerald-700 dark:text-emerald-300">
              C$
              {((settlement?.expected_cash || 0) - (settlement?.total_expenses || 0)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Formulario / Acción de Enviar a Liquidación */}
      {(!settlement || settlement.status === 'draft') && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-foreground">Enviar a Revisión de Administración</h3>
          <p className="text-xs text-foreground-muted">
            Al presionar este botón, tu resumen se enviará al panel del administrador para cuadre y aprobación.
          </p>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Notas Adicionales para el Administrador (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Entregué billetes en sobre, comprobante de gasolina adjunto..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
            />
          </div>

          <button
            onClick={handleSubmitReview}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 text-sm font-bold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando Liquidación...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Liquidación a Revisión
              </>
            )}
          </button>
        </div>
      )}

      {settlement?.status === 'pending_review' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2 text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2 font-bold">
            <Clock className="h-4 w-4" />
            Liquidación Enviada a Revisión
          </div>
          <p>
            Tu resumen ha sido recibido por administración. Preséntate en caja central para entregar el efectivo físico.
          </p>
        </div>
      )}

      {settlement?.status === 'approved' && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2 text-xs text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            Liquidación Aprobada y Cerrada
          </div>
          <p>Tu cuadre fue verificado exitosamente por el administrador.</p>
        </div>
      )}
    </div>
  )
}
