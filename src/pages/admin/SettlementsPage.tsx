import { useState } from 'react'
import {
  Calendar,
  Calculator,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  ListFilter,
  Eye,
  CheckSquare,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { useSettlements } from '@/modules/settlements/hooks/useSettlements'
import type { SettlementFilters, Settlement } from '@/modules/settlements/types/settlements.types'
import { SETTLEMENT_STATUS_LABELS } from '@/shared/types'
import { ApproveSettlementModal } from '@/modules/settlements/components/ApproveSettlementModal'

export default function AdminSettlementsPage() {
  const { profile } = useAuth()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = new Date().toISOString().split('T')[0]

  const [filters, setFilters] = useState<SettlementFilters>({
    branch_id: defaultBranchId,
    date: '',
  })

  const [targetSettlement, setTargetSettlement] = useState<Settlement | null>(null)

  const { data: settlements = [], isLoading, isError, error } = useSettlements(filters)

  // Métricas
  const pendingCount = settlements.filter((s) => s.status === 'pending_review').length
  const approvedCount = settlements.filter((s) => s.status === 'approved' || s.status === 'closed').length
  const totalCollected = settlements.reduce((acc, s) => acc + (s.actual_cash ?? 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Liquidaciones & Arqueo de Caja</h1>
          <p className="text-xs text-foreground-muted">
            Audita el cuadre financiero de los motorizados y aprueba las liquidaciones de turno.
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <ListFilter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Total Liquidaciones</p>
            <p className="text-lg font-bold text-foreground">{settlements.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Pendientes Revisión</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Aprobadas</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{approvedCount}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Recaudación Total</p>
            <p className="text-lg font-bold text-foreground">C${totalCollected.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filtro de Fecha */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center gap-3">
        <div className="relative w-full sm:w-48">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="date"
            value={filters.date || ''}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
          />
        </div>
      </div>

      {/* Tabla de Liquidaciones */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Cargando liquidaciones...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-xs text-destructive">
            Error al cargar liquidaciones: {(error as Error).message}
          </div>
        ) : settlements.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">No hay liquidaciones registradas hoy</p>
            <p className="text-xs text-foreground-muted">Las solicitudes aparecerán cuando los motorizados envíen su cuadre.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 text-foreground-muted font-semibold border-b border-border">
                  <th className="py-3 px-4">Motorizado</th>
                  <th className="py-3 px-3">Efectivo Esperado</th>
                  <th className="py-3 px-3">Efectivo Entregado</th>
                  <th className="py-3 px-3">Gastos Ruta</th>
                  <th className="py-3 px-3">Diferencia</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {settlements.map((s) => {
                  const expCash = s.expected_cash ?? 0
                  const actCash = s.actual_cash ?? 0
                  const expExpenses = s.total_expenses ?? 0
                  const diff = s.difference ?? 0

                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          {s.courier_profile?.display_name || s.courier_profile?.full_name || 'Motorizado'}
                        </div>
                        <div className="text-[10px] text-foreground-muted">{s.settlement_date}</div>
                      </td>

                      <td className="py-3 px-3 font-medium text-foreground">
                        C${expCash.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        C${actCash.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 font-semibold text-amber-600 dark:text-amber-400">
                        C${expExpenses.toFixed(2)}
                      </td>

                      <td className="py-3 px-3">
                        {diff === 0 ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Cuadre exacto (C$0)
                          </span>
                        ) : diff > 0 ? (
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            +C${diff.toFixed(2)} (Sobrante)
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            -C${Math.abs(diff).toFixed(2)} (Faltante)
                          </span>
                        )}
                      </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          s.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}
                      >
                        {(SETTLEMENT_STATUS_LABELS && SETTLEMENT_STATUS_LABELS[s.status]) || s.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setTargetSettlement(s)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        Revisar / Aprobar
                      </button>
                    </td>
                  </tr>
                )
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Arqueo y Aprobación */}
      <ApproveSettlementModal
        settlement={targetSettlement}
        isOpen={!!targetSettlement}
        onClose={() => setTargetSettlement(null)}
      />
    </div>
  )
}
