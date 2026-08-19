import { useState, useMemo } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bike,
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowRight,
  CalendarCheck2,
  PackageCheck,
  Package,
  Layers,
  Building2,
  Calendar,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/useAuth'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import {
  Card,
  CardTitle,
  CardDescription,
  MetricCard,
  BentoCard,
  Badge,
  Skeleton,
  EmptyState,
  Button,
  Divider,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'

// ─── Queries de KPI ──────────────────────────────────────────────────────────

async function fetchDashboardData(branchIds: string[], targetDate: string) {
  try {
    let tasksQuery = supabase
      .from('tasks')
      .select('id, status, financial_status, created_at, scheduled_date, branch_id')
      .eq('scheduled_date', targetDate)

    let workdaysQuery = supabase
      .from('workdays')
      .select('id, courier_id, status, initial_cash, branch_id')
      .eq('work_date', targetDate)

    let settlementsQuery = supabase
      .from('settlements')
      .select('id, status, actual_cash, actual_transfers, total_expenses, branch_id')
      .eq('settlement_date', targetDate)

    // Si se especificaron sucursales, filtrar por ellas
    if (branchIds && branchIds.length > 0) {
      tasksQuery = tasksQuery.in('branch_id', branchIds)
      workdaysQuery = workdaysQuery.in('branch_id', branchIds)
      settlementsQuery = settlementsQuery.in('branch_id', branchIds)
    }

    const [tasksRes, workdaysRes, settlementsRes] = await Promise.all([
      tasksQuery,
      workdaysQuery,
      settlementsQuery,
    ])

    return {
      tasks: tasksRes.data ?? [],
      workdays: workdaysRes.data ?? [],
      settlements: settlementsRes.data ?? [],
    }
  } catch (err) {
    console.error('[Dashboard] Error fetching dashboard data:', err)
    return {
      tasks: [],
      workdays: [],
      settlements: [],
    }
  }
}

function useDashboard(branchIds: string[], targetDate: string) {
  return useQuery({
    queryKey: ['dashboard', branchIds, targetDate],
    queryFn: () => fetchDashboardData(branchIds, targetDate),
    enabled: true,
    refetchInterval: 1000 * 60, // Refresca cada minuto
    staleTime: 1000 * 30,
  })
}

// ─── Componente Barra de distribución de estados de tareas ──────────────────

