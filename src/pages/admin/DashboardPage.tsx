import { useState, useMemo } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowRight,
  CalendarCheck2,
  PackageCheck,
  Layers,
  Building2,
  Calendar,
  Award,
  Printer,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/useAuth'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import { calculateWorkdayCashSummary } from '@/modules/workdays/utils/workdayCalculations'
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
import { formatDate } from '@/shared/utils/format'
import { generateExecutiveDashboardReceipt } from '@/shared/utils/pdfReceiptService'

// ─── Queries de KPI ──────────────────────────────────────────────────────────

async function fetchDashboardData(branchIds: string[], targetDate: string) {
  try {
    let tasksQuery = supabase
      .from('tasks')
      .select(
        'id, title, status, financial_status, created_at, scheduled_date, branch_id, assigned_courier_id, requires_collection, expected_collection_amount, expected_collection_currency, expected_payment_method, requires_payment, expected_payment_amount, expected_payment_currency, metadata'
      )
      .eq('scheduled_date', targetDate)

    let workdaysQuery = supabase
      .from('workdays')
      .select('id, courier_id, status, initial_cash, branch_id')
      .eq('work_date', targetDate)

    let settlementsQuery = supabase
      .from('settlements')
      .select('id, workday_id, courier_id, status, actual_cash, actual_transfers, total_expenses, expected_cash, branch_id')
      .eq('settlement_date', targetDate)

    // Si se especificaron sucursales, filtrar por ellas
    if (branchIds && branchIds.length > 0) {
      tasksQuery = tasksQuery.in('branch_id', branchIds)
      workdaysQuery = workdaysQuery.in('branch_id', branchIds)
      settlementsQuery = settlementsQuery.in('branch_id', branchIds)
    }

    const couriersQuery = supabase
      .from('profiles')
      .select('id, full_name, display_name, email, phone, avatar_url, role')
      .eq('role', 'courier')

    const [tasksRes, workdaysRes, settlementsRes, couriersRes] = await Promise.all([
      tasksQuery,
      workdaysQuery,
      settlementsQuery,
      couriersQuery,
    ])

    const tasks = tasksRes.data ?? []
    const workdays = workdaysRes.data ?? []
    const settlements = settlementsRes.data ?? []
    const couriers = couriersRes.data ?? []

    const workdayIds = workdays.map((w) => w.id)

    let movements: any[] = []
    if (workdayIds.length > 0) {
      const { data: movementsData, error: movementsErr } = await supabase
        .from('cash_movements')
        .select('id, amount, currency, direction, movement_type, description, workday_id')
        .in('workday_id', workdayIds)

      if (!movementsErr && movementsData) {
        movements = movementsData
      }
    }

    return {
      tasks,
      workdays,
      settlements,
      movements,
      couriers,
    }
  } catch (err) {
    console.error('[Dashboard] Error fetching dashboard data:', err)
    return {
      tasks: [],
      workdays: [],
      settlements: [],
      movements: [],
      couriers: [],
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
          <CardTitle className="text-base">Distribución Operativa ({dateLabel || 'Fecha Seleccionada'})</CardTitle>
          <CardDescription>Resumen visual del flujo y estado de despachos</CardDescription>
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

// ─── Componente Ranking de Motorizados ──────────────────────────────────────

interface CourierPerformance {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  totalAssigned: number
  completed: number
  inRoute: number
  notCompleted: number
  completionRate: number
  totalCollectedNIO: number
  totalCollectedUSD: number
  workdayStatus: 'open' | 'closed' | 'none'
  workdayId?: string
}

function CourierLeaderboard({ couriers }: { couriers: CourierPerformance[] }) {
  if (couriers.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/60">
        No se registran actividades o entregas asignadas para motorizados en esta fecha.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/75 text-2xs font-extrabold uppercase tracking-wider text-slate-500">
            <th className="py-3 px-3 w-12 text-center">Pos</th>
            <th className="py-3 px-4">Motorizado</th>
            <th className="py-3 px-3 text-center">Efectividad</th>
            <th className="py-3 px-3 text-center">Entregas</th>
            <th className="py-3 px-4 text-right">Recaudado (C$)</th>
            <th className="py-3 px-4 text-center">Estado Turno</th>
            <th className="py-3 px-3 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {couriers.map((c, index) => {
            const isTop1 = index === 0 && c.completed > 0
            const isTop2 = index === 1 && c.completed > 0
            const isTop3 = index === 2 && c.completed > 0

            return (
              <tr
                key={c.id}
                className="hover:bg-slate-50/80 transition-colors group"
              >
                {/* Posición / Medalla */}
                <td className="py-3.5 px-3 text-center font-bold">
                  {isTop1 ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-xs font-black shadow-2xs border border-amber-300">
                      🥇 1
                    </span>
                  ) : isTop2 ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 text-xs font-black shadow-2xs border border-slate-300">
                      🥈 2
                    </span>
                  ) : isTop3 ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/15 text-amber-900 text-xs font-black shadow-2xs border border-amber-700/30">
                      🥉 3
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono font-semibold">{index + 1}</span>
                  )}
                </td>

                {/* Perfil Motorizado */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center shrink-0 border border-sky-200 text-xs">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        c.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-accent transition-colors">
                        {c.name}
                      </div>
                      <div className="text-2xs text-slate-500">{c.email}</div>
                    </div>
                  </div>
                </td>

                {/* Barra y % de Efectividad */}
                <td className="py-3.5 px-3 text-center">
                  <div className="inline-flex flex-col items-center gap-1 w-24">
                    <div className="flex items-center justify-between w-full text-2xs font-extrabold font-mono">
                      <span
                        className={
                          c.completionRate >= 90
                            ? 'text-emerald-700'
                            : c.completionRate >= 70
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }
                      >
                        {c.completionRate.toFixed(0)}%
                      </span>
                      <span className="text-slate-400 text-3xs">{c.completed}/{c.totalAssigned}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.completionRate >= 90
                            ? 'bg-emerald-500'
                            : c.completionRate >= 70
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(100, c.completionRate)}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Cantidad Entregas */}
                <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-800 font-mono text-2xs border border-slate-200">
                    {c.completed} completadas
                  </span>
                </td>

                {/* Recaudación Total */}
                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                  C$ {c.totalCollectedNIO.toFixed(2)}
                  {c.totalCollectedUSD > 0 && (
                    <div className="text-2xs text-sky-700 font-semibold font-sans">
                      + ${c.totalCollectedUSD.toFixed(2)} USD
                    </div>
                  )}
                </td>

                {/* Estado Jornada */}
                <td className="py-3.5 px-4 text-center">
                  {c.workdayStatus === 'open' ? (
                    <Badge variant="pending" size="sm" showDot>
                      En Ruta (Abierta)
                    </Badge>
                  ) : c.workdayStatus === 'closed' ? (
                    <Badge variant="completed" size="sm">
                      Jornada Cerrada
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Sin Turno
                    </Badge>
                  )}
                </td>

                {/* Botón Ver Tareas */}
                <td className="py-3.5 px-3 text-right">
                  <Link to={`/admin/tareas?courier_id=${c.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-slate-600 hover:text-accent h-7 px-2 text-xs">
                      Ver <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Página Principal Dashboard Rediseñada ──────────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuth()
  const { data: branches = [] } = useBranches()
  const todayStr = getLocalDateString()

  // Calcular ayer en formato YYYY-MM-DD
  const yesterdayStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }, [])

  const defaultBranch =
    profile?.primary_branch_id || (profile?.branch_ids && profile.branch_ids.length === 1 ? profile.branch_ids[0] : 'all')

  const [selectedBranchId, setSelectedBranchId] = useState<string>(defaultBranch)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  const isToday = selectedDate === todayStr
  const isYesterday = selectedDate === yesterdayStr

  // Sucursales permitidas para el usuario según su rol
  const userBranches = useMemo(() => {
    if (!profile?.branch_ids || profile.branch_ids.length === 0 || profile.role === 'general_admin') {
      return branches
    }
    return branches.filter((b) => profile.branch_ids.includes(b.id))
  }, [branches, profile?.branch_ids, profile?.role])

  const effectiveBranchIds = useMemo(() => {
    if (selectedBranchId !== 'all') return [selectedBranchId]
    if (profile?.branch_ids && profile.branch_ids.length > 0 && profile.role === 'junior_admin') {
      return profile.branch_ids
    }
    return []
  }, [selectedBranchId, profile?.branch_ids, profile?.role])

  const activeBranchName = useMemo(() => {
    if (selectedBranchId === 'all') return 'Todas las Sucursales'
    return branches.find((b) => b.id === selectedBranchId)?.name || 'Sucursal Principal'
  }, [selectedBranchId, branches])

  const { data, isLoading } = useDashboard(effectiveBranchIds, selectedDate)

  // ─── Cálculos y Métricas Consolidadas ─────────────────────────────────────────

  const kpis = useMemo(() => {
    const tasks = data?.tasks ?? []
    const workdays = data?.workdays ?? []
    const settlements = data?.settlements ?? []
    const movements = data?.movements ?? []
    const couriers = data?.couriers ?? []

    const completedTasks = tasks.filter((t) => t.status === 'completed')
    const totalTasks = tasks.length
    const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0

    const settlementMap = new Map<string, any>()
    settlements.forEach((s) => settlementMap.set(s.workday_id, s))

    // Resumen de jornadas individuales
    const workdaySummaries = workdays.map((w) => {
      const wTasks = completedTasks.filter((t) => t.assigned_courier_id === w.courier_id)
      const wMovements = movements.filter((m) => m.workday_id === w.id)
      return calculateWorkdayCashSummary(w.initial_cash || 0, wTasks, wMovements)
    })

    // Total recaudado en efectivo NIO por tareas completadas
    const totalCashNIO = workdaySummaries.reduce((acc, s) => acc + s.collectionsNIO, 0)

    // Total transferencias recibidas NIO
    const totalTransferNIO = completedTasks.reduce((acc, t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      if (pb?.transfer_amount && pb.transfer_amount > 0 && pb.currency !== 'USD') {
        return acc + pb.transfer_amount
      }
      if (
        t.requires_collection &&
        t.expected_payment_method &&
        t.expected_payment_method !== 'cash' &&
        t.expected_collection_currency !== 'USD' &&
        (!pb || !pb.cash_amount)
      ) {
        return acc + (t.expected_collection_amount || 0)
      }
      return acc
    }, 0)

    // Total recaudación en USD ($)
    const totalCollectionsUSD = completedTasks.reduce((acc, t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      if (pb?.currency === 'USD' || t.expected_collection_currency === 'USD') {
        return acc + (t.expected_collection_amount || pb?.cash_amount || 0)
      }
      return acc
    }, 0)

    // Total fondos iniciales y recargas de administración
    const totalInitialNIO = workdaySummaries.reduce((acc, s) => acc + s.initialCashNIO + s.advancesNIO, 0)

    // Total compras y gastos en calle desembolsados
    const totalExpensesNIO = workdaySummaries.reduce((acc, s) => acc + s.expensesNIO, 0)

    // Entregas previas a caja / ventanilla
    const totalAlreadyReceived = workdaySummaries.reduce((acc, s) => acc + s.alreadyReceivedNIO, 0)

    // Físico esperado / liquidado en bóveda / caja general al cierre
    const netReceivedInVault = workdays.reduce((acc, w, idx) => {
      const s = settlementMap.get(w.id)
      const finalSettlementReceived =
        s && s.status === 'approved'
          ? s.actual_cash || 0
          : workdaySummaries[idx]?.cashInHandNIO || 0
      return acc + finalSettlementReceived
    }, 0)

    // Neto consolidado de operaciones (Cobros en efectivo + Fondos iniciales - Gastos - Entregas previas)
    const netOperationsCash = totalCashNIO + totalInitialNIO - totalExpensesNIO - totalAlreadyReceived
    const netCash = workdays.length > 0 ? netReceivedInVault : Math.max(0, netOperationsCash)

    // ─── Ranking de Motorizados ──────────────────────────────────────────────
    const courierStatsMap = new Map<string, CourierPerformance>()

    // Registrar todos los motorizados disponibles
    couriers.forEach((c) => {
      courierStatsMap.set(c.id, {
        id: c.id,
        name: c.display_name || c.full_name || c.email,
        email: c.email,
        avatarUrl: c.avatar_url,
        totalAssigned: 0,
        completed: 0,
        inRoute: 0,
        notCompleted: 0,
        completionRate: 0,
        totalCollectedNIO: 0,
        totalCollectedUSD: 0,
        workdayStatus: 'none',
      })
    })

    // Actualizar con datos de jornadas de la fecha
    workdays.forEach((w) => {
      const existing = courierStatsMap.get(w.courier_id)
      if (existing) {
        existing.workdayStatus = w.status === 'open' ? 'open' : 'closed'
        existing.workdayId = w.id
      }
    })

    // Actualizar con tareas de la fecha
    tasks.forEach((t) => {
      if (!t.assigned_courier_id) return
      const courier = courierStatsMap.get(t.assigned_courier_id)
      if (!courier) return

      courier.totalAssigned += 1
      if (t.status === 'completed') {
        courier.completed += 1
        if (t.requires_collection && t.expected_collection_amount) {
          if (t.expected_collection_currency === 'USD') {
            courier.totalCollectedUSD += t.expected_collection_amount
          } else {
            courier.totalCollectedNIO += t.expected_collection_amount
          }
        }
      } else if (['en_route', 'in_progress'].includes(t.status)) {
        courier.inRoute += 1
      } else if (['not_completed', 'cancelled'].includes(t.status)) {
        courier.notCompleted += 1
      }
    })

    // Calcular tasa de cumplimiento individual y filtrar motorizados con actividad o jornada
    const courierRankings: CourierPerformance[] = Array.from(courierStatsMap.values())
      .map((c) => ({
        ...c,
        completionRate: c.totalAssigned > 0 ? (c.completed / c.totalAssigned) * 100 : 0,
      }))
      .filter((c) => c.totalAssigned > 0 || c.workdayStatus !== 'none')
      .sort((a, b) => {
        // Ordenar primero por completadas descendente, luego por efectividad
        if (b.completed !== a.completed) return b.completed - a.completed
        return b.completionRate - a.completionRate
      })

    return {
      totalTasks,
      pending: tasks.filter((t) => ['pending', 'assigned'].includes(t.status)).length,
      inRoute: tasks.filter((t) => ['en_route', 'in_progress'].includes(t.status)).length,
      completed: completedTasks.length,
      notCompleted: tasks.filter((t) => t.status === 'not_completed').length,
      completionRate,
      activeCouriers: workdays.filter((w) => w.status === 'open').length,
      totalCashNIO,
      totalTransferNIO,
      totalCollectionsUSD,
      totalExpensesNIO,
      totalAlreadyReceived,
      netReceivedInVault,
      netCash,
      pendingSettlements: settlements.filter(
        (s) => s.status === 'pending_review' || s.status === 'pending_settlement'
      ).length,
      courierRankings,
    }
  }, [data])

  const dateFormatted = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number)
    const dateObj = new Date(year, month - 1, day)
    return dateObj.toLocaleDateString('es-NI', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [selectedDate])

  // ─── Exportar Informe Ejecutivo PDF ──────────────────────────────────────────

  const handleExportExecutiveReport = () => {
    if (!kpis) return

    generateExecutiveDashboardReceipt({
      branchName: activeBranchName,
      date: formatDate(selectedDate),
      generatedBy: profile?.full_name || 'Administrador Operativo',
      totalTasks: kpis.totalTasks,
      completedTasks: kpis.completed,
      completionRate: kpis.completionRate,
      inRouteTasks: kpis.inRoute,
      pendingTasks: kpis.pending,
      failedTasks: kpis.notCompleted,
      activeCouriers: kpis.activeCouriers,
      totalCashNIO: kpis.totalCashNIO,
      totalTransferNIO: kpis.totalTransferNIO,
      totalCollectionsUSD: kpis.totalCollectionsUSD,
      totalExpensesNIO: kpis.totalExpensesNIO,
      netCashNIO: kpis.netCash,
      courierRanking: kpis.courierRankings.map((c) => ({
        name: c.name,
        completed: c.completed,
        totalAssigned: c.totalAssigned,
        completionRate: c.completionRate,
        totalCollectedNIO: c.totalCollectedNIO,
        status: c.workdayStatus,
      })),
    })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Banner / Saludo Operativo */}
      <BentoCard isHero className="p-6 sm:p-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-2xs font-bold uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5" /> Centro de Analíticas y Operaciones
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Bienvenido, {profile?.full_name ?? 'Administrador'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 capitalize">
              {dateFormatted} {isToday && '(Hoy)'} • {activeBranchName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Accesos Rápidos de Fecha */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isToday
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(yesterdayStr)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isYesterday
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ayer
              </button>
            </div>

            {/* Selector de Fecha */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
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
            {userBranches.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <Building2 className="h-4 w-4 text-accent shrink-0" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
                  aria-label="Filtrar métricas por sucursal"
                >
                  {userBranches.length > 1 && <option value="all">Todas mis sucursales</option>}
                  {userBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Botón Imprimir Informe Ejecutivo */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExecutiveReport}
              leftIcon={<Printer className="h-3.5 w-3.5 text-slate-700" />}
              className="bg-white hover:bg-slate-50"
            >
              Informe PDF
            </Button>
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
          {/* SECCIÓN 1: EFICIENCIA Y OPERACIONES DEL DÍA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Eficiencia Operativa & Despacho ({formatDate(selectedDate)})
                </h3>
              </div>
              <Badge variant={isToday ? 'assigned' : 'neutral'} size="sm">
                {isToday ? 'Actualización en tiempo real' : formatDate(selectedDate)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/admin/tareas">
                <MetricCard
                  title={isToday ? 'Tareas Agendadas Hoy' : 'Tareas Agendadas'}
                  value={kpis.totalTasks}
                  subtitle={`${kpis.pending} pendientes de despacho`}
                  icon={<ClipboardList className="h-5 w-5 text-accent" />}
                  accentColor="accent"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/tareas">
                <MetricCard
                  title="Efectividad de Entrega"
                  value={`${kpis.completionRate.toFixed(1)}%`}
                  subtitle={`${kpis.completed} entregadas con éxito`}
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  accentColor="success"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/tareas">
                <MetricCard
                  title="En Tránsito / Gestión"
                  value={kpis.inRoute}
                  subtitle="Motorizados en calle"
                  icon={<Clock className="h-5 w-5 text-purple-600" />}
                  accentColor="purple"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/tareas">
                <MetricCard
                  title="Incidencias / No Completadas"
                  value={kpis.notCompleted}
                  subtitle="Fallidas o canceladas"
                  icon={<AlertCircle className="h-5 w-5 text-destructive" />}
                  accentColor="destructive"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>
            </div>
          </div>

          {/* SECCIÓN 2: DESGLOSE FINANCIERO Y MULTIMONEDA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Desglose Financiero y Cobranzas Multimoneda ({formatDate(selectedDate)})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/admin/liquidaciones">
                <MetricCard
                  title="Efectivo en Córdobas"
                  value={`C$ ${kpis.totalCashNIO.toFixed(2)}`}
                  subtitle="Recaudado por motorizados"
                  icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                  accentColor="success"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/liquidaciones">
                <MetricCard
                  title="Transferencias Bancarias"
                  value={`C$ ${kpis.totalTransferNIO.toFixed(2)}`}
                  subtitle="Pagos digitales verificados"
                  icon={<TrendingUp className="h-5 w-5 text-sky-600" />}
                  accentColor="accent"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/liquidaciones">
                <MetricCard
                  title="Recaudación Dólares ($)"
                  value={`$ ${kpis.totalCollectionsUSD.toFixed(2)}`}
                  subtitle="Cobros en divisa extranjera"
                  icon={<DollarSign className="h-5 w-5 text-violet-600" />}
                  accentColor="purple"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>

              <Link to="/admin/cierre-diario">
                <MetricCard
                  title="Neto en Bóveda / Caja"
                  value={`C$ ${kpis.netCash.toFixed(2)}`}
                  subtitle={`Gastos: -C$ ${kpis.totalExpensesNIO.toFixed(2)}${kpis.totalAlreadyReceived > 0 ? ` | Entregas: -C$ ${kpis.totalAlreadyReceived.toFixed(2)}` : ''}`}
                  icon={<Award className="h-5 w-5 text-primary" />}
                  accentColor="primary"
                  className="hover:shadow-card-hover cursor-pointer"
                />
              </Link>
            </div>
          </div>

          {/* SECCIÓN 3: DISTRIBUCIÓN OPERATIVA O EMPTY STATE */}
          {data && data.tasks && data.tasks.length > 0 ? (
            <TaskStatusBar tasks={data.tasks} dateLabel={isToday ? 'Hoy' : formatDate(selectedDate)} />
          ) : (
            <EmptyState
              title={`Sin tareas registradas para el ${formatDate(selectedDate)}`}
              description="Actualmente no hay órdenes de despacho o entregas agendadas para esta fecha."
              icon={<PackageCheck className="h-7 w-7 text-slate-400" />}
              action={
                <Link to="/admin/tareas">
                  <Button variant="primary" size="sm">
                    Crear Nueva Tarea
                  </Button>
                </Link>
              }
            />
          )}

          <Divider />

          {/* SECCIÓN 4: RANKING Y PRODUCTIVIDAD DE MOTORIZADOS */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base">Ranking y Rendimiento de Motorizados</CardTitle>
                </div>
                <CardDescription>
                  Productividad, porcentaje de efectividad de entrega y recaudación acumulada
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="assigned" size="md">
                  {kpis.activeCouriers} en ruta activa
                </Badge>
                <Link to="/admin/jornadas">
                  <Button variant="outline" size="sm">
                    Ver Jornadas
                  </Button>
                </Link>
              </div>
            </div>

            <CourierLeaderboard couriers={kpis.courierRankings} />
          </Card>

          <Divider />

          {/* SECCIÓN 5: ACCESOS RÁPIDOS A MÓDULOS */}
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
                  <Badge variant="assigned" size="sm">
                    Operaciones
                  </Badge>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">Gestión de Tareas</CardTitle>
                  <CardDescription>
                    Asignación, reasignación y seguimiento de órdenes en tiempo real.
                  </CardDescription>
                </div>
                <div className="pt-2">
                  <Link to="/admin/tareas">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
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
                  <Badge variant="en_route" size="sm">
                    Jornadas
                  </Badge>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">Control de Fondos</CardTitle>
                  <CardDescription>
                    Apertura de caja chica, adelantos y cierres de turno por motorizado.
                  </CardDescription>
                </div>
                <div className="pt-2">
                  <Link to="/admin/jornadas">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
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
                  <Badge variant="completed" size="sm">
                    Reportes
                  </Badge>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">Reportes Ejecutivos</CardTitle>
                  <CardDescription>
                    Generación de informes de rendimiento y exportación a PDF/CSV.
                  </CardDescription>
                </div>
                <div className="pt-2">
                  <Link to="/admin/reportes">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
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
