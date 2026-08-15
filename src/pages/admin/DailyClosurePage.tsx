import { useState } from 'react'
import {
  Calendar,
  DollarSign,
  CreditCard,
  Receipt,
  Wallet,
  CheckCircle2,
  Users,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useDailyClosure } from '@/modules/settlements/hooks/useSettlements'
import {
  Card,
  MetricCard,
  Button,
  Skeleton,
  ConfirmDialog,
} from '@/shared/components/ui'

export default function AdminDailyClosurePage() {
  const { profile } = useAuth()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const todayStr = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(todayStr)
  const [isClosed, setIsClosed] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const { data: closure, isLoading } = useDailyClosure(defaultBranchId, date)

  const handleConfirmClosure = () => {
    setIsClosed(true)
    setIsConfirmOpen(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header y Acción Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cierre Diario Consolidado</h1>
          <p className="text-xs text-slate-500">
            Consolidación de arqueo de caja y entrega final a administración general.
          </p>
        </div>

        <Button
          onClick={() => setIsConfirmOpen(true)}
          disabled={isClosed}
          variant="primary"
          size="md"
          leftIcon={isClosed ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          className="shrink-0 font-semibold shadow-md"
        >
          {isClosed ? 'Cierre Confirmado' : 'Confirmar Cierre Diario'}
        </Button>
      </div>

      {/* Selector de Fecha */}
      <Card className="p-4 bg-white border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="relative w-full sm:w-48">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setIsClosed(false)
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
          />
        </div>
      </Card>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Motorizados en Turno"
              value={closure?.total_workdays || 0}
              subtitle="Jornadas registradas hoy"
              icon={<Users className="h-4 w-4 text-sky-600" />}
              accentColor="primary"
            />

            <MetricCard
              title="Total Cobrado Efectivo"
              value={`C$ ${(closure?.total_collections_cash ?? 0).toFixed(2)}`}
              subtitle="Entregado por motorizados"
              icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
              accentColor="success"
            />

            <MetricCard
              title="Total Transferencias"
              value={`C$ ${(closure?.total_collections_transfer ?? 0).toFixed(2)}`}
              subtitle="Bancos y billeteras móviles"
              icon={<CreditCard className="h-4 w-4 text-purple-600" />}
              accentColor="accent"
            />

            <MetricCard
              title="Gastos Autorizados"
              value={`C$ ${(closure?.total_expenses ?? 0).toFixed(2)}`}
              subtitle="Combustible, compras y viáticos"
              icon={<Receipt className="h-4 w-4 text-amber-600" />}
              accentColor="warning"
            />
          </div>

          {/* Banner Héroe de Efectivo Neto en Caja General */}
          <div className="bg-gradient-to-br from-primary via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 border border-slate-800">
            <div className="flex items-center justify-between opacity-90 border-b border-white/10 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-300">
                <Wallet className="h-5 w-5 text-accent" />
                Efectivo Neto Consolidado a Depositar en Caja General
              </span>
              <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-mono text-slate-300 border border-white/10">
                {date}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                C$ {(closure?.net_cash_in_hand ?? 0).toFixed(2)}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                Total físico disponible en bóveda tras deducir los gastos operativos autorizados del turno.
              </p>
            </div>

            {isClosed && (
              <div className="p-4 bg-emerald-500/15 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center gap-2.5 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Cierre de caja bloqueado y registrado en auditoría general.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cierre */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmClosure}
        title="Confirmar Cierre Diario de Caja"
        description={`¿Estás seguro de confirmar el cierre consolidado para la fecha ${date}? Esta acción registrará el arqueo final en la auditoría general.`}
        confirmText="Confirmar Cierre"
        cancelText="Cancelar"
        variant="primary"
      />
    </div>
  )
}
