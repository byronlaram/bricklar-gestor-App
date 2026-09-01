import { useState, useMemo } from 'react'
import {
  Calculator,
  CheckCircle2,
  Clock,
  Send,
  DollarSign,
  CreditCard,
  Receipt,
  AlertCircle,
  Banknote,
  ShieldCheck,
  CheckSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Package,
  HandCoins,
  FileCheck,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import {
  useWorkdaySettlement,
  useSettlementMutations,
  useCashMovements,
} from '@/modules/settlements/hooks/useSettlements'
import { useCourierPendingBalances } from '@/modules/settlements/hooks/usePendingBalances'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { calculateWorkdayCashSummary } from '@/modules/workdays/utils/workdayCalculations'
import { SETTLEMENT_STATUS_LABELS } from '@/shared/types'
import {
  Card,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  EmptyState,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'

// Estados que indican que una tarea ya fue cerrada (terminal)
const TERMINAL_STATUSES = ['completed', 'not_completed', 'rescheduled', 'cancelled', 'archived']

export default function CourierSettlementPage() {
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = getLocalDateString()
  const [notes, setNotes] = useState('')
  const [showCarryoverDetails, setShowCarryoverDetails] = useState(false)
  const [showPendingTasksError, setShowPendingTasksError] = useState(false)

  const { data: activeWorkday, isLoading: isLoadingWorkday } = useActiveWorkday(profile?.id)
  const targetWorkDate = activeWorkday?.work_date || todayStr
  const isPastWorkday = !!activeWorkday && activeWorkday.work_date < todayStr

  const { data: settlement, isLoading: isLoadingSettlement } = useWorkdaySettlement(activeWorkday?.id)
  const { data: movements = [], isLoading: isLoadingMovements } = useCashMovements(activeWorkday?.id)
  const { data: pendingBalances, isLoading: isLoadingPendingBalances } = useCourierPendingBalances(
    profile?.id,
    targetWorkDate
  )

  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({
    branch_id: branchId,
    courier_id: profile?.id,
    date: targetWorkDate,
    page_size: 100,
  })

  const { submitSettlement, isSubmitting } = useSettlementMutations()

  const completedTasks = useMemo(
    () => (tasksData?.data || []).filter((t) => t.status === 'completed'),
    [tasksData?.data]
  )

  // Tareas que aún no han sido cerradas (estados activos/pendientes)
  const pendingTasks = useMemo(
    () => (tasksData?.data || []).filter((t) => !TERMINAL_STATUSES.includes(t.status)),
    [tasksData?.data]
  )
  const hasPendingTasks = pendingTasks.length > 0

  const completedTasksCount = completedTasks.length

  // Documentos físicos y desgloses
  const chequesList = useMemo(() => {
    const list: Array<{ taskId: string; taskCode: string; client: string; amount: number; bank: string; chequeNumber: string }> = []
    completedTasks.forEach((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      if (pb?.cheque_amount && pb.cheque_amount > 0) {
        list.push({
          taskId: t.id,
          taskCode: t.code,
          client: t.contact_name || t.title,
          amount: pb.cheque_amount,
          bank: pb.cheque_bank || 'Banco emisor',
          chequeNumber: pb.cheque_number || 'S/N',
        })
      }
    })
    return list
  }, [completedTasks])

  const transfersList = useMemo(() => {
    const list: Array<{ taskId: string; taskCode: string; client: string; amount: number; bank: string; reference: string }> = []
    completedTasks.forEach((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      if (pb?.transfer_amount && pb.transfer_amount > 0) {
        list.push({
          taskId: t.id,
          taskCode: t.code,
          client: t.contact_name || t.title,
          amount: pb.transfer_amount,
          bank: pb.transfer_bank || 'Banpro / Lafise',
          reference: pb.transfer_reference || '',
        })
      } else if (t.requires_collection && (t.expected_payment_method === 'bank_transfer' || t.expected_payment_method === 'mobile_wallet') && (!pb || !pb.cash_amount)) {
        list.push({
          taskId: t.id,
          taskCode: t.code,
          client: t.contact_name || t.title,
          amount: t.expected_collection_amount || 0,
          bank: 'Transferencia Bancaria',
          reference: '',
        })
      }
    })
    return list
  }, [completedTasks])

  const invoicesList = useMemo(() => {
    const list: Array<{ taskId: string; taskCode: string; title: string; amount: number; invoiceNumber?: string }> = []
    completedTasks.forEach((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      if (t.requires_payment) {
        const amt = pb?.actual_paid_amount ?? t.expected_payment_amount ?? 0
        if (amt > 0) {
          list.push({
            taskId: t.id,
            taskCode: t.code,
            title: t.title,
            amount: amt,
            invoiceNumber: pb?.invoice_number,
          })
        }
      }
    })
    return list
  }, [completedTasks])

  // Cálculo centralizado y unificado de caja
  const cashSummary = useMemo(
    () =>
      calculateWorkdayCashSummary(
        activeWorkday?.initial_cash || 0,
        completedTasks,
        movements
      ),
    [activeWorkday?.initial_cash, completedTasks, movements]
  )

  const liveCashCollections = cashSummary.collectionsNIO
  const liveTransferCollections = useMemo(
    () =>
      completedTasks.reduce((acc, t) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pb = (t as any).metadata?.payment_breakdown
        if (pb?.transfer_amount && pb.transfer_amount > 0) return acc + pb.transfer_amount
        if (
          t.requires_collection &&
          (t.expected_payment_method === 'bank_transfer' || t.expected_payment_method === 'mobile_wallet') &&
          (!pb || !pb.cash_amount)
        ) {
          return acc + (t.expected_collection_amount || 0)
        }
        return acc
      }, 0),
    [completedTasks]
  )

  const liveTaskPayments = useMemo(
    () =>
      completedTasks
        .filter((t) => t.requires_payment && (t.expected_payment_amount || 0) > 0)
        .reduce((acc, t) => acc + (t.expected_payment_amount || 0), 0),
    [completedTasks]
  )

  const liveCombinedExpenses = cashSummary.expensesNIO
  const liveManualExpenses = cashSummary.expensesNIO - liveTaskPayments
  const initialCash = cashSummary.initialCashNIO
  const totalAdvances = cashSummary.advancesNIO
  const totalFundsReceived = initialCash + totalAdvances
  const alreadyReceivedByAdmin = cashSummary.alreadyReceivedNIO

  // Si la liquidación ya fue formalmente aprobada por el admin, tomamos el snapshot; de lo contrario, datos en vivo
  const isSettlementFinalized = settlement?.status === 'approved'

  const expectedCash = isSettlementFinalized
    ? (settlement?.expected_cash ?? liveCashCollections)
    : liveCashCollections

  const expectedTransfers = isSettlementFinalized
    ? (settlement?.expected_transfers ?? liveTransferCollections)
    : liveTransferCollections

  const totalExpenses = isSettlementFinalized
    ? (settlement?.total_expenses ?? liveCombinedExpenses)
    : liveCombinedExpenses

  // Saldo exclusivo del turno actual a entregar (restando dinero ya entregado a administración si hubo)
  const todayNetCashToDeliver = isSettlementFinalized
    ? Math.max(0, settlement?.actual_cash ?? expectedCash)
    : Math.max(0, cashSummary.cashInHandNIO)

  // Saldo arrastrado acumulado de días anteriores no liquidados
  const pendingCarryoverCash = isPastWorkday ? 0 : (pendingBalances?.totalPendingCash || 0)
  const hasPendingCarryover =
    !isPastWorkday &&
    (pendingBalances?.hasPendingBalances ?? false) &&
    (pendingCarryoverCash > 0 || (pendingBalances?.breakdown?.length || 0) > 0)

  // Total General a entregar en caja (Turno actual + Días anteriores)
  const grandTotalNetCashToDeliver = todayNetCashToDeliver + pendingCarryoverCash

  const handleSubmitReview = async () => {
    if (!activeWorkday) return
    // Bloquear envío si hay tareas pendientes por cerrar
    if (hasPendingTasks) {
      setShowPendingTasksError(true)
      return
    }
    setShowPendingTasksError(false)
    try {
      await submitSettlement({ workdayId: activeWorkday.id, notes: notes.trim() || undefined })
    } catch (err) {
      console.error('Error submitting settlement:', err)
    }
  }


  if (isLoadingWorkday || isLoadingSettlement || isLoadingMovements || isLoadingTasks || isLoadingPendingBalances) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (!activeWorkday) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {hasPendingCarryover && (
          <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-3xl p-5 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-2xl shrink-0 mt-0.5">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-amber-100 block">
                  Atención: Saldo / Cierres Pendientes de Días Anteriores
                </span>
                <span className="text-2xl font-black block mt-0.5 font-tabular">
                  C$ {pendingCarryoverCash.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-xs text-white/90 mt-1">
                  Tienes {pendingBalances?.breakdown.length} jornada(s) pasada(s) sin cerrar o con liquidación pendiente de entrega y aprobación en caja.
                </p>
              </div>
            </div>

            <div className="bg-black/15 rounded-2xl p-3.5 space-y-2 text-xs">
              <span className="font-bold text-amber-100 block">Detalle de jornadas anteriores:</span>
              {pendingBalances?.breakdown.map((b, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/10 rounded-xl p-2.5">
                  <div>
                    <span className="font-bold text-white block">📅 {b.workDate}</span>
                    <span className="text-[11px] text-white/80">{b.reason}</span>
                  </div>
                  <span className="font-mono font-bold text-white text-sm">
                    C$ {b.amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <EmptyState
          title="No tienes una jornada activa hoy"
          description="Inicia tu jornada desde la pantalla de inicio para generar tu arqueo de hoy."
          icon={<AlertCircle className="h-8 w-8 text-slate-400" />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in pb-20 max-w-2xl mx-auto">
      {/* ⚠️ ALERTA DE SALDO PENDIENTE ARRASTRADO DE DÍAS ANTERIORES */}
      {hasPendingCarryover && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-3xl p-5 shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-2xl shrink-0 mt-0.5">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-100 block">
                  Saldo Pendiente Acumulado (Días Anteriores)
                </span>
                <span className="text-2xl font-black block mt-0.5 font-tabular">
                  + C$ {pendingCarryoverCash.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-xs text-white/90 mt-1">
                  Corresponde a {pendingBalances?.breakdown.length} jornada(s) anterior(es) no liquidadas o entregadas a caja.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCarryoverDetails((prev) => !prev)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition cursor-pointer shrink-0"
              title="Ver detalle de días adeudados"
            >
              {showCarryoverDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {showCarryoverDetails && (
            <div className="bg-black/15 rounded-2xl p-3.5 space-y-2 text-xs border border-white/10 animate-slide-up">
              <span className="font-bold text-amber-100 block">Desglose por fecha:</span>
              {pendingBalances?.breakdown.map((b, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/10 rounded-xl p-2.5">
                  <div>
                    <span className="font-bold text-white block">📅 {b.workDate}</span>
                    <span className="text-[11px] text-white/80">{b.reason}</span>
                  </div>
                  <span className="font-mono font-bold text-white text-sm">
                    C$ {b.amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ⚠️ AVISO SI ESTÁ LIQUIDANDO UNA JORNADA ANTERIOR SIN CERRAR */}
      {isPastWorkday && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-3xl p-5 shadow-sm space-y-2.5 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-2xl shrink-0 mt-0.5">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-100 block">
                  Liquidando Jornada Anterior ({activeWorkday.work_date})
                </span>
                <span className="text-xs font-black bg-white/20 px-2.5 py-0.5 rounded-full font-tabular">
                  Cierre Pendiente
                </span>
              </div>
              <p className="text-xs text-white/95 mt-1 leading-snug">
                Esta jornada del <strong>{activeWorkday.work_date}</strong> quedó abierta al finalizar el día. Revisa los montos cobrados y presiona <strong>"Enviar Liquidación a Revisión"</strong> para formalizar la entrega en caja y poder iniciar tu jornada de hoy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ AVISO SI LA LIQUIDACIÓN FUE DEVUELTA / OBSERVADA */}
      {settlement?.status === 'observed' && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 shadow-sm space-y-2.5 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-2xl shrink-0 mt-0.5">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-900 block">
                  Liquidación Observada / Devuelta por Administración
                </span>
                <Badge variant="urgent" size="sm">
                  Requiere Corrección
                </Badge>
              </div>
              <p className="text-xs text-rose-950 font-bold mt-1.5 leading-snug bg-white/80 p-2.5 rounded-xl border border-rose-150">
                {settlement.notes || 'Administración solicitó revisar comprobantes o montos antes de aprobar.'}
              </p>
              <p className="text-[11px] text-rose-700 mt-1.5 leading-snug">
                Corrige los comprobantes, fotos o cobros de tus tareas. Cuando todo esté en orden, vuelve a presionar <strong>"Reenviar Liquidación Corregida"</strong> abajo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Crema Pastel Ejecutivo */}
      <div className="bg-[#FCFAF4] border border-amber-100/70 rounded-3xl p-5 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540] flex items-center gap-2">
            <Calculator className="h-5 w-5 text-amber-700" />
            Liquidación de Turno
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Resumen ejecutivo del arqueo y cierre diario de entregas ({activeWorkday.work_date}).
          </p>
        </div>

        {settlement && (
          <Badge
            variant={
              settlement.status === 'approved'
                ? 'completed'
                : settlement.status === 'observed'
                ? 'urgent'
                : 'pending'
            }
            size="md"
          >
            {SETTLEMENT_STATUS_LABELS[settlement.status] || settlement.status}
          </Badge>
        )}
      </div>

      {/* Grid Ejecutiva de Resumen Financiero en Tarjetas Pastel Suaves */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Total Cobrado */}
        <div className="bg-[#F3F9F6] border border-emerald-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-2xs font-bold uppercase tracking-wider">
              {isPastWorkday ? 'Cobrado en Turno' : 'Cobrado Hoy'}
            </span>
            <DollarSign size={16} />
          </div>
          <span className="text-xl font-black text-emerald-950 font-tabular mt-2 block">
            C$ {expectedCash.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Total Gastado / Pagado */}
        <div className="bg-[#FCF5F7] border border-rose-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-2xs font-bold uppercase tracking-wider">
              {isPastWorkday ? 'Gastado / Pagado' : 'Gastado Hoy'}
            </span>
            <Receipt size={16} />
          </div>
          <span className="text-xl font-black text-rose-950 font-tabular mt-2 block">
            -C$ {totalExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Fondos Recibidos */}
        <div className="bg-[#F5F8FE] border border-blue-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-2xs font-bold uppercase tracking-wider">
              {isPastWorkday ? 'Fondos Recibidos' : 'Fondos Hoy'}
            </span>
            <Banknote size={16} />
          </div>
          <span className="text-xl font-black text-blue-950 font-tabular mt-2 block">
            C$ {totalFundsReceived.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Tareas Completadas */}
        <div className="bg-[#FAF8FE] border border-purple-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Entregas</span>
            <CheckSquare size={16} />
          </div>
          <span className="text-xl font-black text-indigo-950 font-mono mt-2 block">
            {completedTasksCount} Tareas
          </span>
        </div>

        {/* Saldo Neto a Entregar (Hero Card doble ancho) */}
        <div className="col-span-2 sm:col-span-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-4 shadow-md space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-200" />
            {hasPendingCarryover ? 'Total General a Entregar en Caja' : 'Saldo Neto a Entregar en Caja'}
          </span>
          <span className="text-2xl sm:text-3xl font-black font-tabular block text-white">
            C$ {grandTotalNetCashToDeliver.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {hasPendingCarryover && (
            <span className="text-2xs text-emerald-100 font-semibold block">
              (Turno: C$ {todayNetCashToDeliver.toLocaleString('es-NI', { minimumFractionDigits: 2 })} + Días Anteriores: C$ {pendingCarryoverCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })})
            </span>
          )}
        </div>
      </div>

      {/* Desglose Detallado */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-3.5">
        <h3 className="text-xs uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5 text-slate-700 font-bold">
          <Calculator className="h-4 w-4 text-indigo-600" />
          Detalle Arqueo de Caja
        </h3>

        <div className="space-y-2.5 text-xs font-medium">
          <div className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
            <span className="text-slate-600 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-blue-600" />
              Fondo Inicial / Adelantos de Hoy (+):
            </span>
            <span className="font-bold text-slate-900 font-tabular text-sm">
              C$ {totalFundsReceived.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
            <span className="text-slate-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Cobros en Efectivo de Hoy (+):
            </span>
            <span className="font-bold text-slate-900 font-tabular text-sm">
              + C$ {expectedCash.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
            <span className="text-slate-600 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-sky-600" />
              Cobros por Transferencia / Billetera de Hoy:
            </span>
            <span className="font-bold text-slate-900 font-tabular text-sm">
              C$ {expectedTransfers.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {liveTaskPayments > 0 && (
            <div className="flex justify-between items-center p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100">
              <span className="text-rose-700 flex items-center gap-2">
                <Package className="h-4 w-4 text-rose-600" />
                Pagos a Proveedores en Tareas Completadas (-):
              </span>
              <span className="font-bold text-rose-700 font-tabular text-sm">
                - C$ {liveTaskPayments.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {liveManualExpenses > 0 && (
            <div className="flex justify-between items-center p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100">
              <span className="text-rose-700 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-rose-600" />
                Gastos de Ruta / Combustible (-):
              </span>
              <span className="font-bold text-rose-700 font-tabular text-sm">
                - C$ {liveManualExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {alreadyReceivedByAdmin > 0 && (
            <div className="flex justify-between items-center p-3.5 bg-sky-50/70 rounded-2xl border border-sky-100">
              <span className="text-sky-800 flex items-center gap-2 font-medium">
                <HandCoins className="h-4 w-4 text-sky-600" />
                Entregas Parciales ya Entregadas a Caja (-):
              </span>
              <span className="font-bold text-sky-800 font-tabular text-sm">
                - C$ {alreadyReceivedByAdmin.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Saldo Neto del Turno Actual */}
          <div className="flex justify-between items-center p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 font-bold">
            <span className="text-indigo-950 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-indigo-600" />
              Saldo Neto de este Turno ({activeWorkday.work_date}):
            </span>
            <span className="font-black text-indigo-950 font-tabular text-sm">
              C$ {todayNetCashToDeliver.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {hasPendingCarryover && (
            <div className="flex justify-between items-center p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-amber-900 font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Saldo Pendiente Acumulado (Días Anteriores +):
              </span>
              <span className="font-black text-amber-950 font-tabular text-sm">
                + C$ {pendingCarryoverCash.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 font-bold">
            <span className="text-emerald-950 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Total Neto Final a Entregar en Caja (=):
            </span>
            <span className="font-black text-emerald-950 font-tabular text-base">
              C$ {grandTotalNetCashToDeliver.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 📑 SECCIÓN DE DOCUMENTOS FÍSICOS A ENTREGAR (CHEQUES, TRANSFERENCIAS, FACTURAS) */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
        <h3 className="text-xs uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5 text-slate-800 font-extrabold">
          <FileCheck className="h-4 w-4 text-purple-600" />
          Documentos y Comprobantes a Entregar en Ventanilla
        </h3>

        {/* 1. Lista de Cheques */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5 text-purple-600" />
              Cheques Físicos (CK)
            </span>
            <span className="text-2xs font-bold font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
              {chequesList.length} cheque(s) — Total: C$ {chequesList.reduce((acc, c) => acc + c.amount, 0).toFixed(2)}
            </span>
          </div>

          {chequesList.length === 0 ? (
            <p className="text-2xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              No recibiste cheques en este turno.
            </p>
          ) : (
            <div className="space-y-1.5">
              {chequesList.map((ck, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-purple-50/60 rounded-xl border border-purple-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block font-mono">
                      CK: {ck.chequeNumber} — {ck.bank}
                    </span>
                    <span className="text-2xs text-slate-500">{ck.taskCode} ({ck.client})</span>
                  </div>
                  <span className="font-black font-mono text-purple-900">
                    C$ {ck.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Lista de Transferencias */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-sky-600" />
              Comprobantes de Transferencia Bancaria
            </span>
            <span className="text-2xs font-bold font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
              {transfersList.length} registro(s) — Total: C$ {transfersList.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
            </span>
          </div>

          {transfersList.length === 0 ? (
            <p className="text-2xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              No hubo cobros por transferencia en este turno.
            </p>
          ) : (
            <div className="space-y-1.5">
              {transfersList.map((tr, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {tr.bank} {tr.reference ? `(Ref: ${tr.reference})` : ''}
                    </span>
                    <span className="text-2xs text-slate-500">{tr.taskCode} ({tr.client})</span>
                  </div>
                  <span className="font-black font-mono text-sky-900">
                    C$ {tr.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Facturas y Recibos de Compras */}
        {invoicesList.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-amber-600" />
                Facturas / Recibos de Compras Entregados
              </span>
              <span className="text-2xs font-bold font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {invoicesList.length} factura(s)
              </span>
            </div>

            <div className="space-y-1.5">
              {invoicesList.map((inv, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block font-mono">
                      {inv.invoiceNumber ? `Doc: ${inv.invoiceNumber}` : 'Sin comprobante escrito'}
                    </span>
                    <span className="text-2xs text-slate-500">{inv.taskCode} — {inv.title}</span>
                  </div>
                  <span className="font-black font-mono text-amber-900">
                    C$ {inv.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Formulario / Acción de Enviar a Liquidación */}
      {(!settlement || settlement.status === 'draft' || settlement.status === 'observed') && (
        <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
          <CardTitle className="text-sm font-bold text-slate-900">
            {settlement?.status === 'observed'
              ? 'Reenviar Liquidación a Revisión'
              : 'Enviar a Revisión de Administración'}
          </CardTitle>
          <p className="text-xs text-slate-500 font-medium">
            {settlement?.status === 'observed'
              ? 'Una vez corregidas las observaciones, presiona el botón para reenviar tu liquidación al administrador.'
              : 'Al presionar este botón, tu resumen se enviará al panel del administrador para cuadre y aprobación.'}
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Notas Adicionales para el Administrador (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                settlement?.status === 'observed'
                  ? 'Ej: Ya subí la foto legible del comprobante y ajusté la tarea #12...'
                  : 'Ej: Entregué billetes en sobre, comprobante de gasolina adjunto...'
              }
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/30 text-slate-900 shadow-2xs resize-none"
            />
          </div>

          {/* ⚠️ Error: Tareas pendientes por cerrar */}
          {showPendingTasksError && hasPendingTasks && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 animate-fade-in">
              <div className="shrink-0 mt-0.5 p-1.5 bg-rose-100 rounded-xl">
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-rose-800">
                  Tienes {pendingTasks.length} tarea{pendingTasks.length > 1 ? 's' : ''} pendiente{pendingTasks.length > 1 ? 's' : ''} por cerrar
                </p>
                <p className="text-[11px] text-rose-600 mt-0.5 leading-snug">
                  Debes completar, cancelar o reprogramar todas las tareas activas antes de enviar tu liquidación a revisión.
                </p>
                <div className="mt-2 space-y-1">
                  {pendingTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-100/60 rounded-lg px-2 py-1">
                      <span className="font-mono font-bold">{t.code}</span>
                      <span className="text-rose-500">—</span>
                      <span className="truncate">{t.contact_name || t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button
            size="lg"
            variant="primary"
            onClick={handleSubmitReview}
            isLoading={isSubmitting}
            leftIcon={<Send className="h-4 w-4" />}
            className="w-full justify-center text-sm font-bold shadow-xs py-3 bg-[#004594] hover:bg-[#083570]"
          >
            {settlement?.status === 'observed'
              ? 'Reenviar Liquidación Corregida'
              : 'Enviar Liquidación a Revisión'}
          </Button>
        </Card>
      )}

      {settlement?.status === 'pending_review' && (
        <Card className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900 shadow-xs font-medium">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
            <Clock className="h-4 w-4 text-amber-600" />
            Liquidación Enviada a Revisión
          </div>
          <p>
            Tu resumen ha sido recibido por administración. Preséntate en caja central para entregar el efectivo físico.
          </p>
        </Card>
      )}

      {settlement?.status === 'approved' && (
        <Card className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2 text-xs text-emerald-900 shadow-xs font-medium">
          <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Liquidación Aprobada y Cerrada
          </div>
          <p>Tu cuadre fue verificado exitosamente por el administrador.</p>
        </Card>
      )}
    </div>
  )
}
