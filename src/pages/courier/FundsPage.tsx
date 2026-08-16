import { useState } from 'react'
import {
  Plus,
  Fuel,
  ShoppingCart,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import { useCashMovements } from '@/modules/settlements/hooks/useSettlements'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { AddMovementModal } from '@/modules/settlements/components/AddMovementModal'
import {
  Button,
  Skeleton,
  EmptyState,
  useToast,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'

export default function CourierFundsPage() {
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = getLocalDateString()
  const toast = useToast()

  const [isAddMovementOpen, setIsAddMovementOpen] = useState(false)

  const { data: activeWorkday } = useActiveWorkday(profile?.id)

  const handleOpenGastoModal = () => {
    if (!activeWorkday) {
      toast.error(
        'Jornada requerida',
        'Debes iniciar tu jornada laboral de hoy en la pantalla de Inicio para poder registrar un gasto.'
      )
      return
    }
    setIsAddMovementOpen(true)
  }
  const { data: movements = [], isLoading: isLoadingMovements } = useCashMovements(activeWorkday?.id)

  const { data: tasksData } = useTasks({
    branch_id: branchId,
    courier_id: profile?.id,
    date: todayStr,
    page_size: 100,
  })

  const completedTasks = (tasksData?.data || []).filter((t) => t.status === 'completed')

  // Total cobrado en efectivo
  const cashCollections = completedTasks
    .filter((t) => (t.expected_payment_method || 'cash') === 'cash' && t.requires_collection)
    .reduce((acc, t) => acc + (t.expected_collection_amount || 0), 0)

  // Entregas de efectivo / adelantos recibidos de administración
  const totalCashAdvances = movements
    .filter((m) => m.direction === 'income' && m.movement_type === 'cash_advance')
    .reduce((acc, m) => acc + m.amount, 0)

  // Total gastos
  const totalExpenses = movements
    .filter((m) => m.direction === 'expense')
    .reduce((acc, m) => acc + m.amount, 0)

  // Fondo inicial
  const initialCash = activeWorkday?.initial_cash || 0

  // Fondo total recibido (Fondo inicial + Entregas adicionales de efectivo)
  const totalFundsReceived = initialCash + totalCashAdvances

  // Efectivo total disponible en mano
  const cashInHand = Math.max(0, totalFundsReceived + cashCollections - totalExpenses)

  return (
    <div className="space-y-5 animate-fade-in pb-20 max-w-2xl mx-auto">
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
          <span className="text-2xs bg-indigo-950/80 text-teal-200 px-3 py-1 rounded-full font-mono border border-indigo-700/60 font-bold">
            {todayStr}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-2xs text-indigo-200 uppercase font-semibold tracking-wider">Saldo Total Disponible</span>
          <p className="text-4xl sm:text-5xl font-black tracking-tight text-white font-tabular">
            C$ {cashInHand.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Desglose rápido 3 tarjetas integradas */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
            <span className="text-2xs block text-indigo-200 uppercase tracking-wider font-semibold">Fondos Recibidos</span>
            <span className="font-bold text-white text-sm font-tabular mt-0.5 block">C$ {totalFundsReceived.toFixed(2)}</span>
          </div>

          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
            <span className="text-2xs block text-teal-200 uppercase tracking-wider font-semibold">Cobros Tareas</span>
            <span className="font-bold text-teal-300 text-sm font-tabular mt-0.5 block">+C$ {cashCollections.toFixed(2)}</span>
          </div>

          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
            <span className="text-2xs block text-amber-200 uppercase tracking-wider font-semibold">Gastos Ruta</span>
            <span className="font-bold text-amber-300 text-sm font-tabular mt-0.5 block">-C$ {totalExpenses.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Tarjetas de Categorías Menta / Esmeralda Pastel Suaves */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#F3F9F6] border border-emerald-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Fondos</span>
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
            C$ {cashCollections.toFixed(2)}
          </span>
        </div>

        <div className="bg-[#FCFAF4] border border-amber-100/70 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-2xs font-bold uppercase tracking-wider">Gastos</span>
            <ArrowUpRight size={16} />
          </div>
          <span className="text-base sm:text-lg font-bold text-amber-950 font-tabular mt-2 block">
            C$ {totalExpenses.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Lista de Movimientos Recientes */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Movimientos Recientes de Caja</h2>

        {isLoadingMovements ? (
          <div className="space-y-2.5">
            <Skeleton className="h-16 rounded-3xl" />
            <Skeleton className="h-16 rounded-3xl" />
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            title="Sin gastos ni movimientos registrados"
            description="Si realizas compras, combustible o entregas de efectivo, regístralos usando el botón superior."
            icon={<Receipt className="h-8 w-8 text-slate-400" />}
          />
        ) : (
          <div className="space-y-2.5">
            {movements.map((m, idx) => {
              const itemPastels = [
                'bg-[#FCFAF4] border-amber-100/70',
                'bg-[#F5F8FE] border-blue-100/70',
                'bg-[#F3F9F6] border-emerald-100/70',
              ]
              const itemStyle = itemPastels[idx % itemPastels.length]

              return (
                <div
                  key={m.id}
                  className={`p-4 ${itemStyle} border rounded-3xl shadow-2xs flex items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-white/90 text-amber-700 border border-slate-200/60 shadow-2xs">
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
