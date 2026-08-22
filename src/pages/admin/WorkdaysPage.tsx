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
  Building2,
  History,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Layers,
  Banknote,
  RotateCcw,
  Wallet,
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useAuth } from '@/modules/auth/useAuth'
import { useWorkdays } from '@/modules/workdays/hooks/useWorkday'
import { useCashMovements } from '@/modules/workdays/hooks/useCashMovements'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import type { WorkdayFilters, Workday } from '@/modules/workdays/types/workdays.types'
import { WORKDAY_STATUS_LABELS } from '@/shared/types'
import { ReceiveCashModal } from '@/modules/settlements/components/ReceiveCashModal'
import { DeliverCashModal } from '@/modules/settlements/components/DeliverCashModal'
import { AdminForceSettlementModal } from '@/modules/settlements/components/AdminForceSettlementModal'
import { WorkdayMovementsModal } from '@/modules/workdays/components/WorkdayMovementsModal'
import { VoidMovementModal } from '@/modules/workdays/components/VoidMovementModal'
import { FinancialSummaryDetailModal, type FinancialCardType } from '@/modules/workdays/components/FinancialSummaryDetailModal'
import type { DetailedCashMovement } from '@/modules/workdays/services/workdaysService'
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

  const [activeTab, setActiveTab] = useState<'workdays' | 'ledger'>('workdays')
  const [viewMode, setViewMode] = useState<'projected' | 'live'>('projected')
  const [filters, setFilters] = useState<WorkdayFilters>({
    branch_id: defaultBranchId,
    date: todayStr,
  })

  const [selectedCardDetail, setSelectedCardDetail] = useState<FinancialCardType | null>(null)
  const [receiveCashWorkday, setReceiveCashWorkday] = useState<Workday | null>(null)
  const [forceSettlementWorkday, setForceSettlementWorkday] = useState<Workday | null>(null)
  const [viewMovementsWorkday, setViewMovementsWorkday] = useState<Workday | null>(null)
  const [voidTargetMovement, setVoidTargetMovement] = useState<DetailedCashMovement | null>(null)
  const [isGlobalDeliverCashOpen, setIsGlobalDeliverCashOpen] = useState(false)

  const { data: branches = [] } = useBranches()
  const { data: workdays = [], isLoading, isError, error } = useWorkdays(filters)
  const {
    data: ledgerMovements = [],
    isLoading: isLoadingLedger,
    isError: isErrorLedger,
  } = useCashMovements({
    date: filters.date || undefined,
    branch_id: filters.branch_id || undefined,
  })
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
    let completedCollectionsNIO = 0
    let projectedCollectionsNIO = 0

    allTasks.forEach((t) => {
      if (!t.requires_collection) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      const isCompleted = t.status === 'completed'

      if (isCompleted) {
        const cashAmt =
          pb && typeof pb.cash_amount === 'number'
            ? pb.cash_amount
            : (!t.expected_payment_method || t.expected_payment_method === 'cash')
            ? t.expected_collection_amount || 0
            : 0
        completedCollectionsNIO += cashAmt
        projectedCollectionsNIO += cashAmt
      } else {
        const expAmt =
          !t.expected_payment_method || t.expected_payment_method === 'cash'
            ? t.expected_collection_amount || 0
            : 0
        projectedCollectionsNIO += expAmt
      }
    })

    // 3. Pagos y Compras en Calle (Solo Efectivo)
    let completedPaymentsNIO = 0
    let projectedPaymentsNIO = 0

    allTasks.forEach((t) => {
      if (!t.requires_payment) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      const isCompleted = t.status === 'completed'

      if (isCompleted) {
        const isCash = !pb?.paid_method || pb?.paid_method === 'cash'
        const paidAmt = isCash
          ? pb && typeof pb.actual_paid_amount === 'number'
            ? pb.actual_paid_amount
            : t.expected_payment_amount || 0
          : 0
        completedPaymentsNIO += paidAmt
        projectedPaymentsNIO += paidAmt
      } else {
        const expAmt =
          !t.expected_payment_method || t.expected_payment_method === 'cash'
            ? t.expected_payment_amount || 0
            : 0
        projectedPaymentsNIO += expAmt
      }
    })

    // 4. Entregado Previo a Oficina
    const totalAlreadyReceivedNIO = workdays.reduce(
      (acc, w) => acc + (w.cash_summary?.alreadyReceivedNIO ?? 0),
      0
    )

    // 5. Efectivo en Mano en Calle en este momento
    const liveCashInHandNIO =
      workdays.length > 0
        ? workdays.reduce((acc, w) => acc + (w.cash_summary?.cashInHandNIO ?? 0), 0)
        : totalAdminFundsNIO + completedCollectionsNIO - completedPaymentsNIO - totalAlreadyReceivedNIO

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

      {/* 🔮/⚡ Selector de Perspectiva Financiera: Proyección vs Real en Mano */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center font-extrabold transition-all shrink-0 shadow-2xs',
              viewMode === 'projected'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
            )}
          >
            {viewMode === 'projected' ? (
              <Calculator className="h-5 w-5" />
            ) : (
              <Wallet className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              <span>
                {viewMode === 'projected'
                  ? 'Perspectiva: Proyección al Cierre de Jornada'
                  : 'Perspectiva: Efectivo Real en Mano (En Vivo)'}
              </span>
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider border transition-colors',
                  viewMode === 'projected'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse'
                )}
              >
                {viewMode === 'projected' ? '🔮 Fin de Día' : '⚡ En Calle Ahora'}
              </span>
            </div>
            <p className="text-2xs text-slate-500 font-medium">
              {viewMode === 'projected'
                ? 'Calcula el balance final estimado incluyendo todas las gestiones pendientes de cobro y compra en ruta.'
                : 'Muestra únicamente el dinero físico que los motorizados han cobrado, desembolsado y poseen en mano en este momento.'}
            </p>
          </div>
        </div>

        {/* Switch de Perspectiva */}
        <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('projected')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              viewMode === 'projected'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Proyectado (Cierre)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('live')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              viewMode === 'live'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Real en Mano (En Vivo)</span>
          </button>
        </div>
      </div>

      {/* 📊 Tarjetas de Flujo Financiero Dinámicas (Proyectado vs Real en Vivo) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Fondos Entregados Admin"
          value={`C$ ${financialSummary.totalAdminFundsNIO.toFixed(2)}`}
          subtitle={
            <div className="space-y-1">
              <div>Inicial: C$ {financialSummary.totalInitialCashNIO.toFixed(2)} | Entregas: C$ {financialSummary.totalAdvancesNIO.toFixed(2)}</div>
              <span className="inline-flex items-center text-[10px] font-extrabold text-indigo-700 hover:underline">
                Ver detalle ↗
              </span>
            </div>
          }
          icon={<HandCoins className="h-4 w-4 text-indigo-600" />}
          accentColor="accent"
          isHoverable
          onClick={() => setSelectedCardDetail('funds')}
          className="cursor-pointer group hover:scale-[1.01] hover:border-indigo-300 transition-all"
        />

        <MetricCard
          title={viewMode === 'projected' ? 'Cobros Proyectados (Ruta)' : 'Cobros Realizados (Efectivos)'}
          value={
            viewMode === 'projected'
              ? `+C$ ${financialSummary.projectedCollectionsNIO.toFixed(2)}`
              : `+C$ ${financialSummary.completedCollectionsNIO.toFixed(2)}`
          }
          subtitle={
            <div className="space-y-1">
              <div>
                {viewMode === 'projected'
                  ? `Ya cobrado: C$ ${financialSummary.completedCollectionsNIO.toFixed(2)} (${financialSummary.collectionProgressPct}%)`
                  : `De +C$ ${financialSummary.projectedCollectionsNIO.toFixed(2)} proyectados (${financialSummary.collectionProgressPct}%)`}
              </div>
              <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-700 hover:underline">
                Ver detalle ↗
              </span>
            </div>
          }
          icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          accentColor="success"
          isHoverable
          onClick={() => setSelectedCardDetail('collections')}
          className="cursor-pointer group hover:scale-[1.01] hover:border-emerald-300 transition-all"
        />

        <MetricCard
          title={viewMode === 'projected' ? 'Compras / Pagos en Ruta' : 'Compras / Pagos Ejecutados'}
          value={
            viewMode === 'projected'
              ? `-C$ ${financialSummary.projectedPaymentsNIO.toFixed(2)}`
              : `-C$ ${financialSummary.completedPaymentsNIO.toFixed(2)}`
          }
          subtitle={
            <div className="space-y-1">
              <div>
                {viewMode === 'projected'
                  ? `Ya desembolsado: -C$ ${financialSummary.completedPaymentsNIO.toFixed(2)}`
                  : `De -C$ ${financialSummary.projectedPaymentsNIO.toFixed(2)} presupuestados`}
              </div>
              <span className="inline-flex items-center text-[10px] font-extrabold text-rose-700 hover:underline">
                Ver detalle ↗
              </span>
            </div>
          }
          icon={<Receipt className="h-4 w-4 text-rose-600" />}
          accentColor="destructive"
          isHoverable
          onClick={() => setSelectedCardDetail('payments')}
          className="cursor-pointer group hover:scale-[1.01] hover:border-rose-300 transition-all"
        />

        <MetricCard
          title={viewMode === 'projected' ? 'Neto Proyectado al Cierre' : 'Efectivo Real en Mano Ahora'}
          value={
            viewMode === 'projected'
              ? `C$ ${financialSummary.netProjectedCashNIO.toFixed(2)}`
              : `C$ ${financialSummary.liveCashInHandNIO.toFixed(2)}`
          }
          subtitle={
            <div className="space-y-1">
              <div>
                {viewMode === 'projected'
                  ? `En mano en calle ahora: C$ ${financialSummary.liveCashInHandNIO.toFixed(2)}`
                  : `Neto proyectado al cierre: C$ ${financialSummary.netProjectedCashNIO.toFixed(2)}`}
              </div>
              <span
                className={cn(
                  'inline-flex items-center text-[10px] font-extrabold hover:underline',
                  viewMode === 'projected' ? 'text-purple-700' : 'text-emerald-700'
                )}
              >
                Ver arqueo ↗
              </span>
            </div>
          }
          icon={
            viewMode === 'projected' ? (
              <Calculator className="h-4 w-4 text-purple-600" />
            ) : (
              <Wallet className="h-4 w-4 text-emerald-600" />
            )
          }
          accentColor={viewMode === 'projected' ? 'primary' : 'success'}
          isHoverable
          onClick={() => setSelectedCardDetail('net')}
          className="cursor-pointer group hover:scale-[1.01] hover:border-purple-300 transition-all"
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

          {/* Selector de Sucursal */}
          <div className="relative w-full sm:w-48">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={filters.branch_id || ''}
              onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
            >
              <option value="">Todas las sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
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

      {/* 📑 Selector de Pestañas: Turnos vs Libro Diario de Movimientos */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('workdays')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'workdays'
              ? 'bg-[#004594] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          Turnos & Saldos ({workdays.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-[#004594] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="h-4 w-4" />
          Libro Diario de Movimientos ({ledgerMovements.length})
        </button>
      </div>

      {/* ─── PESTAÑA 1: Turnos & Saldos por Motorizado ─── */}
      {activeTab === 'workdays' && (
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
                    const isZeroBalance = summary
                      ? summary.isFullyDeliveredNIO && summary.isFullyDeliveredUSD
                      : cashInHandNIO === 0

                    return (
                      <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={w.courier_profile?.full_name || 'Motorizado'}
                              size="sm"
                            />
                            <div>
                              <div className="font-semibold text-slate-900">
                                {w.courier_profile?.display_name || w.courier_profile?.full_name}
                              </div>
                              <div className="flex items-center gap-2 text-2xs text-slate-400 mt-0.5">
                                {w.branch?.name && (
                                  <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                                    <Building2 className="h-2.5 w-2.5 text-slate-400" />
                                    {w.branch.name}
                                  </span>
                                )}
                                {w.courier_profile?.phone && (
                                  <span className="font-mono">{w.courier_profile.phone}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{w.work_date}</div>
                          <div className="text-2xs text-slate-400 font-medium">
                            Inicio:{' '}
                            {w.start_time
                              ? new Date(w.start_time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
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
                                  {w.notes.match(/Motivo:\s*([^|]+)/)?.[1]?.trim() ||
                                    'Declarado por motorizado'}
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
                                  <Badge
                                    variant="completed"
                                    size="sm"
                                    className="text-3xs py-0 bg-emerald-50 text-emerald-700 border-emerald-200"
                                  >
                                    Fondos entregados
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              w.status === 'open'
                                ? 'completed'
                                : w.status === 'pending_settlement'
                                ? 'pending'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {(WORKDAY_STATUS_LABELS && WORKDAY_STATUS_LABELS[w.status]) || w.status}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Botón Ver Movimientos Individuales */}
                            <Button
                              onClick={() => setViewMovementsWorkday(w)}
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="h-3.5 w-3.5 text-blue-600" />}
                              className="border-slate-200 text-slate-700 bg-white hover:bg-blue-50 text-2xs font-bold shadow-2xs"
                              title="Ver historial de flujo de caja de esta jornada"
                            >
                              Movimientos
                            </Button>

                            {w.status === 'open' && (
                              <Button
                                onClick={() => setReceiveCashWorkday(w)}
                                variant="primary"
                                size="sm"
                                leftIcon={<HandCoins className="h-3.5 w-3.5" />}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent text-2xs font-bold"
                              >
                                Recibir Efectivo
                              </Button>
                            )}
                            {w.status === 'pending_settlement' && (
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
      )}

      {/* ─── PESTAÑA 2: Libro Diario de Movimientos (Kardex en Vivo) ─── */}
      {activeTab === 'ledger' && (
        <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
          {isLoadingLedger ? (
            <div className="p-4">
              <TableSkeleton columns={6} rows={5} />
            </div>
          ) : isErrorLedger ? (
            <div className="py-12 text-center text-xs text-rose-600 font-semibold bg-rose-50 border-t border-b border-rose-200">
              Error al cargar movimientos de caja.
            </div>
          ) : ledgerMovements.length === 0 ? (
            <EmptyState
              title="No hay movimientos registrados para esta fecha"
              description="Cada entrega de efectivo, fondo inicial, cobro de cliente o devolución en oficina aparecerá aquí en tiempo real."
              icon={<Banknote className="h-8 w-8 text-slate-400" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-2xs">
                    <th className="py-3.5 px-4">Fecha & Hora</th>
                    <th className="py-3.5 px-3">Motorizado & Sucursal</th>
                    <th className="py-3.5 px-3">Tipo de Operación</th>
                    <th className="py-3.5 px-3">Concepto / Descripción</th>
                    <th className="py-3.5 px-3">Método</th>
                    <th className="py-3.5 px-4 text-right">Monto</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerMovements.map((m) => {
                    const isIncome = m.direction === 'income'
                    const isVoided = (m.description || '').includes('[ANULADO]')
                    const dateObj = new Date(m.created_at)
                    const timeStr = dateObj.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                    const dateStr = dateObj.toISOString().slice(0, 10)

                    return (
                      <tr
                        key={m.id}
                        className={`transition-colors ${
                          isVoided ? 'bg-rose-50/30 opacity-70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Fecha & Hora */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 font-mono text-2xs">
                            {dateStr}
                          </div>
                          <div className="text-2xs text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {timeStr}
                          </div>
                        </td>

                        {/* Motorizado & Sucursal */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              name={m.courier_profile?.full_name || 'Motorizado'}
                              size="sm"
                            />
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                {m.courier_profile?.display_name ||
                                  m.courier_profile?.full_name ||
                                  'Motorizado'}
                              </p>
                              {m.workday?.branch?.name && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium mt-0.5">
                                  <Building2 className="h-2.5 w-2.5 text-slate-400" />
                                  {m.workday.branch.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tipo de Operación */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize ${
                                isVoided
                                  ? 'bg-slate-100 text-slate-500 line-through'
                                  : m.movement_type === 'initial_cash' || m.movement_type === 'cash_advance'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : m.movement_type === 'reception'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : m.movement_type === 'expense'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {m.movement_type === 'initial_cash'
                                ? 'Fondo Inicial'
                                : m.movement_type === 'cash_advance'
                                ? 'Entrega / Adelanto'
                                : m.movement_type === 'reception'
                                ? 'Recepción Oficina'
                                : m.movement_type === 'expense'
                                ? 'Gasto / Compra'
                                : m.movement_type}
                            </span>
                            {isVoided && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                                ANULADO
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Concepto / Descripción */}
                        <td className="py-3 px-3 max-w-xs">
                          <p
                            className={`text-slate-800 font-semibold leading-tight line-clamp-2 ${
                              isVoided ? 'line-through text-slate-400 italic' : ''
                            }`}
                          >
                            {m.description || 'Movimiento de caja'}
                          </p>
                          {m.task && (
                            <p className="text-2xs text-indigo-600 font-mono font-bold flex items-center gap-1 mt-0.5">
                              <FileText className="h-3 w-3" />
                              Tarea {m.task.code}: {m.task.title}
                            </p>
                          )}
                        </td>

                        {/* Método */}
                        <td className="py-3 px-3">
                          <span className="text-2xs text-slate-600 font-medium capitalize">
                            {m.payment_method === 'cash' ? '💵 Efectivo' : m.payment_method}
                          </span>
                        </td>

                        {/* Monto */}
                        <td className="py-3 px-4 text-right">
                          <div
                            className={`font-mono text-sm font-extrabold flex items-center justify-end gap-1 ${
                              isVoided
                                ? 'text-slate-400 line-through'
                                : isIncome
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {isIncome ? '+' : '-'}C$ {Number(m.amount).toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            {m.currency || 'NIO'}
                          </span>
                        </td>

                        {/* Acción Anular */}
                        <td className="py-3 px-4 text-right">
                          {!isVoided &&
                          ['cash_advance', 'initial_cash', 'reception', 'deposit', 'cash_return'].includes(
                            m.movement_type
                          ) ? (
                            <button
                              type="button"
                              onClick={() => setVoidTargetMovement(m)}
                              className="text-2xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title="Anular o revertir esta entrega de efectivo"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Anular
                            </button>
                          ) : (
                            <span className="text-2xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal para Ver Movimientos de una Jornada en Particular */}
      <WorkdayMovementsModal
        workday={viewMovementsWorkday}
        isOpen={!!viewMovementsWorkday}
        onClose={() => setViewMovementsWorkday(null)}
      />

      {/* Modal para Anular Entrega / Movimiento */}
      <VoidMovementModal
        movement={voidTargetMovement}
        isOpen={!!voidTargetMovement}
        onClose={() => setVoidTargetMovement(null)}
      />

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
        courierName={
          receiveCashWorkday?.courier_profile?.display_name ||
          receiveCashWorkday?.courier_profile?.full_name
        }
        isOpen={!!receiveCashWorkday}
        onClose={() => setReceiveCashWorkday(null)}
      />

      {/* Modal para Liquidación Administrativa por Contingencia */}
      <AdminForceSettlementModal
        workday={forceSettlementWorkday}
        isOpen={!!forceSettlementWorkday}
        onClose={() => setForceSettlementWorkday(null)}
      />

      {/* Modal para Desglose Financiero Dinámico de las 4 Tarjetas */}
      <FinancialSummaryDetailModal
        cardType={selectedCardDetail}
        isOpen={!!selectedCardDetail}
        onClose={() => setSelectedCardDetail(null)}
        viewMode={viewMode}
        workdays={workdays}
        tasks={allTasks}
        ledgerMovements={ledgerMovements}
        financialSummary={financialSummary}
        onSelectWorkdayMovements={(w) => {
          setSelectedCardDetail(null)
          setViewMovementsWorkday(w)
        }}
      />
    </div>
  )
}


