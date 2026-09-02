import { useState } from 'react'
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
} from 'lucide-react'

import { useAuth } from '@/modules/auth/useAuth'
import { useDailyClosure, useSettlementMutations } from '@/modules/settlements/hooks/useSettlements'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import {
  Card,
  MetricCard,
  Button,
  Badge,
  Skeleton,
  ConfirmDialog,
  EmptyState,
  useToast,
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const { data: branches = [] } = useBranches()
  const { data: closure, isLoading } = useDailyClosure(selectedBranchId || undefined, date)
  const { confirmDailyClosure, isConfirmingDailyClosure } = useSettlementMutations()

  const workdaysDetail = closure?.workdays_detail || []
  const isAllClosed = workdaysDetail.length > 0 && workdaysDetail.every((w) => w.status === 'closed')

  const handleConfirmClosure = async () => {
    try {
      await confirmDailyClosure({
        branchId: selectedBranchId || undefined,
        date,
      })
      setIsConfirmOpen(false)
      toast.success(
        'Cierre Diario Confirmado',
        `Se han cerrado formalmente todas las jornadas para la fecha ${date}.`
      )
    } catch (err) {
      toast.error('Error en Cierre Diario', (err as Error).message)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header y Acción Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cierre Diario Consolidado</h1>
          <p className="text-xs text-slate-500">
            Consolidación de arqueo de caja, recaudaciones de motorizados y entrega final a administración general.
          </p>
        </div>

        <Button
          onClick={() => setIsConfirmOpen(true)}
          disabled={isAllClosed || (closure?.total_workdays || 0) === 0}
          isLoading={isConfirmingDailyClosure}
          variant="primary"
          size="md"
          leftIcon={isAllClosed ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          className="shrink-0 font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isAllClosed ? 'Cierre Confirmado' : 'Confirmar Cierre Diario'}
        </Button>
      </div>

      {/* Selector de Fecha y Sucursal */}
      <Card className="p-4 bg-white border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Motorizados en Turno"
              value={closure?.total_workdays || 0}
              subtitle="Jornadas registradas en la fecha"
              icon={<Users className="h-4 w-4 text-sky-600" />}
              accentColor="primary"
            />

            <MetricCard
              title="Total Cobrado Efectivo"
              value={`C$ ${(closure?.total_collections_cash ?? 0).toFixed(2)}`}
              subtitle="Cobros de entregas en ruta"
              icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
              accentColor="success"
            />

            <MetricCard
              title="Gastos Autorizados"
              value={`-C$ ${(closure?.total_expenses ?? 0).toFixed(2)}`}
              subtitle="Combustible, compras y viáticos"
              icon={<Receipt className="h-4 w-4 text-rose-600" />}
              accentColor="destructive"
            />

            <MetricCard
              title="Entregas Previas a Caja"
              value={`C$ ${(closure?.total_already_received ?? 0).toFixed(2)}`}
              subtitle="Efectivo entregado en oficina"
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
                Total físico efectivamente recibido por administración (Entregas parciales en ventanilla + Liquidaciones aprobadas del turno).
              </p>
            </div>

            {isAllClosed && (
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
                      <th className="py-3.5 px-3">Cobros (+)</th>
                      <th className="py-3.5 px-3">Gastos (-)</th>
                      <th className="py-3.5 px-3">Entregado Previo</th>
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
                        <td className="py-3 px-3 font-semibold text-emerald-700 font-mono">
                          +C$ {w.collections.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-rose-600 font-mono">
                          {w.expenses > 0 ? `-C$ ${w.expenses.toFixed(2)}` : 'C$ 0.00'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-sky-700 font-mono">
                          {w.alreadyReceived > 0 ? `C$ ${w.alreadyReceived.toFixed(2)}` : 'C$ 0.00'}
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

