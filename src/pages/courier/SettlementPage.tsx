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

export default function CourierSettlementPage() {
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = getLocalDateString()
  const [notes, setNotes] = useState('')
  const [showCarryoverDetails, setShowCarryoverDetails] = useState(false)

  const { data: activeWorkday, isLoading: isLoadingWorkday } = useActiveWorkday(profile?.id)
  const { data: settlement, isLoading: isLoadingSettlement } = useWorkdaySettlement(activeWorkday?.id)
  const { data: movements = [], isLoading: isLoadingMovements } = useCashMovements(activeWorkday?.id)
  const { data: pendingBalances, isLoading: isLoadingPendingBalances } = useCourierPendingBalances(
    profile?.id,
    activeWorkday?.work_date || todayStr
  )

  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({
    branch_id: branchId,
    courier_id: profile?.id,
    date: todayStr,
    page_size: 100,
  })

  const { submitSettlement, isSubmitting } = useSettlementMutations()

  const completedTasks = useMemo(
    () => (tasksData?.data || []).filter((t) => t.status === 'completed'),
    [tasksData?.data]
  )

  const completedTasksCount = completedTasks.length

  // Cálculo en vivo de cobros en efectivo y transferencias
  const liveCashCollections = useMemo(
    () =>
      completedTasks
        .filter((t) => (t.expected_payment_method || 'cash') === 'cash' && t.requires_collection)
        .reduce((acc, t) => acc + (t.expected_collection_amount || 0), 0),
    [completedTasks]
  )

  const liveTransferCollections = useMemo(
    () =>
      completedTasks
        .filter((t) => (t.expected_payment_method || 'cash') !== 'cash' && t.requires_collection)
        .reduce((acc, t) => acc + (t.expected_collection_amount || 0), 0),
    [completedTasks]
  )

  // Gastos registrados en ruta
  const liveExpenses = useMemo(
    () =>
      movements
        .filter((m) => m.direction === 'expense')
        .reduce((acc, m) => acc + m.amount, 0),
    [movements]
  )

  // Entregas adicionales de efectivo / adelantos recibidos
  const totalCashAdvances = useMemo(
    () =>
      movements
        .filter((m) => m.direction === 'income' && m.movement_type === 'cash_advance')
        .reduce((acc, m) => acc + m.amount, 0),
    [movements]
  )

  const initialCash = activeWorkday?.initial_cash || 0
  const totalFundsReceived = initialCash + totalCashAdvances

  // Si la liquidación ya fue formalmente aprobada por el admin, tomamos el snapshot; de lo contrario, datos en vivo
  const isSettlementFinalized = settlement?.status === 'approved'

  const expectedCash = isSettlementFinalized
    ? (settlement?.expected_cash ?? liveCashCollections)
    : liveCashCollections

  const expectedTransfers = isSettlementFinalized
    ? (settlement?.expected_transfers ?? liveTransferCollections)
    : liveTransferCollections

  const totalExpenses = isSettlementFinalized
    ? (settlement?.total_expenses ?? liveExpenses)
    : liveExpenses

  // Saldo exclusivo del día de hoy
  const todayNetCashToDeliver = isSettlementFinalized
    ? Math.max(0, (settlement?.actual_cash ?? expectedCash) - totalExpenses)
    : Math.max(0, totalFundsReceived + expectedCash - totalExpenses)

  // Saldo arrastrado acumulado de días anteriores
  const pendingCarryoverCash = pendingBalances?.totalPendingCash || 0
  const hasPendingCarryover = (pendingBalances?.hasPendingBalances ?? false) && (pendingCarryoverCash > 0 || (pendingBalances?.breakdown?.length || 0) > 0)

  // Total General a entregar en caja
  const grandTotalNetCashToDeliver = todayNetCashToDeliver + pendingCarryoverCash

  const handleSubmitReview = async () => {
    if (!activeWorkday) return
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
            variant={settlement.status === 'approved' ? 'completed' : 'pending'}
            size="md"
          >
            {SETTLEMENT_STATUS_LABELS[settlement.status] || settlement.status}
          </Badge>
        )}
      </div>

      {/* Grid Ejecutiva de Resumen Financiero en Tarjetas Pastel Suaves */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Total Cobrado Hoy */}
        <div className="bg-[#F3F9F6] border border-emerald-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Cobrado Hoy</span>
            <DollarSign size={16} />
          </div>
          <span className="text-xl font-black text-emerald-950 font-tabular mt-2 block">
            C$ {expectedCash.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Total Gastado Hoy */}
        <div className="bg-[#FCF5F7] border border-rose-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Gastado Hoy</span>
            <Receipt size={16} />
          </div>
          <span className="text-xl font-black text-rose-950 font-tabular mt-2 block">
            -C$ {totalExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Fondos Recibidos Hoy */}
        <div className="bg-[#F5F8FE] border border-blue-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Fondos Hoy</span>
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
              (Hoy: C$ {todayNetCashToDeliver.toLocaleString('es-NI', { minimumFractionDigits: 2 })} + Días Anteriores: C$ {pendingCarryoverCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })})
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
              Fondo Inicial / Adelantos de Hoy:
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
              C$ {expectedCash.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          <div className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
            <span className="text-slate-600 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-rose-600" />
              Gastos / Egresos en Ruta de Hoy (-):
            </span>
            <span className="font-bold text-rose-700 font-tabular text-sm">
              - C$ {totalExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Formulario / Acción de Enviar a Liquidación */}
      {(!settlement || settlement.status === 'draft') && (
        <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
          <CardTitle className="text-sm font-bold text-slate-900">Enviar a Revisión de Administración</CardTitle>
          <p className="text-xs text-slate-500 font-medium">
            Al presionar este botón, tu resumen se enviará al panel del administrador para cuadre y aprobación.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Notas Adicionales para el Administrador (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Entregué billetes en sobre, comprobante de gasolina adjunto..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/30 text-slate-900 shadow-2xs resize-none"
            />
          </div>

          <Button
            size="lg"
            variant="primary"
            onClick={handleSubmitReview}
            isLoading={isSubmitting}
            leftIcon={<Send className="h-4 w-4" />}
            className="w-full justify-center text-sm font-bold shadow-xs py-3 bg-[#004594] hover:bg-[#083570]"
          >
            Enviar Liquidación a Revisión
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
