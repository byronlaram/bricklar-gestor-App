import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Search,
  HandCoins,
  DollarSign,
  Receipt,
  Calculator,
  Wallet,
  ExternalLink,
  Building2,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Layers,
  Banknote,
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { Badge, Avatar, Button, EmptyState } from '@/shared/components/ui'
import type { Workday } from '../types/workdays.types'
import type { DetailedCashMovement } from '../services/workdaysService'
import type { Task } from '@/modules/tasks/types/task.types'
import { TASK_STATUS_LABELS } from '@/shared/types'

export type FinancialCardType = 'funds' | 'collections' | 'payments' | 'net'

interface FinancialSummaryDetailModalProps {
  cardType: FinancialCardType | null
  isOpen: boolean
  onClose: () => void
  viewMode: 'projected' | 'live'
  workdays: Workday[]
  tasks: Task[]
  ledgerMovements: DetailedCashMovement[]
  financialSummary: {
    totalInitialCashNIO: number
    totalAdvancesNIO: number
    totalAdminFundsNIO: number
    projectedCollectionsNIO: number
    completedCollectionsNIO: number
    collectionProgressPct: number
    projectedPaymentsNIO: number
    completedPaymentsNIO: number
    totalAlreadyReceivedNIO: number
    liveCashInHandNIO: number
    netProjectedCashNIO: number
  }
  onSelectWorkdayMovements?: (workday: Workday) => void
}

function getTaskCashCollectionAmount(t: Task): number {
  if (!t.requires_collection) return 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pb = (t as any).metadata?.payment_breakdown
  if (t.status === 'completed') {
    return pb && typeof pb.cash_amount === 'number'
      ? pb.cash_amount
      : (!t.expected_payment_method || t.expected_payment_method === 'cash')
      ? t.expected_collection_amount || 0
      : 0
  }
  return !t.expected_payment_method || t.expected_payment_method === 'cash'
    ? t.expected_collection_amount || 0
    : 0
}

function getTaskCashPaymentAmount(t: Task): number {
  if (!t.requires_payment) return 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pb = (t as any).metadata?.payment_breakdown
  if (t.status === 'completed') {
    const isCash = !pb?.paid_method || pb?.paid_method === 'cash'
    return isCash
      ? pb && typeof pb.actual_paid_amount === 'number'
        ? pb.actual_paid_amount
        : t.expected_payment_amount || 0
      : 0
  }
  return !t.expected_payment_method || t.expected_payment_method === 'cash'
    ? t.expected_payment_amount || 0
    : 0
}

