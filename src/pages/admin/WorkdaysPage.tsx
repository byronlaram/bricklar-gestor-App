import { useState, useMemo } from 'react'
import {
  Calendar,
  Clock,
  Gauge,
  HandCoins,
  CheckCircle2,
  Play,
  ListFilter,
  AlertCircle,
  PhoneOff,
  DollarSign,
  Receipt,
  Calculator,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useWorkdays } from '@/modules/workdays/hooks/useWorkday'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import type { WorkdayFilters, Workday } from '@/modules/workdays/types/workdays.types'
import { WORKDAY_STATUS_LABELS } from '@/shared/types'
import { ReceiveCashModal } from '@/modules/settlements/components/ReceiveCashModal'
import { DeliverCashModal } from '@/modules/settlements/components/DeliverCashModal'
import { AdminForceSettlementModal } from '@/modules/settlements/components/AdminForceSettlementModal'
import {
  Card,
  MetricCard,
  Button,
  Avatar,
  Badge,
  TableSkeleton,
  EmptyState,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'

export default function AdminWorkdaysPage() {
  const { profile } = useAuth()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = getLocalDateString()

  const [filters, setFilters] = useState<WorkdayFilters>({
    branch_id: defaultBranchId,
    date: todayStr,
  })

  const [receiveCashWorkday, setReceiveCashWorkday] = useState<Workday | null>(null)
  const [forceSettlementWorkday, setForceSettlementWorkday] = useState<Workday | null>(null)
  const [isGlobalDeliverCashOpen, setIsGlobalDeliverCashOpen] = useState(false)

  const { data: workdays = [], isLoading, isError, error } = useWorkdays(filters)
  const { data: tasksData } = useTasks({
    branch_id: filters.branch_id || undefined,
    date: filters.date || undefined,
    page_size: 200,
  })

  const allTasks = tasksData?.data || []

  // Métricas Operativas
  const openCount = workdays.filter((w) => w.status === 'open').length
  const pendingSettlementCount = workdays.filter((w) => w.status === 'pending_settlement').length
  const closedCount = workdays.filter((w) => w.status === 'closed' || w.status === 'reviewed').length

  // Métricas Financieras (Solo Efectivo)
  const financialSummary = useMemo(() => {
    // 1. Fondos Asignados por Administración
    const totalInitialCashNIO = workdays.reduce(
      (acc, w) => acc + (w.cash_summary?.initialCashNIO ?? w.initial_cash ?? 0),
      0
    )
    const totalAdvancesNIO = workdays.reduce(
      (acc, w) => acc + (w.cash_summary?.advancesNIO ?? 0),
      0
    )
    const totalAdminFundsNIO = totalInitialCashNIO + totalAdvancesNIO

    // 2. Cobros a Clientes (Solo Efectivo)
    const cashCollectionTasks = allTasks.filter(
      (t) => t.requires_collection && (!t.expected_payment_method || t.expected_payment_method === 'cash')
    )
    const projectedCollectionsNIO = cashCollectionTasks.reduce(
      (acc, t) => acc + (t.expected_collection_amount || 0),
      0
    )
    const completedCollectionsNIO = cashCollectionTasks
      .filter((t) => t.status === 'completed')
      .reduce((acc, t) => acc + (t.expected_collection_amount || 0), 0)

    // 3. Pagos y Compras en Calle (Solo Efectivo)
    const cashPaymentTasks = allTasks.filter(
      (t) => t.requires_payment && (!t.expected_payment_method || t.expected_payment_method === 'cash')
    )
    const projectedPaymentsNIO = cashPaymentTasks.reduce(
      (acc, t) => acc + (t.expected_payment_amount || 0),
      0
    )
    const completedPaymentsNIO = cashPaymentTasks
      .filter((t) => t.status === 'completed')
      .reduce((acc, t) => acc + (t.expected_payment_amount || 0), 0)

    // 4. Entregado Previo a Oficina
    const totalAlreadyReceivedNIO = workdays.reduce(
      (acc, w) => acc + (w.cash_summary?.alreadyReceivedNIO ?? 0),
      0
    )

    // 5. Efectivo en Mano en Calle en este momento
    const liveCashInHandNIO = workdays.reduce(
      (acc, w) => acc + (w.cash_summary?.cashInHandNIO ?? 0),
      0
    )

    // 6. Neto Proyectado a Recibir al Cierre
    const netProjectedCashNIO =
      totalAdminFundsNIO + projectedCollectionsNIO - projectedPaymentsNIO - totalAlreadyReceivedNIO

    const collectionProgressPct =
      projectedCollectionsNIO > 0
        ? Math.round((completedCollectionsNIO / projectedCollectionsNIO) * 100)
        : 0

    return {
      totalInitialCashNIO,
      totalAdvancesNIO,
      totalAdminFundsNIO,
      projectedCollectionsNIO,
      completedCollectionsNIO,
      collectionProgressPct,
      projectedPaymentsNIO,
      completedPaymentsNIO,
      totalAlreadyReceivedNIO,
      liveCashInHandNIO,
      netProjectedCashNIO,
    }
  }, [workdays, allTasks])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header y Acción Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Control de Jornadas & Flujo de Efectivo</h1>
          <p className="text-xs text-slate-500">
            Monitorea los turnos de trabajo, fondos iniciales, cobros proyectados y dinero en calle en tiempo real.
          </p>
        </div>

        <Button
          onClick={() => setIsGlobalDeliverCashOpen(true)}
          variant="primary"
          size="md"
          leftIcon={<HandCoins className="h-4 w-4" />}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shrink-0 font-semibold cursor-pointer"
        >
          + Entregar Efectivo
        </Button>
      </div>

      {/* 📊 Tarjetas de Flujo Financiero Proyectado y en Vivo (Solo Efectivo) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Fondos Entregados Admin"
          value={`C$ ${financialSummary.totalAdminFundsNIO.toFixed(2)}`}
          subtitle={`Inicial: C$ ${financialSummary.totalInitialCashNIO.toFixed(2)} | Entregas: C$ ${financialSummary.totalAdvancesNIO.toFixed(2)}`}
          icon={<HandCoins className="h-4 w-4 text-indigo-600" />}
          accentColor="accent"
        />

        <MetricCard
          title="Cobros Proyectados (Ruta)"
          value={`+C$ ${financialSummary.projectedCollectionsNIO.toFixed(2)}`}
          subtitle={`Ya cobrado: C$ ${financialSummary.completedCollectionsNIO.toFixed(2)} (${financialSummary.collectionProgressPct}%)`}
          icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          accentColor="success"
        />

        <MetricCard
          title="Compras / Pagos en Ruta"
          value={`-C$ ${financialSummary.projectedPaymentsNIO.toFixed(2)}`}
          subtitle={`Ya desembolsado: -C$ ${financialSummary.completedPaymentsNIO.toFixed(2)}`}
          icon={<Receipt className="h-4 w-4 text-rose-600" />}
          accentColor="destructive"
        />

        <MetricCard
          title="Neto Proyectado al Cierre"
          value={`C$ ${financialSummary.netProjectedCashNIO.toFixed(2)}`}
          subtitle={`En mano en calle ahora: C$ ${financialSummary.liveCashInHandNIO.toFixed(2)}`}
          icon={<Calculator className="h-4 w-4 text-purple-600" />}
          accentColor="primary"
        />
      </div>

      {/* 🛵 Sub-barra de Estado de Jornadas Laborales */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-600 font-medium">
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs">
            <ListFilter className="h-3.5 w-3.5 text-slate-500" />
            Total Turnos: <strong className="text-slate-900 font-mono">{workdays.length}</strong>
          </span>
          <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-full shadow-2xs font-bold">
            <Play className="h-3 w-3 text-emerald-600 fill-current" />
            {openCount} en turno activo
          </span>
          <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-full shadow-2xs font-bold">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            {pendingSettlementCount} pendientes de liquidar
          </span>
          <span className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
            {closedCount} cerradas / revisadas
          </span>
        </div>
      </div>

      {/* Filtros de Fecha y Estado */}
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

          <div className="w-full sm:w-44">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
            >
              <option value="">Todos los estados</option>
              <option value="open">Abierta</option>
              <option value="pending_settlement">Pendiente Liquidación</option>
              <option value="closed">Cerrada</option>
            </select>
          </div>
        </div>

        {filters.date ? (
          <span className="text-2xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            Jornadas del: <strong className="text-slate-800 font-mono">{filters.date}</strong> {filters.date === todayStr ? '(Hoy)' : ''}
          </span>
        ) : (
          <span className="text-2xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            Mostrando acumulado de todo el historial
          </span>
        )}
      </Card>

      {/* Tabla de Jornadas */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton columns={6} rows={5} />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-xs text-rose-600 font-semibold bg-rose-50 border-t border-b border-rose-200">
            Error al cargar jornadas: {(error as Error).message}
          </div>
        ) : workdays.length === 0 ? (
          <EmptyState
            title="No hay jornadas registradas para esta fecha"
            description="Los motorizados aparecerán automáticamente al iniciar su turno desde la app móvil o al recibir fondo inicial."
            icon={<Clock className="h-8 w-8 text-slate-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-2xs">
                  <th className="py-3.5 px-4">Motorizado</th>
                  <th className="py-3.5 px-3">Fecha & Inicio</th>
                  <th className="py-3.5 px-3">Kilometraje</th>
                  <th className="py-3.5 px-3">Fondos</th>
                  <th className="py-3.5 px-3">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workdays.map((w) => {
                  const kmTraveled =
                    w.final_km && w.initial_km ? w.final_km - w.initial_km : null

                  const summary = w.cash_summary
                  const initialNIO = summary?.initialCashNIO ?? w.initial_cash ?? 0
                  const initialUSD = summary?.initialCashUSD ?? 0
                  const cashInHandNIO = summary?.cashInHandNIO ?? initialNIO
                  const cashInHandUSD = summary?.cashInHandUSD ?? initialUSD
                  const isDiscrepancy = summary?.isDiscrepancyNIO || summary?.isDiscrepancyUSD
                  const isZeroBalance = summary ? (summary.isFullyDeliveredNIO && summary.isFullyDeliveredUSD) : cashInHandNIO === 0

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={w.courier_profile?.full_name || 'Motorizado'} size="sm" />
                          <div>
                            <div className="font-semibold text-slate-900">
                              {w.courier_profile?.display_name || w.courier_profile?.full_name}
                            </div>
                            {w.courier_profile?.phone && (
                              <div className="text-2xs text-slate-400 font-mono">{w.courier_profile.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{w.work_date}</div>
                        <div className="text-2xs text-slate-400 font-medium">
                          Inicio: {w.start_time ? new Date(w.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {w.initial_km !== null && w.initial_km !== undefined ? (
                          <div className="flex items-center gap-1 font-semibold text-slate-900">
                            <Gauge className="h-3.5 w-3.5 text-accent" />
                            Inicial: {w.initial_km} km
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                              <Gauge className="h-3.5 w-3.5 text-amber-500" />
                              <span>Inicial: No disponible</span>
                            </div>
                            {w.notes?.includes('[Kilometraje No Disponible]') && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium truncate max-w-[150px]">
                                {w.notes.match(/Motivo:\s*([^|]+)/)?.[1]?.trim() || 'Declarado por motorizado'}
                              </div>
                            )}
                          </div>
                        )}
                        {w.final_km !== null && w.final_km !== undefined ? (
                          <div className="text-2xs text-emerald-600 font-bold">
                            Final: {w.final_km} km ({kmTraveled} km recorridos)
                          </div>
                        ) : (
                          <div className="text-2xs text-slate-400 italic">En recorrido...</div>
                        )}
                      </td>

                      <td className="py-3 px-3 min-w-[170px]">
                        <div className="space-y-0.5">
                          <div className="text-2xs text-slate-500 font-medium">
                            Inicial:{' '}
                            <span className="font-semibold text-slate-700 font-mono">
                              C$ {initialNIO.toFixed(2)}
                            </span>
                            {initialUSD > 0 && (
                              <span className="font-semibold text-slate-700 font-mono ml-1.5">
                                | US$ {initialUSD.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {isDiscrepancy ? (
                            <div className="text-xs font-extrabold text-rose-600 flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>Revisar saldo</span>
                            </div>
                          ) : (
                            <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-600 font-bold">En Mano:</span>
                              <span className="font-mono text-emerald-700 text-sm">
                                C$ {cashInHandNIO.toFixed(2)}
                              </span>
                              {cashInHandUSD > 0 && (
                                <span className="font-mono text-emerald-700 text-sm">
                                  | US$ {cashInHandUSD.toFixed(2)}
                                </span>
                              )}
                              {isZeroBalance && (
                                <Badge variant="completed" size="sm" className="text-3xs py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                  Fondos entregados
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <Badge
                          variant={w.status === 'open' ? 'completed' : w.status === 'pending_settlement' ? 'pending' : 'neutral'}
                          size="sm"
                        >
                          {(WORKDAY_STATUS_LABELS && WORKDAY_STATUS_LABELS[w.status]) || w.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => setReceiveCashWorkday(w)}
                            variant="primary"
                            size="sm"
                            leftIcon={<HandCoins className="h-3.5 w-3.5" />}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent text-2xs font-bold"
                          >
                            Recibir Efectivo
                          </Button>
                          {(w.status === 'open' || w.status === 'pending_settlement') && (
                            <Button
                              onClick={() => setForceSettlementWorkday(w)}
                              variant="outline"
                              size="sm"
                              leftIcon={<PhoneOff className="h-3.5 w-3.5 text-amber-600" />}
                              className="border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100/90 text-2xs font-bold shadow-2xs"
                              title="Liquidar jornada directamente en caso de que el motorizado tenga el celular apagado o dañado"
                            >
                              Liquidar (Contingencia)
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal para Entregar Efectivo al Motorizado (Administración -> Motorizado) */}
      <DeliverCashModal
        branchId={filters.branch_id || defaultBranchId}
        isOpen={isGlobalDeliverCashOpen}
        onClose={() => setIsGlobalDeliverCashOpen(false)}
      />

      {/* Modal para Recibir Efectivo del Motorizado (Motorizado -> Administración) */}
      <ReceiveCashModal
        branchId={filters.branch_id || defaultBranchId}
        workdayId={receiveCashWorkday?.id}
        courierName={receiveCashWorkday?.courier_profile?.display_name || receiveCashWorkday?.courier_profile?.full_name}
        isOpen={!!receiveCashWorkday}
        onClose={() => setReceiveCashWorkday(null)}
      />

      {/* Modal para Liquidación Administrativa por Contingencia */}
      <AdminForceSettlementModal
        workday={forceSettlementWorkday}
        isOpen={!!forceSettlementWorkday}
        onClose={() => setForceSettlementWorkday(null)}
      />
    </div>
  )
}

