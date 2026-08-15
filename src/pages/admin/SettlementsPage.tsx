import { useState } from 'react'
import {
  Calendar,
  Calculator,
  CheckCircle2,
  Clock,
  DollarSign,
  ListFilter,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useSettlements } from '@/modules/settlements/hooks/useSettlements'
import type { SettlementFilters, Settlement } from '@/modules/settlements/types/settlements.types'
import { SETTLEMENT_STATUS_LABELS } from '@/shared/types'
import { ApproveSettlementModal } from '@/modules/settlements/components/ApproveSettlementModal'
import {
  Card,
  MetricCard,
  Button,
  Badge,
  TableSkeleton,
  EmptyState,
} from '@/shared/components/ui'

export default function AdminSettlementsPage() {
  const { profile } = useAuth()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Liquidaciones & Arqueo de Caja</h1>
          <p className="text-xs text-slate-500">
            Audita el cuadre financiero de los motorizados y aprueba las liquidaciones de turno.
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Liquidaciones"
          value={settlements.length}
          subtitle="Registradas para la fecha"
          icon={<ListFilter className="h-4 w-4 text-accent" />}
          accentColor="accent"
        />

        <MetricCard
          title="Pendientes Revisión"
          value={pendingCount}
          subtitle="Requieren auditoría en caja"
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          accentColor="warning"
        />

        <MetricCard
          title="Aprobadas"
          value={approvedCount}
          subtitle="Cuadre verificado exitosamente"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          accentColor="success"
        />

        <MetricCard
          title="Recaudación Total"
          value={`C$ ${totalCollected.toFixed(2)}`}
          subtitle="Ingresado a caja sucursal"
          icon={<DollarSign className="h-4 w-4 text-purple-600" />}
          accentColor="primary"
        />
      </div>

      {/* Filtro de Fecha */}
      <Card className="p-4 bg-white border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="relative w-full sm:w-48">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={filters.date || ''}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
          />
        </div>
      </Card>

      {/* Tabla de Liquidaciones */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton columns={7} rows={5} />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-xs text-rose-600 font-semibold bg-rose-50 border-t border-b border-rose-200">
            Error al cargar liquidaciones: {(error as Error).message}
          </div>
        ) : settlements.length === 0 ? (
          <EmptyState
            title="No hay liquidaciones registradas hoy"
            description="Las solicitudes aparecerán automáticamente cuando los motorizados envíen su cuadre de turno."
            icon={<Calculator className="h-8 w-8 text-slate-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-2xs">
                  <th className="py-3.5 px-4">Motorizado</th>
                  <th className="py-3.5 px-3">Efectivo Esperado</th>
                  <th className="py-3.5 px-3">Efectivo Entregado</th>
                  <th className="py-3.5 px-3">Gastos Ruta</th>
                  <th className="py-3.5 px-3">Diferencia</th>
                  <th className="py-3.5 px-3">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map((s) => {
                  const expCash = s.expected_cash ?? 0
                  const actCash = s.actual_cash ?? 0
                  const expExpenses = s.total_expenses ?? 0
                  const diff = s.difference ?? 0

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {s.courier_profile?.display_name || s.courier_profile?.full_name || 'Motorizado'}
                        </div>
                        <div className="text-2xs text-slate-400 font-mono">{s.settlement_date}</div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-900">
                        C$ {expCash.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 font-bold text-emerald-600">
                        C$ {actCash.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 font-semibold text-amber-600">
                        C$ {expExpenses.toFixed(2)}
                      </td>

                      <td className="py-3 px-3">
                        {diff === 0 ? (
                          <span className="text-2xs font-bold text-emerald-600">
                            Cuadre exacto (C$0)
                          </span>
                        ) : diff > 0 ? (
                          <span className="text-2xs font-bold text-sky-600">
                            +C$ {diff.toFixed(2)} (Sobrante)
                          </span>
                        ) : (
                          <span className="text-2xs font-bold text-rose-600">
                            -C$ {Math.abs(diff).toFixed(2)} (Faltante)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <Badge
                          variant={s.status === 'approved' ? 'completed' : 'pending'}
                          size="sm"
                        >
                          {(SETTLEMENT_STATUS_LABELS && SETTLEMENT_STATUS_LABELS[s.status]) || s.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          onClick={() => setTargetSettlement(s)}
                          variant="primary"
                          size="sm"
                          leftIcon={<Calculator className="h-3.5 w-3.5" />}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent text-2xs font-bold"
                        >
                          Revisar / Aprobar
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Arqueo y Aprobación */}
      <ApproveSettlementModal
        settlement={targetSettlement}
        isOpen={!!targetSettlement}
        onClose={() => setTargetSettlement(null)}
      />
    </div>
  )
}