function TaskStatusBar({ tasks, dateLabel }: { tasks: { status: string }[]; dateLabel?: string }) {
  const total = tasks.length
  if (total === 0) return null

  const groups = [
    { key: 'completed', label: 'Completadas', color: 'bg-emerald-500' },
    { key: 'en_route', label: 'En ruta', color: 'bg-sky-500' },
    { key: 'in_progress', label: 'En gestión', color: 'bg-blue-500' },
    { key: 'pending', label: 'Pendientes', color: 'bg-amber-400' },
    { key: 'assigned', label: 'Asignadas', color: 'bg-violet-400' },
    { key: 'not_completed', label: 'No completadas', color: 'bg-rose-500' },
    { key: 'cancelled', label: 'Canceladas', color: 'bg-slate-400' },
  ]

  const counts = groups.map((g) => ({
    ...g,
    count: tasks.filter((t) => t.status === g.key).length,
    pct: (tasks.filter((t) => t.status === g.key).length / total) * 100,
  }))

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-base">Distribución de Tareas ({dateLabel || 'Fecha Seleccionada'})</CardTitle>
          <CardDescription>Resumen gráfico del progreso operativo</CardDescription>
        </div>
        <Badge variant="neutral" size="md">
          {total} tareas totales
        </Badge>
      </div>

      {/* Barra Apilada */}
      <div className="flex h-3.5 rounded-full overflow-hidden gap-0.5 bg-slate-100 p-0.5 border border-slate-200">
        {counts
          .filter((c) => c.count > 0)
          .map((c) => (
            <div
              key={c.key}
              className={`${c.color} transition-all rounded-xs`}
              style={{ width: `${c.pct}%` }}
              title={`${c.label}: ${c.count}`}
            />
          ))}
      </div>

      {/* Leyenda Semántica */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {counts
          .filter((c) => c.count > 0)
          .map((c) => (
            <div
              key={c.key}
              className="inline-flex items-center gap-2 text-xs bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs"
            >
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${c.color}`} aria-hidden="true" />
              <span className="text-slate-600 font-medium">{c.label}</span>
              <span className="font-bold text-slate-900 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200/70 shadow-2xs text-[11px]">
                {c.count}
              </span>
            </div>
          ))}
      </div>
    </Card>
  )
}

// ─── Página Principal Dashboard Rediseñada ──────────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuth()
  const { data: branches = [] } = useBranches()
  const todayStr = getLocalDateString()

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  const isToday = selectedDate === todayStr

  const effectiveBranchIds = useMemo(() => {
    if (selectedBranchId !== 'all') return [selectedBranchId]
    if (profile?.branch_ids && profile.branch_ids.length > 0) return profile.branch_ids
    return []
  }, [selectedBranchId, profile?.branch_ids])

  const { data, isLoading } = useDashboard(effectiveBranchIds, selectedDate)

  const kpis = useMemo(() => {
    const tasks = data?.tasks ?? []
    const workdays = data?.workdays ?? []
    const settlements = data?.settlements ?? []

    const totalCash = settlements.reduce((s, r) => s + (Number(r.actual_cash) || 0), 0)
    const totalTransfer = settlements.reduce((s, r) => s + (Number(r.actual_transfers) || 0), 0)
    const totalExpenses = settlements.reduce((s, r) => s + (Number(r.total_expenses) || 0), 0)
    const netCash = totalCash - totalExpenses

    return {
      totalTasks: tasks.length,
      pending: tasks.filter((t) => ['pending', 'assigned'].includes(t.status)).length,
      inRoute: tasks.filter((t) => ['en_route', 'in_progress'].includes(t.status)).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      notCompleted: tasks.filter((t) => t.status === 'not_completed').length,
      activeCouriers: workdays.filter((w) => w.status === 'open').length,
      totalCash,
      totalTransfer,
      totalExpenses,
      netCash,
      pendingSettlements: settlements.filter((s) => s.status === 'pending_review' || s.status === 'pending_settlement').length,
    }
  }, [data])

  const dateFormatted = useMemo(() => {
    // Parse YYYY-MM-DD safely
    const [year, month, day] = selectedDate.split('-').map(Number)
    const dateObj = new Date(year, month - 1, day)
    return dateObj.toLocaleDateString('es-NI', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [selectedDate])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Banner / Saludo Operativo */}
      <BentoCard isHero className="p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-2xs font-bold uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5" /> Centro de Operaciones Administrador
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Bienvenido, {profile?.full_name ?? 'Administrador'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 capitalize">
              {dateFormatted} {isToday && '(Hoy)'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Fecha */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <Calendar className="h-4 w-4 text-accent shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                aria-label="Seleccionar fecha para el dashboard"
              />
            </div>

            {/* Selector de Sucursal */}
            {branches.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <Building2 className="h-4 w-4 text-accent shrink-0" />
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">Sucursal:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
                  aria-label="Filtrar métricas por sucursal"
                >
                  <option value="all">Todas las sucursales</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Link to="/admin/tareas">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Ver Listado de Tareas
              </Button>
            </Link>
          </div>
        </div>
      </BentoCard>

      {/* ESTADO DE CARGA SKELETON */}
      {isLoading || !kpis ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECCIÓN 1: OPERACIONES DEL DÍA (MetricCards) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isToday ? 'Operaciones del Día (Hoy)' : `Operaciones del ${selectedDate}`}
              </h3>
              <Badge variant={isToday ? 'assigned' : 'neutral'} size="sm">
                {isToday ? 'Actualización en vivo' : selectedDate}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to={`/admin/tareas`}>
                <MetricCard
                  title={isToday ? 'Tareas Registradas Hoy' : 'Tareas Registradas'}
                  value={kpis.totalTasks}
                  subtitle={`${kpis.totalTasks} asignadas para esta fecha`}
                  icon={<ClipboardList className="h-5 w-5 text-accent" />}
                  accentColor="accent"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/tareas">
                <MetricCard
                  title="Entregas Completadas"
                  value={kpis.completed}
                  subtitle="Finalizadas sin incidencias"
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  accentColor="success"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/tareas">
                <MetricCard
                  title="En Ruta / Gestión"
                  value={kpis.inRoute}
                  subtitle="Motorizados en tránsito"
                  icon={<Clock className="h-5 w-5 text-sky-600" />}
                  accentColor="primary"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/tareas">
                <MetricCard
                  title="Por Completar / Asignadas"
                  value={kpis.pending + kpis.notCompleted}
                  subtitle={`${kpis.pending} asignadas activas`}
                  icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
                  accentColor="warning"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>
            </div>
          </div>

          <Divider />

          {/* SECCIÓN 2: PERSONAL Y RECAUDACIÓN (MetricCards) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Personal & Estado Financiero ({selectedDate})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/admin/jornadas">
                <MetricCard
                  title="Motorizados Activos"
                  value={kpis.activeCouriers}
                  subtitle="Jornadas abiertas en la fecha"
                  icon={<Bike className="h-5 w-5 text-purple-600" />}
                  accentColor="accent"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/liquidaciones">
                <MetricCard
                  title="Liquidaciones Pendientes"
                  value={kpis.pendingSettlements}
                  subtitle="Pendientes de aprobación"
                  icon={<Package className="h-5 w-5 text-amber-500" />}
                  accentColor="warning"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/liquidaciones">
                <MetricCard
                  title="Recaudado en Efectivo"
                  value={`C$ ${(Number(kpis.totalCash) || 0).toFixed(2)}`}
                  subtitle="Monto reportado en caja"
                  icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                  accentColor="success"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/cierre-diario">
                <MetricCard
                  title="Neto Consolidado"
                  value={`C$ ${(Number(kpis.netCash) || 0).toFixed(2)}`}
                  subtitle={`Transf: C$ ${(Number(kpis.totalTransfer) || 0).toFixed(2)}`}
                  icon={<TrendingUp className="h-5 w-5 text-primary" />}
                  accentColor="primary"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>
            </div>
          </div>

          {/* SECCIÓN 3: DISTRIBUCIÓN O ESTADO VACÍO */}
          {data && data.tasks && data.tasks.length > 0 ? (
            <TaskStatusBar tasks={data.tasks} dateLabel={isToday ? 'Hoy' : selectedDate} />
          ) : (
            <EmptyState
              title={`Sin tareas registradas para el ${selectedDate}`}
              description="Actualmente no hay órdenes de despacho o entregas agendadas para esta fecha."
              icon={<PackageCheck className="h-7 w-7 text-slate-400" />}
              action={
                <Link to="/admin/tareas">
                  <Button variant="primary" size="sm">Crear Nueva Tarea</Button>
                </Link>
              }
            />
          )}

          <Divider />

          {/* SECCIÓN 4: ACCESOS RÁPIDOS A MÓDULOS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Accesos Rápidos de Administración
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card isHoverable className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-sky-50 text-accent flex items-center justify-center border border-sky-100">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <Badge variant="assigned" size="sm">Operaciones</Badge>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">Gestión de Tareas</CardTitle>
                  <CardDescription>
                    Asignación, reasignación y seguimiento de órdenes en tiempo real.
                  </CardDescription>
                </div>
                <div className="pt-2">
                  <Link to="/admin/tareas">
                    <Button variant="outline" size="sm" className="w-full justify-between" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Ir a Tareas
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card isHoverable className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                    <CalendarCheck2 className="h-5 w-5" />
                  </div>
                  <Badge variant="en_route" size="sm">Jornadas</Badge>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">Control de Fondos</CardTitle>
                  <CardDescription>
                    Apertura de caja chica, adelantos y cierres de turno por motorizado.
                  </CardDescription>
                </div>
                <div className="pt-2">
                  <Link to="/admin/jornadas">
                    <Button variant="outline" size="sm" className="w-full justify-between" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Ver Jornadas
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card isHoverable className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <Badge variant="completed" size="sm">Reportes</Badge>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">Reportes Ejecutivos</CardTitle>
                  <CardDescription>
                    Generación de informes de rendimiento y exportación a PDF/CSV.
                  </CardDescription>
                </div>
                <div className="pt-2">
                  <Link to="/admin/reportes">
                    <Button variant="outline" size="sm" className="w-full justify-between" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Ver Reportes
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
