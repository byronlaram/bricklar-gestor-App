import { useMemo } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bike,
  DollarSign,
  TrendingUp,
  BarChart3,
  Loader2,
  ArrowRight,
  CalendarCheck2,
  Package,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/AuthContext'

// ─── Queries de KPI ──────────────────────────────────────────────────────────
async function fetchDashboardData(branchIds: string[]) {
  const today = new Date().toISOString().split('T')[0]

  const [tasksRes, workdaysRes, settlementsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, status, financial_status, created_at')
      .in('branch_id', branchIds),
    supabase
      .from('workdays')
      .select('id, courier_id, status, initial_cash')
      .gte('work_date', today)
      .lte('work_date', today)
      .in('branch_id', branchIds),
    supabase
      .from('settlements')
      .select('id, status, actual_cash, actual_transfers, total_expenses')
      .gte('settlement_date', today)
      .in('branch_id', branchIds),
  ])

  return {
    tasks: tasksRes.data ?? [],
    workdays: workdaysRes.data ?? [],
    settlements: settlementsRes.data ?? [],
  }
}

function useDashboard(branchIds: string[]) {
  return useQuery({
    queryKey: ['dashboard', branchIds],
    queryFn: () => fetchDashboardData(branchIds),
    enabled: branchIds.length > 0,
    refetchInterval: 1000 * 60, // Refresca cada minuto
    staleTime: 1000 * 30,
  })
}

// ─── Componentes ─────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  colorClass: string
  to?: string
}

