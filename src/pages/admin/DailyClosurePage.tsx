import { useState } from 'react'
import {
  Calendar,
  Building,
  DollarSign,
  CreditCard,
  Receipt,
  Wallet,
  CheckCircle2,
  Loader2,
  Users,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { useDailyClosure } from '@/modules/settlements/hooks/useSettlements'

export default function AdminDailyClosurePage() {
  const { profile } = useAuth()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(todayStr)
  const [isClosed, setIsClosed] = useState(false)

  const { data: closure, isLoading } = useDailyClosure(defaultBranchId, date)

  const handleConfirmClosure = () => {
    if (window.confirm('¿Confirmar el Cierre Diario de la Sucursal para la fecha seleccionada?')) {
      setIsClosed(true)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cierre Diario Consolidado</h1>
          <p className="text-xs text-foreground-muted">
            Consolidación de arqueo de caja y entrega final a administración general.
          </p>
        </div>

        <button
          onClick={handleConfirmClosure}
          disabled={isClosed}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-xl shadow-md transition cursor-pointer shrink-0"
        >
          {isClosed ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Cierre Confirmado
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Confirmar Cierre Diario
            </>
          )}
        </button>
      </div>

      {/* Selector de Fecha */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center gap-3">
        <div className="relative w-full sm:w-48">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setIsClosed(false)
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-xs">Calculando consolidado diario...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grid de Totales Consolidados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="text-xs font-medium">Motorizados en Turno</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{closure?.total_workdays || 0}</p>
              <p className="text-[11px] text-foreground-muted">Jornadas registradas hoy</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="text-xs font-medium">Total Cobrado Efectivo</span>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                C${(closure?.total_collections_cash ?? 0).toFixed(2)}
              </p>
              <p className="text-[11px] text-foreground-muted">Entregado por motorizados</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="text-xs font-medium">Total Transferencias</span>
                <CreditCard className="h-4 w-4 text-sky-500" />
              </div>
              <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                C${(closure?.total_collections_transfer ?? 0).toFixed(2)}
              </p>
              <p className="text-[11px] text-foreground-muted">Bancos y billeteras móviles</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="text-xs font-medium">Gastos Autorizados</span>
                <Receipt className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                C${(closure?.total_expenses ?? 0).toFixed(2)}
              </p>
              <p className="text-[11px] text-foreground-muted">Combustible, compras y viáticos</p>
            </div>
          </div>

          {/* Card Principal de Efectivo Neto en Caja General */}
          <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between opacity-90">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Efectivo Neto Consolidado a Depositar en Caja General
              </span>
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-mono">
                {date}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-4xl font-black tracking-tight">
                C${(closure?.net_cash_in_hand ?? 0).toFixed(2)}
              </p>
              <p className="text-xs opacity-80">
                Total Físico disponible tras deducir gastos aprobados de la jornada.
              </p>
            </div>

            {isClosed && (
              <div className="p-3 bg-white/10 rounded-2xl text-xs flex items-center gap-2 border border-white/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Cierre de caja bloqueado y registrado en auditoría general.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
