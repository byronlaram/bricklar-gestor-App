import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  DollarSign,
  Receipt,
  Wallet,
  CheckCircle2,
  Users,
  Lock,
  Building2,
  HandCoins,
  AlertCircle,
  FileCheck2,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  Printer,
} from 'lucide-react'

import { useAuth } from '@/modules/auth/useAuth'
import { useDailyClosure, useSettlementMutations } from '@/modules/settlements/hooks/useSettlements'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import { useExchangeRates } from '@/modules/exchange-rates/hooks/useExchangeRates'
import { printDailyClosureReceipt } from '@/shared/utils/pdfReceiptService'
import {
  Card,
  MetricCard,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  useToast,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'
import { formatDate } from '@/shared/utils/format'
import { WORKDAY_STATUS_LABELS } from '@/shared/types'

export default function AdminDailyClosurePage() {
  const { profile } = useAuth()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = getLocalDateString()
  const toast = useToast()

  const [date, setDate] = useState(todayStr)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(defaultBranchId || '')
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [closureNotes, setClosureNotes] = useState('')

  const { data: branches = [] } = useBranches()
  const { data: closure, isLoading } = useDailyClosure(selectedBranchId || undefined, date)
  const { confirmDailyClosure, isConfirmingDailyClosure } = useSettlementMutations()
  const { latestRate } = useExchangeRates({ branch_id: selectedBranchId || undefined })

  const workdaysDetail = closure?.workdays_detail || []
  const savedClosure = closure?.saved_closure
  const isSavedInDb = savedClosure?.status === 'closed'
  const isAllWorkdaysClosed = workdaysDetail.length > 0 && workdaysDetail.every((w) => w.status === 'closed')
  const isFullyClosed = isSavedInDb || isAllWorkdaysClosed

  const handleConfirmClosure = async () => {
    try {
      await confirmDailyClosure({
        branchId: selectedBranchId || undefined,
        date,
        notes: closureNotes.trim() || undefined,
      })
      setIsConfirmModalOpen(false)
      setClosureNotes('')
      toast.success(
        'Cierre Diario Guardado en BD',
        `Se ha persistido exitosamente el cierre diario para la fecha ${date}.`
      )
    } catch (err) {
      toast.error('Error en Cierre Diario', (err as Error).message)
    }
  }

  const handlePrintClosure = () => {
    if (!closure) return
    const currentBranch = branches.find((b: any) => b.id === selectedBranchId)
    const settledCount = workdaysDetail.filter(
      (w) => w.status === 'closed' || w.settlementStatus === 'approved'
    ).length

    printDailyClosureReceipt({
      branchName: currentBranch?.name || 'Todas las Sucursales',
      date,
      closedBy: savedClosure?.closed_by_profile?.full_name || profile?.full_name || 'Administración',
      closedAt: savedClosure?.closed_at || null,
      notes: savedClosure?.notes || null,
      totalCouriers: closure.total_workdays || 0,
      settledCouriers: settledCount,
      totalCollectionsNIO: savedClosure?.total_collections_nio ?? closure.total_collections_cash,
      totalCollectionsUSD: savedClosure?.total_collections_usd ?? (closure.tasks_summary?.expected_usd || 0),
      totalTransfersNIO: closure.total_collections_transfer || 0,
      totalTransfersUSD: 0,
      totalExpensesNIO: closure.total_expenses || 0,
      totalFundsGivenNIO: closure.total_initial_cash || 0,
      totalAlreadyReceivedNIO: closure.total_already_received || 0,
      totalCashInVaultNIO: savedClosure?.total_delivered_nio ?? closure.net_cash_in_hand,
      exchangeRate: latestRate?.nio_per_usd || null,
      workdays: (closure.workdays_detail || []).map((w) => ({
        courierName: w.courierName || 'Motorizado',
        status: w.status,
        initialCash: w.initialCash || 0,
        collectionsNIO: w.collections || 0,
        expensesNIO: w.expenses || 0,
        expectedCash: w.pendingCash || 0,
        actualCash: w.deliveredCash ?? w.pendingCash ?? 0,
        difference: (w.deliveredCash ?? w.pendingCash ?? 0) - (w.pendingCash || 0),
      })),
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header y Acción Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cierre Diario Consolidado</h1>
          <p className="text-xs text-slate-500">
            Consolidación de arqueo de caja, recaudaciones de motorizados y persistencia formal en base de datos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSavedInDb && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Guardado en BD</span>
            </div>
          )}

          <Button
            onClick={handlePrintClosure}
            disabled={!closure || (closure.total_workdays === 0 && closure.tasks_summary?.total === 0)}
            variant="outline"
            size="md"
            leftIcon={<Printer className="h-4 w-4 text-sky-600" />}
            className="shrink-0 font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            Imprimir Cierre PDF
          </Button>

          <Button
            onClick={() => {
              setClosureNotes(savedClosure?.notes || '')
              setIsConfirmModalOpen(true)
            }}
            disabled={(closure?.total_workdays || 0) === 0 && (closure?.tasks_summary?.total || 0) === 0}
            isLoading={isConfirmingDailyClosure}
            variant={isSavedInDb ? 'outline' : 'primary'}
            size="md"
            leftIcon={isSavedInDb ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4" />}
            className={
              isSavedInDb
                ? 'shrink-0 font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                : 'shrink-0 font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white'
            }
          >
            {isSavedInDb ? 'Actualizar Cierre Diario' : 'Confirmar Cierre Diario'}
          </Button>
        </div>
      </div>

      {/* Selector de Fecha y Sucursal */}
      <Card className="p-4 bg-white border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
            />
          </div>

          <div className="relative w-full sm:w-56">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
            >
              <option value="">Todas las sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Badge de Tasa de Cambio Activa */}
        <Link
          to="/admin/configuracion?tab=tipo-cambio"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
          title="Ver o editar tipos de cambio en Configuración"
        >
          <TrendingUp className="w-3.5 h-3.5 text-accent" />
          <span>
            Tipo de Cambio:{' '}
            <span className="text-accent font-bold">
              1 USD = C$ {latestRate ? latestRate.nio_per_usd.toFixed(4) : '36.6242'}
            </span>
          </span>
        </Link>
      </Card>

      {/* Banner de Cierre Persistido en Base de Datos */}
      {savedClosure && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs text-emerald-950 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-emerald-900">
                  Cierre Oficial Persistido en Base de Datos
                </span>
                <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  Inmutable
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                Cerrado por: <strong className="font-bold">{savedClosure.closed_by_profile?.full_name || 'Administrador'}</strong>
                {savedClosure.closed_at && (
                  <span className="ml-1 text-emerald-700">
                    el {new Date(savedClosure.closed_at).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })} hrs
                  </span>
                )}
              </p>
              {savedClosure.notes && (
                <p className="text-xs text-emerald-900 bg-white/70 p-2 rounded-lg border border-emerald-100 italic">
                  &ldquo;{savedClosure.notes}&rdquo;
                </p>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center text-right border-t sm:border-t-0 border-emerald-200/60 pt-2 sm:pt-0">
            <span className="text-[11px] text-emerald-700 font-medium">Tareas Consolidadas</span>
            <span className="text-xs font-mono font-bold text-emerald-900">
              {savedClosure.tasks_completed} de {savedClosure.tasks_total} completadas
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grid de Totales Consolidados */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              title="Motorizados"
              value={closure?.total_workdays || 0}
              subtitle="Jornadas del día"
              icon={<Users className="h-4 w-4 text-sky-600" />}
              accentColor="primary"
            />

            <MetricCard
              title="Tareas Completadas"
              value={`${closure?.tasks_summary?.completed || 0} / ${closure?.tasks_summary?.total || 0}`}
              subtitle="Entregas ejecutadas"
              icon={<PackageCheck className="h-4 w-4 text-emerald-600" />}
              accentColor="success"
            />

            <MetricCard
              title="Fondos Admin"
              value={`C$ ${(closure?.total_initial_cash ?? 0).toFixed(2)}`}
              subtitle="Base y recargas"
              icon={<Wallet className="h-4 w-4 text-indigo-600" />}
              accentColor="primary"
            />

            <MetricCard
              title="Cobrado Efectivo"
              value={`+C$ ${(closure?.total_collections_cash ?? 0).toFixed(2)}`}
              subtitle="Cobros en ruta"
              icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
              accentColor="success"
            />

            <MetricCard
              title="Gastos Autorizados"
              value={`-C$ ${(closure?.total_expenses ?? 0).toFixed(2)}`}
              subtitle="Compras y viáticos"
              icon={<Receipt className="h-4 w-4 text-rose-600" />}
              accentColor="destructive"
            />

            <MetricCard
              title="Entregas Previas"
              value={`-C$ ${(closure?.total_already_received ?? 0).toFixed(2)}`}
              subtitle="En ventanilla"
              icon={<HandCoins className="h-4 w-4 text-purple-600" />}
              accentColor="purple"
            />
          </div>

          {/* Banner Héroe de Efectivo Neto en Caja General */}
          <div className="bg-gradient-to-br from-[#1e1b6b] via-[#1a1752] to-[#12113b] border border-indigo-400/25 rounded-3xl p-6 sm:p-8 shadow-md text-white space-y-5">
            <div className="flex items-center justify-between border-b border-indigo-400/20 pb-3.5">
              <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2.5 text-indigo-200">
                <div className="w-8 h-8 rounded-xl bg-white/10 text-cyan-300 flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
                Efectivo Neto Físico Ingresado en Bóveda / Caja General
              </span>
              <span className="text-xs bg-black/30 px-3.5 py-1 rounded-full font-mono font-bold text-indigo-100 border border-white/10 shadow-2xs">
                {formatDate(date)}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                C$ {(closure?.net_cash_in_hand ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs sm:text-sm text-indigo-200/90 font-medium leading-relaxed max-w-xl">
                Total neto físico recibido en caja general / bóveda (Cobros en ruta + Fondos - Gastos autorizados - Entregas previas).
              </p>
            </div>

            {isFullyClosed && (
              <div className="p-3.5 bg-emerald-500/15 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center gap-2.5 border border-emerald-400/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Cierre diario de caja formalmente verificado y guardado en auditoría.</span>
              </div>
            )}
          </div>

          {/* Tabla de Detalle por Motorizado */}
          <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                Detalle de Motorizados del Día ({date})
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {workdaysDetail.length} motorizado(s)
              </span>
            </div>

            {workdaysDetail.length === 0 ? (
              <EmptyState
                title="Sin jornadas registradas para esta fecha"
                description="No se encontraron jornadas de motorizados para la fecha y sucursal seleccionadas."
                icon={<AlertCircle className="h-8 w-8 text-slate-400" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-2xs">
                      <th className="py-3.5 px-4">Motorizado</th>
                      <th className="py-3.5 px-3">Sucursal</th>
                      <th className="py-3.5 px-3">Fondo Inicial (+)</th>
                      <th className="py-3.5 px-3">Cobros (+)</th>
                      <th className="py-3.5 px-3">Gastos (-)</th>
                      <th className="py-3.5 px-3">Entregado Previo (-)</th>
                      <th className="py-3.5 px-3">Saldo en Mano</th>
                      <th className="py-3.5 px-3">Liquidado en Caja</th>
                      <th className="py-3.5 px-3">Estado Jornada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workdaysDetail.map((w, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {w.courierName}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {w.branchName}
                        </td>
                        <td className="py-3 px-3 font-semibold text-indigo-700 font-mono">
                          +C$ {w.initialCash.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-700 font-mono">
                          +C$ {w.collections.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-rose-600 font-mono">
                          {w.expenses > 0 ? `-C$ ${w.expenses.toFixed(2)}` : 'C$ 0.00'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-sky-700 font-mono">
                          {w.alreadyReceived > 0 ? `-C$ ${w.alreadyReceived.toFixed(2)}` : 'C$ 0.00'}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 font-mono bg-slate-50/50">
                          C$ {w.pendingCash.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                          {w.deliveredCash !== null ? `C$ ${w.deliveredCash.toFixed(2)}` : 'Pendiente'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={w.status === 'closed' ? 'completed' : w.status === 'open' ? 'completed' : 'pending'}
                            size="sm"
                          >
                            {(WORKDAY_STATUS_LABELS && WORKDAY_STATUS_LABELS[w.status as keyof typeof WORKDAY_STATUS_LABELS]) || w.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal de Confirmación y Observaciones de Cierre Diario */}
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-slate-900">
              <Lock className="w-5 h-5 text-emerald-600" />
              Confirmar Cierre Diario de Caja
            </ModalTitle>
            <ModalDescription>
              Esta acción registrará formalmente el arqueo en la tabla inmutable <strong>daily_closures</strong> y cerrará las jornadas activas para la fecha <strong>{date}</strong>.
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="space-y-4 py-2">
            {/* Resumen numérico rápido */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Efectivo Físico en Caja:</span>
                <span className="text-base font-black font-mono text-slate-900">
                  C$ {(closure?.net_cash_in_hand ?? 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Motorizados / Tareas:</span>
                <span className="text-base font-black font-mono text-slate-900">
                  {closure?.total_workdays || 0} / {closure?.tasks_summary?.completed || 0}
                </span>
              </div>
            </div>

            {/* Campo de notas / observaciones */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Observaciones del Cierre (Opcional):
              </label>
              <textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="Ej. Arqueo verificado sin diferencias. Depósito programado para mañana a primera hora..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 placeholder:text-slate-400 resize-none shadow-2xs"
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isConfirmingDailyClosure}
              onClick={handleConfirmClosure}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Confirmar y Guardar Cierre
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