export function FinancialSummaryDetailModal({
  cardType,
  isOpen,
  onClose,
  viewMode,
  workdays,
  tasks,
  ledgerMovements,
  financialSummary,
  onSelectWorkdayMovements,
}: FinancialSummaryDetailModalProps) {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  // Map de motorizados por ID para nombres rápidos
  const courierMap = useMemo(() => {
    const map = new Map<string, string>()
    workdays.forEach((w) => {
      const name = w.courier_profile?.display_name || w.courier_profile?.full_name || 'Motorizado'
      if (w.courier_id) map.set(w.courier_id, name)
    })
    return map
  }, [workdays])

  // Filtrado según la tarjeta seleccionada
  const filteredFunds = useMemo(() => {
    if (cardType !== 'funds') return []
    const deliveryMovements = ledgerMovements.filter(
      (m) =>
        (m.movement_type === 'initial_delivery' || m.movement_type === 'advance_delivery') &&
        !m.is_voided
    )
    if (!searchTerm.trim()) return deliveryMovements
    const term = searchTerm.toLowerCase()
    return deliveryMovements.filter(
      (m) =>
        m.courier_name?.toLowerCase().includes(term) ||
        m.admin_name?.toLowerCase().includes(term) ||
        m.notes?.toLowerCase().includes(term) ||
        m.receipt_number?.toLowerCase().includes(term)
    )
  }, [cardType, ledgerMovements, searchTerm])

  const filteredCollectionTasks = useMemo(() => {
    if (cardType !== 'collections') return []
    const base = tasks.filter((t) => {
      if (!t.requires_collection) return false
      if (viewMode === 'live') {
        return t.status === 'completed'
      }
      return true
    })
    if (!searchTerm.trim()) return base
    const term = searchTerm.toLowerCase()
    return base.filter(
      (t) =>
        t.code?.toLowerCase().includes(term) ||
        t.title?.toLowerCase().includes(term) ||
        t.contact_name?.toLowerCase().includes(term) ||
        t.company_name?.toLowerCase().includes(term) ||
        (t.assigned_courier_id && courierMap.get(t.assigned_courier_id)?.toLowerCase().includes(term))
    )
  }, [cardType, tasks, viewMode, searchTerm, courierMap])

  const filteredPaymentTasks = useMemo(() => {
    if (cardType !== 'payments') return []
    const base = tasks.filter((t) => {
      if (!t.requires_payment) return false
      if (viewMode === 'live') {
        return t.status === 'completed'
      }
      return true
    })
    if (!searchTerm.trim()) return base
    const term = searchTerm.toLowerCase()
    return base.filter(
      (t) =>
        t.code?.toLowerCase().includes(term) ||
        t.title?.toLowerCase().includes(term) ||
        t.contact_name?.toLowerCase().includes(term) ||
        t.provider_name?.toLowerCase().includes(term) ||
        (t.assigned_courier_id && courierMap.get(t.assigned_courier_id)?.toLowerCase().includes(term))
    )
  }, [cardType, tasks, viewMode, searchTerm, courierMap])

  const filteredWorkdays = useMemo(() => {
    if (cardType !== 'net') return []
    if (!searchTerm.trim()) return workdays
    const term = searchTerm.toLowerCase()
    return workdays.filter(
      (w) =>
        w.courier_profile?.full_name?.toLowerCase().includes(term) ||
        w.courier_profile?.display_name?.toLowerCase().includes(term) ||
        w.branch?.name?.toLowerCase().includes(term)
    )
  }, [cardType, workdays, searchTerm])

  if (!isOpen || !cardType) return null

  // Configuración de encabezado según tarjeta y modo
  const config = {
    funds: {
      title: 'Desglose de Fondos Entregados por Administración',
      subtitle: 'Entregas iniciales y adelantos registrados para las jornadas seleccionadas.',
      icon: <HandCoins className="h-5 w-5 text-indigo-600" />,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      totalFormatted: `C$ ${financialSummary.totalAdminFundsNIO.toFixed(2)}`,
      totalLabel: 'Total Fondos Asignados',
    },
    collections: {
      title:
        viewMode === 'projected'
          ? 'Desglose de Cobros Proyectados (Ruta)'
          : 'Desglose de Cobros Realizados (Efectivo en Mano)',
      subtitle:
        viewMode === 'projected'
          ? 'Todas las gestiones con cobro en efectivo previstas para el día (pendientes y completadas).'
          : 'Gestiones con cobro en efectivo completadas exitosamente por los motorizados.',
      icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      totalFormatted:
        viewMode === 'projected'
          ? `+C$ ${financialSummary.projectedCollectionsNIO.toFixed(2)}`
          : `+C$ ${financialSummary.completedCollectionsNIO.toFixed(2)}`,
      totalLabel: viewMode === 'projected' ? 'Total Cobros Proyectados' : 'Total Cobrado Efectivo',
    },
    payments: {
      title:
        viewMode === 'projected'
          ? 'Desglose de Compras / Pagos en Ruta Proyectados'
          : 'Desglose de Compras / Pagos Ejecutados (Desembolsados)',
      subtitle:
        viewMode === 'projected'
          ? 'Todas las gestiones con compras o pagos en efectivo previstas en ruta.'
          : 'Gestiones con desembolso de dinero ejecutadas por los motorizados.',
      icon: <Receipt className="h-5 w-5 text-rose-600" />,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      totalFormatted:
        viewMode === 'projected'
          ? `-C$ ${financialSummary.projectedPaymentsNIO.toFixed(2)}`
          : `-C$ ${financialSummary.completedPaymentsNIO.toFixed(2)}`,
      totalLabel: viewMode === 'projected' ? 'Total Pagos Presupuestados' : 'Total Pagado Efectivo',
    },
    net: {
      title:
        viewMode === 'projected'
          ? 'Arqueo Consolidado: Neto Proyectado al Cierre'
          : 'Arqueo en Tiempo Real: Efectivo en Calle Ahora',
      subtitle:
        viewMode === 'projected'
          ? 'Cálculo de balance final estimado por motorizado al completar todas las gestiones.'
          : 'Dinero físico que posee cada motorizado en mano en este instante.',
      icon:
        viewMode === 'projected' ? (
          <Calculator className="h-5 w-5 text-purple-600" />
        ) : (
          <Wallet className="h-5 w-5 text-emerald-600" />
        ),
      badgeColor:
        viewMode === 'projected'
          ? 'bg-purple-50 text-purple-700 border-purple-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      totalFormatted:
        viewMode === 'projected'
          ? `C$ ${financialSummary.netProjectedCashNIO.toFixed(2)}`
          : `C$ ${financialSummary.liveCashInHandNIO.toFixed(2)}`,
      totalLabel:
        viewMode === 'projected' ? 'Balance Neto Proyectado' : 'Total Efectivo en Calle',
    },
  }[cardType]

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 animate-fade-in">
      <div
        className={cn(
          'bg-white border border-slate-200 w-full rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col',
          'max-h-[92vh] sm:max-h-[88vh] sm:max-w-4xl relative overflow-hidden animate-scale-up'
        )}
      >
        {/* Encabezado del Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 shrink-0 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 mt-0.5">
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {config.title}
                </h2>
                <span
                  className={cn(
                    'text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider border',
                    config.badgeColor
                  )}
                >
                  {viewMode === 'projected' ? '🔮 Proyectado' : '⚡ Real en Mano'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{config.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra Superior con Resumen Total y Buscador */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
            <span className="text-xs font-semibold text-slate-500">{config.totalLabel}:</span>
            <span className="text-base sm:text-lg font-extrabold font-mono text-slate-900">
              {config.totalFormatted}
            </span>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por código, cliente o motorizado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Contenido Desplazable del Modal */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-slate-50/40">
          {/* CASO 1: FONDOS ENTREGADOS POR ADMINISTRACIÓN */}
          {cardType === 'funds' && (
            <>
              {filteredFunds.length === 0 ? (
                <EmptyState
                  title="No hay entregas de fondos registradas"
                  description="Las entregas de fondos iniciales y adelantos registrados en caja aparecerán aquí."
                  icon={<HandCoins className="h-8 w-8 text-slate-400" />}
                />
              ) : (
                <div className="space-y-2">
                  {filteredFunds.map((m) => {
                    const isInitial = m.movement_type === 'initial_delivery'
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5',
                              isInitial
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            )}
                          >
                            <HandCoins className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {m.courier_name || 'Motorizado'}
                              </span>
                              <Badge variant={isInitial ? 'accent' : 'primary'} size="sm">
                                {isInitial ? 'Fondo Inicial' : 'Adelanto en Ruta'}
                              </Badge>
                              {m.receipt_number && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  #{m.receipt_number}
                                </span>
                              )}
                            </div>
                            <p className="text-2xs text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>
                                Hora:{' '}
                                {m.created_at
                                  ? new Date(m.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '—'}
                              </span>
                              {m.admin_name && (
                                <span>
                                  • Entregado por: <strong>{m.admin_name}</strong>
                                </span>
                              )}
                            </p>
                            {m.notes && (
                              <p className="text-2xs text-slate-600 bg-slate-50 px-2 py-1 rounded-md mt-1 italic border border-slate-100">
                                &quot;{m.notes}&quot;
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 flex sm:flex-col items-center sm:items-end justify-between">
                          <span className="text-2xs text-slate-400 font-semibold sm:hidden">
                            Monto:
                          </span>
                          <span className="text-sm font-extrabold font-mono text-indigo-700">
                            +C$ {m.amount_nio.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* CASO 2: COBROS (PROYECTADOS O REALES) */}
          {cardType === 'collections' && (
            <>
              {filteredCollectionTasks.length === 0 ? (
                <EmptyState
                  title="No se encontraron gestiones de cobro"
                  description={
                    viewMode === 'live'
                      ? 'No hay cobros en efectivo completados todavía para los filtros aplicados.'
                      : 'No hay gestiones que requieran cobro en efectivo para esta fecha.'
                  }
                  icon={<DollarSign className="h-8 w-8 text-slate-400" />}
                />
              ) : (
                <div className="space-y-2">
                  {filteredCollectionTasks.map((t) => {
                    const isCompleted = t.status === 'completed'
                    const cashAmount = getTaskCashCollectionAmount(t)
                    const courierName = t.assigned_courier_id
                      ? courierMap.get(t.assigned_courier_id) || 'Asignado'
                      : 'Sin asignar'

                    return (
                      <div
                        key={t.id}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5',
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 font-mono">
                                {t.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-800">
                                {t.contact_name || t.company_name || t.title}
                              </span>
                              <Badge
                                variant={
                                  isCompleted
                                    ? 'success'
                                    : t.status === 'cancelled'
                                    ? 'destructive'
                                    : 'neutral'
                                }
                                size="sm"
                              >
                                {TASK_STATUS_LABELS[t.status] || t.status}
                              </Badge>
                            </div>
                            <p className="text-2xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>
                                Motorizado: <strong className="text-slate-700">{courierName}</strong>
                              </span>
                              {t.address && (
                                <span className="truncate max-w-[200px] sm:max-w-xs text-slate-400">
                                  • {t.address}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-sm font-extrabold font-mono text-emerald-700 block">
                              +C$ {cashAmount.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {isCompleted ? 'Efectivo recaudado' : 'Cobro proyectado'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onClose()
                              navigate(`/admin/tareas/${t.id}`)
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-[#004594] hover:bg-blue-50 transition cursor-pointer"
                            title="Ver detalle de tarea"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* CASO 3: COMPRAS / PAGOS EN RUTA */}
          {cardType === 'payments' && (
            <>
              {filteredPaymentTasks.length === 0 ? (
                <EmptyState
                  title="No se encontraron compras o pagos en ruta"
                  description={
                    viewMode === 'live'
                      ? 'No hay pagos o compras ejecutados aún para los filtros aplicados.'
                      : 'No hay gestiones que requieran desembolso de efectivo para esta fecha.'
                  }
                  icon={<Receipt className="h-8 w-8 text-slate-400" />}
                />
              ) : (
                <div className="space-y-2">
                  {filteredPaymentTasks.map((t) => {
                    const isCompleted = t.status === 'completed'
                    const cashAmount = getTaskCashPaymentAmount(t)
                    const courierName = t.assigned_courier_id
                      ? courierMap.get(t.assigned_courier_id) || 'Asignado'
                      : 'Sin asignar'

                    return (
                      <div
                        key={t.id}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-rose-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5',
                              isCompleted
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            )}
                          >
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 font-mono">
                                {t.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-800">
                                {t.provider_name || t.contact_name || t.title}
                              </span>
                              <Badge
                                variant={
                                  isCompleted
                                    ? 'destructive'
                                    : t.status === 'cancelled'
                                    ? 'neutral'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {TASK_STATUS_LABELS[t.status] || t.status}
                              </Badge>
                            </div>
                            <p className="text-2xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>
                                Motorizado: <strong className="text-slate-700">{courierName}</strong>
                              </span>
                              {t.address && (
                                <span className="truncate max-w-[200px] sm:max-w-xs text-slate-400">
                                  • {t.address}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-sm font-extrabold font-mono text-rose-700 block">
                              -C$ {cashAmount.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {isCompleted ? 'Desembolso ejecutado' : 'Presupuesto proyectado'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onClose()
                              navigate(`/admin/tareas/${t.id}`)
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-[#004594] hover:bg-blue-50 transition cursor-pointer"
                            title="Ver detalle de tarea"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* CASO 4: NETO PROYECTADO / REAL EN MANO AHORA (ARQUEO POR MOTORIZADO) */}
          {cardType === 'net' && (
            <div className="space-y-4">
              {/* Tarjeta de Fórmula Consolidada */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {viewMode === 'projected'
                      ? 'Ecuación de Cierre Proyectado'
                      : 'Ecuación de Efectivo en Calle en Vivo'}
                  </span>
                  <span className="text-xs font-bold text-slate-300">Moneda: NIO (C$)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-2xs block">Fondos Asignados:</span>
                    <strong className="text-indigo-400 font-mono">
                      +C$ {financialSummary.totalAdminFundsNIO.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-2xs block">
                      {viewMode === 'projected' ? 'Cobros Proyectados:' : 'Cobros Efectuados:'}
                    </span>
                    <strong className="text-emerald-400 font-mono">
                      +C${' '}
                      {(viewMode === 'projected'
                        ? financialSummary.projectedCollectionsNIO
                        : financialSummary.completedCollectionsNIO
                      ).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-2xs block">
                      {viewMode === 'projected' ? 'Pagos Presupuestados:' : 'Pagos Ejecutados:'}
                    </span>
                    <strong className="text-rose-400 font-mono">
                      -C${' '}
                      {(viewMode === 'projected'
                        ? financialSummary.projectedPaymentsNIO
                        : financialSummary.completedPaymentsNIO
                      ).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-2xs block">Entregado a Oficina:</span>
                    <strong className="text-amber-400 font-mono">
                      -C$ {financialSummary.totalAlreadyReceivedNIO.toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold">
                  <span className="text-xs text-white">
                    {viewMode === 'projected' ? 'Total Neto a Recibir:' : 'Total en Calle Ahora:'}
                  </span>
                  <span
                    className={cn(
                      'text-lg font-mono',
                      viewMode === 'projected' ? 'text-purple-400' : 'text-emerald-400'
                    )}
                  >
                    {config.totalFormatted}
                  </span>
                </div>
              </div>

              {/* Lista de Motorizados y Arqueo Individual */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 px-1">
                  Arqueo Individual por Motorizado ({filteredWorkdays.length})
                </h3>

                {filteredWorkdays.length === 0 ? (
                  <EmptyState
                    title="No hay turnos registrados"
                    description="Los motorizados aparecerán aquí tan pronto inicien su jornada o reciban fondos."
                    icon={<User className="h-8 w-8 text-slate-400" />}
                  />
                ) : (
                  <div className="space-y-2">
                    {filteredWorkdays.map((w) => {
                      const summary = w.cash_summary
                      const initialNIO = summary?.initialCashNIO ?? w.initial_cash ?? 0
                      const advancesNIO = summary?.advancesNIO ?? 0
                      const totalAdmin = initialNIO + advancesNIO
                      const collections = summary?.totalCollectionsNIO ?? 0
                      const payments = summary?.totalPaymentsNIO ?? 0
                      const alreadyDelivered = summary?.alreadyReceivedNIO ?? 0
                      const cashInHand = summary?.cashInHandNIO ?? initialNIO

                      const courierName =
                        w.courier_profile?.display_name ||
                        w.courier_profile?.full_name ||
                        'Motorizado'

                      return (
                        <div
                          key={w.id}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={courierName} size="sm" />
                              <div>
                                <div className="text-xs font-bold text-slate-900">{courierName}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                  {w.branch?.name && (
                                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                                      <Building2 className="h-2.5 w-2.5 text-slate-400" />
                                      {w.branch.name}
                                    </span>
                                  )}
                                  <span>• Turno: {w.status}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-500 block text-2xs uppercase">
                                En Mano Ahora:
                              </span>
                              <span className="text-sm font-extrabold font-mono text-emerald-700">
                                C$ {cashInHand.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Mini desglose del motorizado */}
                          <div className="grid grid-cols-4 gap-1 bg-slate-50 p-2 rounded-xl text-center border border-slate-100 text-[10px]">
                            <div>
                              <span className="text-slate-400 block">Fondos:</span>
                              <strong className="text-indigo-700 font-mono">
                                +{totalAdmin.toFixed(0)}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Cobrado:</span>
                              <strong className="text-emerald-700 font-mono">
                                +{collections.toFixed(0)}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Pagado:</span>
                              <strong className="text-rose-700 font-mono">
                                -{payments.toFixed(0)}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Entregado:</span>
                              <strong className="text-amber-700 font-mono">
                                -{alreadyDelivered.toFixed(0)}
                              </strong>
                            </div>
                          </div>

                          {onSelectWorkdayMovements && (
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose()
                                  onSelectWorkdayMovements(w)
                                }}
                                className="text-2xs font-bold text-[#004594] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                Ver movimientos de este turno
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-2xs text-slate-400">
            Mostrando auditoría en tiempo real para la fecha y sucursal seleccionada.
          </span>
          <Button onClick={onClose} variant="secondary" size="sm" className="cursor-pointer">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
