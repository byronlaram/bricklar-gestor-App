import { useState, useMemo } from 'react'
import {
  Plus,
  Fuel,
  ShoppingCart,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  HandCoins,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import { useCashMovements } from '@/modules/settlements/hooks/useSettlements'
import { useCourierPendingBalances } from '@/modules/settlements/hooks/usePendingBalances'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { calculateWorkdayCashSummary } from '@/modules/workdays/utils/workdayCalculations'
import { AddMovementModal } from '@/modules/settlements/components/AddMovementModal'
import {
  Button,
  Skeleton,
  EmptyState,
  useToast,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'
import { formatDate } from '@/shared/utils/format'

export default function CourierFundsPage() {
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = getLocalDateString()
  const toast = useToast()

  const [isAddMovementOpen, setIsAddMovementOpen] = useState(false)
  const [showCarryoverDetails, setShowCarryoverDetails] = useState(false)

  const { data: activeWorkday, isLoading: isLoadingWorkday } = useActiveWorkday(profile?.id)
  const targetWorkDate = activeWorkday?.work_date || todayStr
  const isPastWorkday = !!activeWorkday && activeWorkday.work_date < todayStr

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

  const completedTasks = useMemo(
    () => (tasksData?.data || []).filter((t) => t.status === 'completed'),
    [tasksData?.data]
  )

  // Cálculo centralizado y unificado de caja en vivo
  const cashSummary = useMemo(
    () =>
      calculateWorkdayCashSummary(
        activeWorkday?.initial_cash || 0,
        completedTasks,
        movements
      ),
    [activeWorkday?.initial_cash, completedTasks, movements]
  )

  const cashCollections = cashSummary.collectionsNIO
  const totalExpenses = cashSummary.expensesNIO
  const initialCash = cashSummary.initialCashNIO
  const totalAdvances = cashSummary.advancesNIO
  const totalFundsReceived = initialCash + totalAdvances
  const alreadyReceivedByAdmin = cashSummary.alreadyReceivedNIO

  // Saldo exclusivo del turno actual en mano (restando entregas parciales y gastos)
  const todayNetCash = Math.max(0, cashSummary.cashInHandNIO)

  // Saldo pendiente acumulado de jornadas anteriores (excluyendo la jornada en curso)
  const pendingCarryoverCash = isPastWorkday ? 0 : (pendingBalances?.totalPendingCash || 0)
  const hasPendingCarryover =
    !isPastWorkday &&
    (pendingBalances?.hasPendingBalances ?? false) &&
    (pendingCarryoverCash > 0 || (pendingBalances?.breakdown?.length || 0) > 0)

  // Total efectivo disponible en mano
  const grandTotalCashInHand = todayNetCash + pendingCarryoverCash

  const handleOpenGastoModal = () => {
    if (!activeWorkday) {
      toast.error(
        'Jornada requerida',
        'Debes iniciar tu jornada laboral en la pantalla de Inicio para poder registrar un gasto.'
      )
      return
    }
    setIsAddMovementOpen(true)
  }

  // Tareas con pago para listado de movimientos combinados
  const completedPaymentTasks = useMemo(
    () =>
      completedTasks.filter((t) => t.requires_payment && (t.expected_payment_amount || 0) > 0),
    [completedTasks]
  )

  if (isLoadingWorkday || isLoadingMovements || isLoadingTasks || isLoadingPendingBalances) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
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
                  Saldos Pendientes de Días Anteriores
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
              title="Ver detalle de días pendientes"
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

      {/* ⚠️ AVISO SI ESTÁ OPERANDO EN JORNADA ANTERIOR SIN CERRAR */}
      {isPastWorkday && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-3xl p-5 shadow-sm space-y-2.5 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-2xl shrink-0 mt-0.5">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-100 block">
                  Turno Activo: {formatDate(activeWorkday.work_date)}
                </span>
                <span className="text-xs font-black bg-white/20 px-2.5 py-0.5 rounded-full font-tabular">
                  Cierre Pendiente
                </span>
              </div>
              <p className="text-xs text-white/95 mt-1 leading-snug">
                Esta jornada pertenece al <strong>{formatDate(activeWorkday.work_date)}</strong> y está abierta. Recuerda liquidarla en la pestaña <strong>"Liquidación"</strong> para entregar cuentas e iniciar tu jornada de hoy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Menta Pastel Ejecutivo */}
      <div className="bg-[#F3F9F6] border border-emerald-100/70 rounded-3xl p-5 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540] flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-700" />
            Billetera Digital en Ruta
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Efectivo disponible, cobros en entregas y reporte de gastos.
          </p>
        </div>

        <Button
          onClick={handleOpenGastoModal}
          variant="warning"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          className="font-bold text-xs shadow-xs shrink-0 rounded-2xl"
        >
          Registrar Gasto
        </Button>
      </div>

      {/* Tarjeta Hero Billetera Digital */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-5 border border-indigo-700/50">
        <div className="flex items-center justify-between border-b border-indigo-700/50 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-indigo-200">
            <Wallet className="h-4 w-4 text-teal-300" />
            Dinero Disponible en Mano
          </span>
          <span className="text-xs font-bold font-mono bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-500/30 text-indigo-200">
            {targetWorkDate}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-2xs text-indigo-200 uppercase font-semibold tracking-wider">
            {hasPendingCarryover ? 'Saldo Total en Mano (Turno + Días Anteriores)' : 'Saldo Total en Mano'}
          </span>
          <p className="text-4xl sm:text-5xl font-black tracking-tight text-white font-tabular">
            C$ {grandTotalCashInHand.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {hasPendingCarryover && (
            <span className="text-2xs text-teal-200 font-semibold block pt-0.5">
              (Turno Actual: C$ {todayNetCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })} + Días Anteriores: C$ {pendingCarryoverCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })})
            </span>
          )}
        </div>

        {/* Desglose rápido 4 tarjetas integradas del turno */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-center text-xs">
          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
            <span className="text-2xs block text-indigo-200 uppercase tracking-wider font-semibold">Fondos Recibidos</span>
            <span className="font-bold text-white text-sm font-tabular mt-0.5 block">
              C$ {totalFundsReceived.toFixed(2)}
            </span>
          </div>

          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
            <span className="text-2xs block text-teal-200 uppercase tracking-wider font-semibold">Cobros Tareas</span>
            <span className="font-bold text-teal-300 text-sm font-tabular mt-0.5 block">
              +C$ {cashCollections.toFixed(2)}
            </span>
          </div>

          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
            <span className="text-2xs block text-amber-200 uppercase tracking-wider font-semibold">Gastos / Pagos</span>
            <span className="font-bold text-amber-300 text-sm font-tabular mt-0.5 block">
              -C$ {totalExpenses.toFixed(2)}
            </span>
          </div>

          <div className="bg-sky-500/20 p-3 rounded-2xl backdrop-blur-xs border border-sky-400/30">
            <span className="text-2xs block text-sky-200 uppercase tracking-wider font-semibold">Entregado a Admin</span>
            <span className="font-bold text-sky-300 text-sm font-tabular mt-0.5 block">
              -C$ {alreadyReceivedByAdmin.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Tarjetas de Categorías Menta / Azul / Ámbar / Celeste */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#F3F9F6] border border-emerald-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Fondos Turno</span>
            <Banknote size={16} />
          </div>
          <span className="text-base sm:text-lg font-bold text-emerald-950 font-tabular mt-2 block">
            C$ {totalFundsReceived.toFixed(2)}
          </span>
        </div>

        <div className="bg-[#F5F8FE] border border-blue-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Cobrado</span>
            <ArrowDownLeft size={16} />
          </div>
          <span className="text-base sm:text-lg font-bold text-blue-950 font-tabular mt-2 block">
            +C$ {cashCollections.toFixed(2)}
          </span>
        </div>

        <div className="bg-[#FCFAF4] border border-amber-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Gastos / Pagos</span>
            <ArrowUpRight size={16} />
          </div>
          <span className="text-base sm:text-lg font-bold text-amber-950 font-tabular mt-2 block">
            -C$ {totalExpenses.toFixed(2)}
          </span>
        </div>

        <div className="bg-[#F0F9FF] border border-sky-200/80 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Entregas a Caja</span>
            <HandCoins size={16} />
          </div>
          <span className="text-base sm:text-lg font-bold text-sky-950 font-tabular mt-2 block">
            -C$ {alreadyReceivedByAdmin.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Lista de Movimientos y Pagos Recientes */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Movimientos y Pagos en Ruta ({targetWorkDate})
        </h2>

        {isLoadingMovements ? (
          <div className="space-y-2.5">
            <Skeleton className="h-16 rounded-3xl" />
            <Skeleton className="h-16 rounded-3xl" />
          </div>
        ) : movements.length === 0 && completedPaymentTasks.length === 0 ? (
          <EmptyState
            title="Sin gastos ni pagos registrados"
            description="Si realizas compras, combustible o entregas parciales a caja, se reflejarán automáticamente aquí."
            icon={<Receipt className="h-8 w-8 text-slate-400" />}
          />
        ) : (
          <div className="space-y-2.5">
            {/* Tareas con Pagos Realizados a Proveedores */}
            {completedPaymentTasks.map((t) => (
              <div
                key={`task-${t.id}`}
                className="p-4 bg-[#FCF5F7] border border-rose-100/80 rounded-3xl shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-white/90 text-rose-700 border border-slate-200/60 shadow-2xs">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0A2540]">{t.title}</h3>
                    <p className="text-2xs text-slate-500 font-semibold font-mono mt-0.5">
                      Pago a proveedor completado ({t.code})
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-rose-700 font-tabular block">
                    -C$ {(t.expected_payment_amount || 0).toFixed(2)}
                  </span>
                  <span className="text-2xs text-slate-500 font-mono uppercase font-semibold">
                    Pago Tarea
                  </span>
                </div>
              </div>
            ))}

            {/* Movimientos de Caja Registrados */}
            {movements.map((m) => {
              const descLower = (m.description || '').toLowerCase()
              const isPartialDelivery =
                ['cash_return', 'deposit', 'adjustment', 'reception', 'partial_delivery'].includes(
                  m.movement_type
                ) ||
                descLower.includes('recepción de efectivo') ||
                descLower.includes('entrega parcial') ||
                descLower.includes('entrega previa')

              const isInitialOrAdvance =
                ['initial_cash', 'cash_advance', 'advance', 'additional_fund'].includes(
                  m.movement_type
                ) ||
                descLower.includes('fondo inicial') ||
                descLower.includes('adelanto')

              if (isPartialDelivery) {
                return (
                  <div
                    key={m.id}
                    className="p-4 bg-[#F0F9FF] border border-sky-200/80 rounded-3xl shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-white/90 text-sky-700 border border-sky-200/60 shadow-2xs">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0A2540]">{m.description}</h3>
                        <p className="text-2xs text-sky-700 font-semibold font-mono mt-0.5">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Entrega en Administración
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-sky-700 font-tabular block">
                        -C$ {m.amount.toFixed(2)}
                      </span>
                      <span className="text-2xs text-sky-600 font-mono uppercase font-semibold">
                        Entregado
                      </span>
                    </div>
                  </div>
                )
              }

              if (isInitialOrAdvance) {
                return (
                  <div
                    key={m.id}
                    className="p-4 bg-[#F3F9F6] border border-emerald-100/80 rounded-3xl shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-white/90 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                        <Banknote className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0A2540]">{m.description}</h3>
                        <p className="text-2xs text-emerald-700 font-semibold font-mono mt-0.5">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Fondo Asignado
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-700 font-tabular block">
                        +C$ {m.amount.toFixed(2)}
                      </span>
                      <span className="text-2xs text-emerald-600 font-mono uppercase font-semibold">
                        Fondo
                      </span>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={m.id}
                  className="p-4 bg-[#FCFAF4] border border-amber-100/80 rounded-3xl shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-white/90 text-amber-700 border border-amber-200/60 shadow-2xs">
                      {m.movement_type === 'fuel' ? (
                        <Fuel className="h-4 w-4" />
                      ) : m.movement_type === 'purchase' ? (
                        <ShoppingCart className="h-4 w-4" />
                      ) : (
                        <Receipt className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0A2540]">{m.description}</h3>
                      <p className="text-2xs text-slate-500 font-semibold font-mono mt-0.5">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-700 font-tabular block">
                      -C$ {m.amount.toFixed(2)}
                    </span>
                    <span className="text-2xs text-slate-500 font-mono uppercase font-semibold">
                      {m.payment_method}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Agregar Gasto */}
      {activeWorkday && (
        <AddMovementModal
          workdayId={activeWorkday.id}
          isOpen={isAddMovementOpen}
          onClose={() => setIsAddMovementOpen(false)}
        />
      )}
    </div>
  )
}