function KpiCard({ label, value, subtitle, icon, colorClass, to }: KpiCardProps) {
  const content = (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl border ${colorClass}`}>{icon}</div>
        {to && (
          <ArrowRight className="h-4 w-4 text-foreground-subtle group-hover:text-accent transition-colors" />
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
        {subtitle && <p className="text-[11px] text-foreground-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )

  if (to) return <Link to={to}>{content}</Link>
  return content
}

// ─── Barra de distribución de estados de tareas ─────────────────────────────
function TaskStatusBar({
  tasks,
}: {
  tasks: { status: string }[]
}) {
  const total = tasks.length
  if (total === 0) return null

  const groups = [
    { key: 'completed', label: 'Completadas', color: 'bg-emerald-500' },
    { key: 'en_route', label: 'En ruta', color: 'bg-sky-500' },
    { key: 'in_progress', label: 'En gestión', color: 'bg-blue-500' },
    { key: 'pending', label: 'Pendientes', color: 'bg-amber-400' },
    { key: 'assigned', label: 'Asignadas', color: 'bg-violet-400' },
    { key: 'not_completed', label: 'No completadas', color: 'bg-rose-500' },
    { key: 'cancelled', label: 'Canceladas', color: 'bg-foreground-subtle' },
  ]

  const counts = groups.map((g) => ({
    ...g,
    count: tasks.filter((t) => t.status === g.key).length,
    pct: (tasks.filter((t) => t.status === g.key).length / total) * 100,
  }))

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Distribución de Tareas</h3>
        <span className="text-xs text-foreground-muted font-mono">{total} total</span>
      </div>

      {/* Barra apilada */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px bg-muted/30">
        {counts
          .filter((c) => c.count > 0)
          .map((c) => (
            <div
              key={c.key}
              className={`${c.color} transition-all`}
              style={{ width: `${c.pct}%` }}
              title={`${c.label}: ${c.count}`}
            />
          ))}
      </div>

      {/* Leyenda */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {counts
          .filter((c) => c.count > 0)
          .map((c) => (
            <div key={c.key} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full shrink-0 ${c.color}`} />
              <span className="text-[11px] text-foreground-muted">
                {c.label}{' '}
                <span className="font-semibold text-foreground">{c.count}</span>
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile } = useAuth()
  const branchIds = profile?.branch_ids ?? []

  const { data, isLoading } = useDashboard(branchIds)

  const kpis = useMemo(() => {
    if (!data) return null
    const { tasks, workdays, settlements } = data

    const today = new Date().toISOString().split('T')[0]
    const todayTasks = tasks.filter((t) => t.created_at?.startsWith(today))

    const totalCash = settlements.reduce((s, r) => s + (r.actual_cash ?? 0), 0)
    const totalTransfer = settlements.reduce((s, r) => s + (r.actual_transfers ?? 0), 0)
    const totalExpenses = settlements.reduce((s, r) => s + (r.total_expenses ?? 0), 0)
    const netCash = totalCash - totalExpenses

    return {
      totalTasks: tasks.length,
      todayTasks: todayTasks.length,
      pending: tasks.filter((t) => ['pending', 'assigned'].includes(t.status)).length,
      inRoute: tasks.filter((t) => ['en_route', 'in_progress'].includes(t.status)).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      notCompleted: tasks.filter((t) => t.status === 'not_completed').length,
      activeCouriers: workdays.filter((w) => w.status === 'open').length,
      totalCash,
      totalTransfer,
      totalExpenses,
      netCash,
      pendingSettlements: settlements.filter((s) => s.status === 'pending_review').length,
    }
  }, [data])

  const today = new Date().toLocaleDateString('es-NI', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-xs text-foreground-muted capitalize mt-0.5">{today}</p>
      </div>

      {isLoading || !kpis ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-foreground-muted">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-xs">Calculando KPIs del día...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Fila 1 — Operaciones */}
          <div>
            <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              Operaciones del Día
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Tareas Creadas Hoy"
                value={kpis.todayTasks}
                subtitle={`${kpis.totalTasks} en total`}
                icon={<ClipboardList className="h-5 w-5" />}
                colorClass="bg-accent/10 text-accent border-accent/20"
                to="/admin/tareas"
              />
              <KpiCard
                label="Completadas"
                value={kpis.completed}
                subtitle="Finalizadas exitosamente"
                icon={<CheckCircle2 className="h-5 w-5" />}
                colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                to="/admin/tareas"
              />
              <KpiCard
                label="En Ruta / Gestión"
                value={kpis.inRoute}
                subtitle="En proceso ahora"
                icon={<Clock className="h-5 w-5" />}
                colorClass="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                to="/admin/tareas"
              />
              <KpiCard
                label="Sin Completar"
                value={kpis.notCompleted}
                subtitle="Requieren seguimiento"
                icon={<AlertCircle className="h-5 w-5" />}
                colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                to="/admin/tareas"
              />
            </div>
          </div>

          {/* Fila 2 — Personal y Liquidaciones */}
          <div>
            <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              Personal y Liquidaciones
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Motorizados Activos"
                value={kpis.activeCouriers}
                subtitle="Jornadas abiertas hoy"
                icon={<Bike className="h-5 w-5" />}
                colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
                to="/admin/jornadas"
              />
              <KpiCard
                label="Liquidaciones Pendientes"
                value={kpis.pendingSettlements}
                subtitle="Esperan revisión"
                icon={<Package className="h-5 w-5" />}
                colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                to="/admin/liquidaciones"
              />
              <KpiCard
                label="Recaudado Hoy (Efectivo)"
                value={`C$${kpis.totalCash.toFixed(2)}`}
                subtitle="Entregado por motorizados"
                icon={<DollarSign className="h-5 w-5" />}
                colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                to="/admin/liquidaciones"
              />
              <KpiCard
                label="Neto en Caja"
                value={`C$${kpis.netCash.toFixed(2)}`}
                subtitle={`Transferencias: C$${kpis.totalTransfer.toFixed(2)}`}
                icon={<TrendingUp className="h-5 w-5" />}
                colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                to="/admin/cierre-diario"
              />
            </div>
          </div>

          {/* Distribución de tareas */}
          {data && <TaskStatusBar tasks={data.tasks} />}

          {/* Accesos rápidos */}
          <div>
            <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              Accesos Rápidos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { to: '/admin/tareas', label: 'Gestionar Tareas', icon: <ClipboardList className="h-5 w-5" />, desc: 'Ver, crear y asignar tareas del día' },
                { to: '/admin/jornadas', label: 'Control de Jornadas', icon: <CalendarCheck2 className="h-5 w-5" />, desc: 'Fondos iniciales y jornadas activas' },
                { to: '/admin/reportes', label: 'Reportes Ejecutivos', icon: <BarChart3 className="h-5 w-5" />, desc: 'Exportar datos por rango de fecha' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl shadow-xs hover:shadow-md hover:border-accent/30 transition-all group"
                >
                  <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20 shrink-0 group-hover:bg-accent group-hover:text-white transition-all">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-foreground-muted truncate">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-foreground-subtle ml-auto shrink-0 group-hover:text-accent transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
