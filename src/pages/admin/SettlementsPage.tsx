import { useState } from 'react'
import {
  Calendar,
  Calculator,
  CheckCircle2,
  DollarSign,
  Receipt,
  AlertTriangle,
  PhoneOff,
  Eye,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useSettlements } from '@/modules/settlements/hooks/useSettlements'
import { useAllCouriersPendingBalances } from '@/modules/settlements/hooks/usePendingBalances'
import { getWorkdayById } from '@/modules/workdays/services/workdaysService'
import type { Workday } from '@/modules/workdays/types/workdays.types'
import type { SettlementFilters, Settlement } from '@/modules/settlements/types/settlements.types'
import { SETTLEMENT_STATUS_LABELS } from '@/shared/types'
import { ApproveSettlementModal } from '@/modules/settlements/components/ApproveSettlementModal'
import { AdminForceSettlementModal } from '@/modules/settlements/components/AdminForceSettlementModal'
import {
  Card,
  MetricCard,
  Button,
  Badge,
  TableSkeleton,
  EmptyState,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'

export default function AdminSettlementsPage() {
  const { profile } = useAuth()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = getLocalDateString()

  const [filters, setFilters] = useState<SettlementFilters>({
    branch_id: defaultBranchId,
    date: todayStr,
  })

  const [targetSettlement, setTargetSettlement] = useState<Settlement | null>(null)
  const [forceSettlementWorkday, setForceSettlementWorkday] = useState<Workday | null>(null)
  const [loadingWorkdayId, setLoadingWorkdayId] = useState<string | null>(null)

  const { data: settlements = [], isLoading, isError, error } = useSettlements(filters)
  const { data: allPendingBalances = [] } = useAllCouriersPendingBalances(
    filters.branch_id || undefined,
    todayStr
  )

  const handleOpenForceSettlement = async (workdayId: string) => {
    try {
      setLoadingWorkdayId(workdayId)
      const wd = await getWorkdayById(workdayId)
      if (wd) setForceSettlementWorkday(wd)
    } catch (err) {
      console.error('Error opening force settlement:', err)
    } finally {
      setLoadingWorkdayId(null)
    }
  }

  // Métricas Contables Integrales
  const pendingCount = settlements.filter((s) => s.status === 'pending_review').length
  
  const totalCollections = settlements.reduce(
    (acc, s) => acc + (s.cash_summary?.collectionsNIO ?? s.expected_cash),
    0
  )
  const totalExpenses = settlements.reduce(
    (acc, s) => acc + (s.cash_summary?.expensesNIO ?? s.total_expenses),
    0
  )
  const totalAlreadyReceived = settlements.reduce(
    (acc, s) => acc + (s.cash_summary?.alreadyReceivedNIO ?? 0),
    0
  )
  const totalNetExpected = settlements.reduce(
    (acc, s) =>
      acc +
      (s.status === 'approved'
        ? (s.expected_cash ?? 0)
        : s.cash_summary
        ? Math.max(0, s.cash_summary.cashInHandNIO)
        : (s.expected_cash ?? 0)),
    0
  )

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

      {/* ⚠️ ALERTA DE MOTORIZADOS CON SALDOS O CIERRES PENDIENTES DE DÍAS ANTERIORES */}
      {allPendingBalances && allPendingBalances.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-5 shadow-2xs space-y-3.5 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <span>Atención: {allPendingBalances.length} Motorizado(s) con saldos o cierres pendientes de días anteriores</span>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200">
              Total acumulado: C$ {allPendingBalances.reduce((acc, c) => acc + c.totalPendingCash, 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allPendingBalances.map((item) => (
              <div key={item.courierId} className="bg-white border border-amber-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-xs">👤 {item.courierName}</span>
                  <span className="font-mono font-black text-rose-600 text-xs">
                    C$ {item.totalPendingCash.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  {item.breakdown.map((b) => (
                    <div key={b.workDate} className="flex justify-between items-center text-[11px] gap-2">
                      <div className="truncate">
                        <span className="font-mono font-semibold text-slate-800">{b.workDate}:</span>{' '}
                        <span className="text-rose-600 font-bold font-mono">C$ {b.amount.toFixed(2)}</span>
                      </div>
                      {b.workdayId && (
                        <Button
                          onClick={() => handleOpenForceSettlement(b.workdayId!)}
                          variant="outline"
                          size="sm"
                          isLoading={loadingWorkdayId === b.workdayId}
                          leftIcon={<PhoneOff className="h-3 w-3 text-amber-600" />}
                          className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 text-3xs font-bold py-0.5 px-2 shrink-0 h-6"
                          title="Liquidar por contingencia"
                        >
                          Liquidar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas Contables */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Cobros Totales Ruta"
          value={`C$ ${totalCollections.toFixed(2)}`}
          subtitle="Cobrado por motorizados"
          icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          accentColor="success"
        />

        <MetricCard
          title="Gastos y Pagos Ruta"
          value={`-C$ ${totalExpenses.toFixed(2)}`}
          subtitle="Combustible y compras"
          icon={<Receipt className="h-4 w-4 text-rose-600" />}
          accentColor="destructive"
        />

        <MetricCard
          title="Entregas Previas a Caja"
          value={`-C$ ${totalAlreadyReceived.toFixed(2)}`}
          subtitle="Efectivo ya en administración"
          icon={<CheckCircle2 className="h-4 w-4 text-sky-600" />}
          accentColor="primary"
        />

        <MetricCard
          title="Neto Esperado en Caja"
          value={`C$ ${totalNetExpected.toFixed(2)}`}
          subtitle={`${pendingCount} pendiente(s) de revisión`}
          icon={<Calculator className="h-4 w-4 text-[#004594]" />}
          accentColor="primary"
        />
      </div>


      {/* Filtro de Fecha y Selector Rápido */}
      <Card className="p-4 bg-white border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={filters.date || ''}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => setFilters({ ...filters, date: todayStr })}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
              filters.date === todayStr
                ? 'bg-[#004594] text-white border-[#004594] shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => setFilters({ ...filters, date: '' })}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
              !filters.date
                ? 'bg-[#004594] text-white border-[#004594] shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todo el Historial
          </button>
        </div>

        {filters.date ? (
          <span className="text-2xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            Liquidaciones del: <strong className="text-slate-800 font-mono">{filters.date}</strong> {filters.date === todayStr ? '(Hoy)' : ''}
          </span>
        ) : (
          <span className="text-2xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            Mostrando acumulado de todo el historial
          </span>
        )}
      </Card>

      {/* Tabla de Liquidaciones */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton columns={8} rows={5} />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-xs text-rose-600 font-semibold bg-rose-50 border-t border-b border-rose-200">
            Error al cargar liquidaciones: {(error as Error).message}
          </div>
        ) : settlements.length === 0 ? (
          <EmptyState
            title={
              filters.date === todayStr
                ? 'Sin liquidaciones registradas hoy'
                : filters.date
                ? `Sin liquidaciones para la fecha ${filters.date}`
                : 'No hay liquidaciones registradas'
            }
            description={
              filters.date === todayStr
                ? 'Las liquidaciones de hoy aparecerán automáticamente cuando los motorizados envíen su solicitud de cierre de jornada.'
                : 'No se encontraron liquidaciones para el filtro seleccionado.'
            }
            icon={<Calculator className="h-8 w-8 text-slate-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-2xs">
                  <th className="py-3.5 px-4">Motorizado</th>
                  <th className="py-3.5 px-3">Cobros (+)</th>
                  <th className="py-3.5 px-3">Gastos / Pagos (-)</th>
                  <th className="py-3.5 px-3">Entregado Previo (-)</th>
                  <th className="py-3.5 px-3">Neto Esperado (=)</th>
                  <th className="py-3.5 px-3">Entregado Físico</th>
                  <th className="py-3.5 px-3">Diferencia</th>
                  <th className="py-3.5 px-3">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map((s) => {
                  const summary = s.cash_summary
                  const collections = summary?.collectionsNIO ?? s.expected_cash
                  const expenses = summary?.expensesNIO ?? s.total_expenses
                  const alreadyReceived = summary?.alreadyReceivedNIO ?? 0
                  const expNetCash = s.expected_cash ?? 0
                  const actCash = s.actual_cash ?? 0
                  const diff = s.difference ?? 0

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {s.courier_profile?.display_name || s.courier_profile?.full_name || 'Motorizado'}
                        </div>
                        <div className="text-2xs text-slate-400 font-mono">{s.settlement_date}</div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-emerald-700 font-mono">
                        +C$ {collections.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 font-semibold text-rose-600 font-mono">
                        {expenses > 0 ? `-C$ ${expenses.toFixed(2)}` : 'C$ 0.00'}
                      </td>

                      <td className="py-3 px-3 font-semibold text-sky-700 font-mono">
                        {alreadyReceived > 0 ? `-C$ ${alreadyReceived.toFixed(2)}` : 'C$ 0.00'}
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900 font-mono bg-slate-50/60">
                        C$ {expNetCash.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 font-bold text-emerald-700 font-mono">
                        C$ {actCash.toFixed(2)}
                      </td>

                      <td className="py-3 px-3">
                        {diff === 0 ? (
                          <span className="text-2xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Cuadre exacto (C$0)
                          </span>
                        ) : diff > 0 ? (
                          <div className="space-y-0.5">
                            <span className="text-2xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 inline-block">
                              +C$ {diff.toFixed(2)} (Sobrante)
                            </span>
                            {s.status === 'approved' && (
                              <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]" title={s.notes || ''}>
                                {s.notes ? s.notes : 'Ajuste registrado'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-2xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 inline-block">
                              -C$ {Math.abs(diff).toFixed(2)} (Faltante)
                            </span>
                            {s.status === 'approved' && (
                              <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]" title={s.notes || ''}>
                                {s.notes ? s.notes : 'Ajuste registrado'}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <Badge
                            variant={s.status === 'approved' ? 'completed' : 'pending'}
                            size="sm"
                          >
                            {(SETTLEMENT_STATUS_LABELS && SETTLEMENT_STATUS_LABELS[s.status]) || s.status}
                          </Badge>
                          {s.status === 'approved' && Math.abs(diff) > 0.001 && (
                            <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Cerrado c/ Ajuste
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          onClick={() => setTargetSettlement(s)}
                          variant={s.status === 'approved' ? 'outline' : 'primary'}
                          size="sm"
                          leftIcon={
                            s.status === 'approved' ? (
                              <Eye className="h-3.5 w-3.5 text-slate-600" />
                            ) : (
                              <Calculator className="h-3.5 w-3.5" />
                            )
                          }
                          className={
                            s.status === 'approved'
                              ? 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-2xs font-bold shadow-2xs'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent text-2xs font-bold'
                          }
                        >
                          {s.status === 'approved' ? 'Ver Arqueo' : 'Revisar / Aprobar'}
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

      {/* Modal Liquidación Administrativa por Contingencia */}
      <AdminForceSettlementModal
        workday={forceSettlementWorkday}
        isOpen={!!forceSettlementWorkday}
        onClose={() => setForceSettlementWorkday(null)}
      />
    </div>
  )
}

