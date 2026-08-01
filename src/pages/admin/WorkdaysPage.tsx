import { useState } from 'react'
import {
  Calendar,
  Clock,
  Gauge,
  Banknote,
  Loader2,
  CheckCircle2,
  Play,
  ListFilter,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { useWorkdays } from '@/modules/workdays/hooks/useWorkday'
import type { WorkdayFilters, Workday } from '@/modules/workdays/types/workdays.types'
import { WORKDAY_STATUS_LABELS } from '@/shared/types'
import { AddCashAdvanceModal } from '@/modules/settlements/components/AddCashAdvanceModal'

export default function AdminWorkdaysPage() {
  const { profile } = useAuth()
  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''

  const [filters, setFilters] = useState<WorkdayFilters>({
    branch_id: defaultBranchId,
    date: '',
  })

  const [cashAdvanceWorkday, setCashAdvanceWorkday] = useState<Workday | null>(null)
  const [isGlobalCashAdvanceOpen, setIsGlobalCashAdvanceOpen] = useState(false)

  const { data: workdays = [], isLoading, isError, error } = useWorkdays(filters)

  // Métricas
  const openCount = workdays.filter((w) => w.status === 'open').length
  const pendingSettlementCount = workdays.filter((w) => w.status === 'pending_settlement').length
  const closedCount = workdays.filter((w) => w.status === 'closed' || w.status === 'reviewed').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Control de Jornadas Laborales</h1>
          <p className="text-xs text-foreground-muted">
            Monitorea los turnos de trabajo, kilometraje y asignación de fondos de caja a motorizados.
          </p>
        </div>

        <button
          onClick={() => setIsGlobalCashAdvanceOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer shrink-0"
        >
          <Banknote className="h-4 w-4" />
          + Entregar Efectivo / Fondo
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <ListFilter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Total Jornadas</p>
            <p className="text-lg font-bold text-foreground">{workdays.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Play className="h-4 w-4 fill-current" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Jornadas Abiertas</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{openCount}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Pend. Liquidación</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {pendingSettlementCount}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-500/10 text-slate-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted font-medium">Cerradas / Revisadas</p>
            <p className="text-lg font-bold text-foreground">{closedCount}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-48">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="date"
            value={filters.date || ''}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
          >
            <option value="">Todos los estados</option>
            <option value="open">Abierta</option>
            <option value="pending_settlement">Pendiente Liquidación</option>
          </select>
        </div>
      </div>

      {/* Tabla de Jornadas */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Cargando jornadas laborales...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-xs text-destructive">
            Error al cargar jornadas: {(error as Error).message}
          </div>
        ) : workdays.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">No hay jornadas registradas para esta fecha</p>
            <p className="text-xs text-foreground-muted">Los motorizados aparecerán al iniciar su turno.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 text-foreground-muted font-semibold border-b border-border">
                  <th className="py-3 px-4">Motorizado</th>
                  <th className="py-3 px-3">Fecha & Inicio</th>
                  <th className="py-3 px-3">Kilometraje</th>
                  <th className="py-3 px-3">Fondo Inicial</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {workdays.map((w) => {
                  const kmTraveled =
                    w.final_km && w.initial_km ? w.final_km - w.initial_km : null

                  return (
                    <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-xs">
                            {w.courier_profile?.full_name?.[0] || 'M'}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">
                              {w.courier_profile?.display_name || w.courier_profile?.full_name}
                            </div>
                            {w.courier_profile?.phone && (
                              <div className="text-[10px] text-foreground-muted">{w.courier_profile.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-foreground">{w.work_date}</div>
                        <div className="text-[10px] text-foreground-muted">
                          Inicio: {w.start_time ? new Date(w.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <Gauge className="h-3.5 w-3.5 text-accent" />
                          Inicial: {w.initial_km ?? 0} km
                        </div>
                        {w.final_km !== null && w.final_km !== undefined ? (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            Final: {w.final_km} km ({kmTraveled} km recorridos)
                          </div>
                        ) : (
                          <div className="text-[10px] text-foreground-muted italic">En recorrido...</div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-foreground">
                          C${(w.initial_cash ?? 0).toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            w.status === 'open'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : w.status === 'pending_settlement'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                          }`}
                        >
                          {w.status === 'open' && <Play className="h-3 w-3 fill-current" />}
                          {(WORKDAY_STATUS_LABELS && WORKDAY_STATUS_LABELS[w.status]) || w.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setCashAdvanceWorkday(w)}
                          title="Entregar efectivo o adelanto al motorizado"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer"
                        >
                          <Banknote className="h-4 w-4" />
                          Entregar Efectivo
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Entregar Efectivo / Fondo */}
      <AddCashAdvanceModal
        branchId={filters.branch_id || defaultBranchId}
        workdayId={cashAdvanceWorkday?.id}
        courierName={cashAdvanceWorkday?.courier_profile?.display_name || cashAdvanceWorkday?.courier_profile?.full_name}
        isOpen={isGlobalCashAdvanceOpen || !!cashAdvanceWorkday}
        onClose={() => {
          setCashAdvanceWorkday(null)
          setIsGlobalCashAdvanceOpen(false)
        }}
      />
    </div>
  )
}
