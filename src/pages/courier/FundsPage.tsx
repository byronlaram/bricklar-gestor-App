import { useState } from 'react'
import {
  Plus,
  Fuel,
  ShoppingCart,
  Receipt,
  Loader2,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import { useCashMovements } from '@/modules/settlements/hooks/useSettlements'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { AddMovementModal } from '@/modules/settlements/components/AddMovementModal'

export default function CourierFundsPage() {
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = new Date().toISOString().split('T')[0]

  const [isAddMovementOpen, setIsAddMovementOpen] = useState(false)

  const { data: activeWorkday } = useActiveWorkday(profile?.id)
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

  // Efectivo total en mano
  const cashInHand = Math.max(0, totalFundsReceived + cashCollections - totalExpenses)

  return (
    <div className="p-4 space-y-5 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-1xl font-bold text-foreground">Fondos en Caja / Mano</h1>
          <p className="text-xs text-foreground-muted">Control de dinero recibido, cobros y egresos en ruta.</p>
        </div>

        <button
          onClick={() => setIsAddMovementOpen(true)}
          disabled={!activeWorkday}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-xl shadow-sm transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Registrar Gasto
        </button>
      </div>

      {/* Card de Efectivo Total en Mano */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between opacity-90">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="h-4 w-4" />
            Efectivo Neto en Mano
          </span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
            {todayStr}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-3xl font-black tracking-tight">C${cashInHand.toFixed(2)}</p>
          <p className="text-[11px] opacity-80">
            Calculado automáticamente: Fondos Entregados + Cobros - Gastos.
          </p>
        </div>

        {/* Desglose rápido 4 columnas */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 pt-3 border-t border-white/20 text-center text-xs">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs">
            <span className="text-[10px] block opacity-80">Fondos Recibidos</span>
            <span className="font-bold">C${totalFundsReceived.toFixed(2)}</span>
          </div>

          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs">
            <span className="text-[10px] block opacity-80">Cobros Efectivo</span>
            <span className="font-bold text-emerald-200">+C${cashCollections.toFixed(2)}</span>
          </div>

          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs">
            <span className="text-[10px] block opacity-80">Gastos Ruta</span>
            <span className="font-bold text-amber-200">-C${totalExpenses.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Lista de Movimientos y Gastos */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">Gastos y Egresos de la Ruta</h2>

        {isLoadingMovements ? (
          <div className="p-8 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            Cargando registros...
          </div>
        ) : movements.length === 0 ? (
          <div className="p-6 bg-card border border-border rounded-2xl text-center space-y-1">
            <p className="text-xs font-semibold text-foreground">Sin gastos registrados hoy</p>
            <p className="text-[11px] text-foreground-muted">
              Si realizas compras, recarga de gasolina o pagos de encomiendas, regístralos aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {movements.map((m) => (
              <div
                key={m.id}
                className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {m.movement_type === 'fuel' ? (
                      <Fuel className="h-4 w-4" />
                    ) : m.movement_type === 'purchase' ? (
                      <ShoppingCart className="h-4 w-4" />
                    ) : (
                      <Receipt className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">{m.description}</h3>
                    <p className="text-[10px] text-foreground-muted">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400 block">
                    -C${m.amount.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-foreground-muted uppercase">
                    {m.payment_method}
                  </span>
                </div>
              </div>
            ))}
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
