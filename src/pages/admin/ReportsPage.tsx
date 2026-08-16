import { useState } from 'react'
import {
  BarChart3,
  Calendar,
  Download,
  Loader2,
  FileText,
  ClipboardList,
  DollarSign,
  Bike,
  ChevronDown,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/useAuth'
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS } from '@/shared/types'

type ReportType = 'tasks' | 'settlements' | 'workdays' | 'adjustments'

const REPORT_OPTIONS = [
  {
    id: 'tasks' as ReportType,
    label: 'Reporte de Tareas',
    icon: <ClipboardList className="h-4 w-4" />,
    desc: 'Listado de tareas con estado, tipo, motorizado y montos.',
  },
  {
    id: 'settlements' as ReportType,
    label: 'Reporte de Liquidaciones',
    icon: <DollarSign className="h-4 w-4" />,
    desc: 'Detalle de efectivo cobrado, transferencias y gastos por jornada.',
  },
  {
    id: 'workdays' as ReportType,
    label: 'Reporte de Jornadas',
    icon: <Bike className="h-4 w-4" />,
    desc: 'Jornadas laborales, fondos iniciales y estados de cierre.',
  },
  {
    id: 'adjustments' as ReportType,
    label: 'Faltantes y Sobrantes',
    icon: <Scale className="h-4 w-4" />,
    desc: 'Historial de ajustes contables, faltantes y sobrantes por motorizado.',
  },
]

async function fetchReportData(
  type: ReportType,
  from: string,
  to: string,
  branchIds: string[]
) {
  if (type === 'tasks') {
    const { data } = await supabase
      .from('tasks')
      .select(`id, code, title, task_type, status, priority,
        expected_collection_amount, expected_payment_amount, created_at,
        courier:profiles!tasks_assigned_courier_id_fkey(full_name)`)
      .in('branch_id', branchIds)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false })
    return (data ?? []) as unknown as Record<string, unknown>[]
  }

  if (type === 'settlements') {
    const { data } = await supabase
      .from('settlements')
      .select(`id, created_at, status,
        actual_cash, actual_transfers, total_expenses,
        expected_cash, difference,
        courier:profiles!settlements_courier_id_fkey(full_name)`)
      .in('branch_id', branchIds)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false })
    return (data ?? []) as unknown as Record<string, unknown>[]
  }

  if (type === 'workdays') {
    const { data } = await supabase
      .from('workdays')
      .select(`id, work_date, status, initial_km, final_km, initial_cash, notes,
        courier:profiles!workdays_courier_id_fkey(full_name)`)
      .in('branch_id', branchIds)
      .gte('work_date', from)
      .lte('work_date', to)
      .order('work_date', { ascending: false })

    const formatted = (data ?? []).map((w: any) => {
      let kmDisplay = 'No disponible'
      if (w.initial_km !== null && w.initial_km !== undefined) {
        kmDisplay = `${w.initial_km} km`
      } else if (w.notes?.includes('[Kilometraje No Disponible]')) {
        const reason = w.notes.match(/Motivo:\s*([^|]+)/)?.[1]?.trim()
        if (reason) kmDisplay = `No disponible (${reason})`
      }

      return {
        id: w.id,
        work_date: w.work_date,
        motorizado: w.courier?.full_name || 'N/A',
        status: w.status,
        initial_km: kmDisplay,
        final_km: w.final_km !== null && w.final_km !== undefined ? `${w.final_km} km` : 'En recorrido',
        initial_cash: w.initial_cash || 0,
        notes: w.notes || '',
      }
    })

    return formatted as unknown as Record<string, unknown>[]
  }

  if (type === 'adjustments') {
    const { data, error } = await supabase
      .from('settlement_adjustments')
      .select(`
        id,
        created_at,
        adjustment_amount,
        reason,
        settlement:settlements!settlement_adjustments_settlement_id_fkey (
          id,
          settlement_date,
          expected_cash,
          actual_cash,
          branch_id,
          courier:profiles!settlements_courier_id_fkey (
            full_name
          ),
          branch:branches!settlements_branch_id_fkey (
            name
          )
        ),
        adjuster:profiles!settlement_adjustments_adjusted_by_fkey (
          full_name
        )
      `)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Reports] Error fetching adjustments:', error)
      return []
    }

    let filtered = data ?? []
    if (branchIds.length > 0) {
      filtered = filtered.filter((row: any) =>
        branchIds.includes(row.settlement?.branch_id)
      )
    }

    const formatted = filtered.map((row: any) => {
      const amount = Number(row.adjustment_amount || 0)
      const isShortage = amount < 0
      return {
        id: row.id,
        fecha: row.created_at ? new Date(row.created_at).toLocaleDateString('es-NI') : '—',
        motorizado: row.settlement?.courier?.full_name || 'N/A',
        sucursal: row.settlement?.branch?.name || 'N/A',
        tipo_ajuste: isShortage ? 'FALTANTE' : 'SOBRANTE',
        efectivo_esperado: `C$ ${Number(row.settlement?.expected_cash || 0).toFixed(2)}`,
        efectivo_entregado: `C$ ${Number(row.settlement?.actual_cash || 0).toFixed(2)}`,
        monto_ajuste: `${isShortage ? '-' : '+'}C$ ${Math.abs(amount).toFixed(2)}`,
        monto_numerico: amount,
        motivo_justificacion: row.reason || 'Sin motivo especificado',
        autorizado_por: row.adjuster?.full_name || 'Admin',
      }
    })

    return formatted as unknown as Record<string, unknown>[]
  }

  return []
}


function exportCSV(data: unknown[], filename: string) {
  if (!data.length) return
  // Excluir campos internos como 'id' o 'monto_numerico' si existen
  const rawHeaders = Object.keys(data[0] as Record<string, unknown>)
  const headers = rawHeaders.filter((h) => h !== 'id' && h !== 'monto_numerico')

  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = (row as Record<string, unknown>)[h]
        if (val && typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
        const strVal = String(val ?? '')
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`
        }
        return strVal
      })
      .join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { profile } = useAuth()
  const branchIds = profile?.branch_ids ?? []

  const todayStr = new Date().toISOString().split('T')[0]
  const [reportType, setReportType] = useState<ReportType>('tasks')
  const [from, setFrom] = useState(todayStr)
  const [to, setTo] = useState(todayStr)
  const [enabled, setEnabled] = useState(false)

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['report', reportType, from, to, branchIds],
    queryFn: () => fetchReportData(reportType, from, to, branchIds),
    enabled: enabled && branchIds.length > 0,
  })

  const handleGenerate = () => {
    setEnabled(true)
    refetch()
  }

  const selectedOption = REPORT_OPTIONS.find((o) => o.id === reportType)!

  // Cálculo de KPIs para ajustes
  const adjustmentKpis = reportType === 'adjustments' && data.length > 0
    ? {
        totalShortages: data
          .filter((r: any) => (r.monto_numerico ?? 0) < 0)
          .reduce((acc: number, r: any) => acc + Math.abs(r.monto_numerico), 0),
        totalSurpluses: data
          .filter((r: any) => (r.monto_numerico ?? 0) > 0)
          .reduce((acc: number, r: any) => acc + (r.monto_numerico ?? 0), 0),
        countShortages: data.filter((r: any) => (r.monto_numerico ?? 0) < 0).length,
        countSurpluses: data.filter((r: any) => (r.monto_numerico ?? 0) > 0).length,
      }
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reportes</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Generación y exportación de datos operativos y financieros.
        </p>
      </div>

      {/* Configuración del Reporte */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          Configurar Reporte
        </h2>

        {/* Tipo */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">
            Tipo de Reporte
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {REPORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setReportType(opt.id); setEnabled(false) }}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                  reportType === opt.id
                    ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent/30'
                    : 'border-border bg-background text-foreground-muted hover:border-accent/40'
                }`}
              >
                <div className={`mt-0.5 ${reportType === opt.id ? 'text-accent' : 'text-foreground-subtle'}`}>
                  {opt.icon}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${reportType === opt.id ? 'text-accent' : 'text-foreground'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-foreground-muted mt-0.5 leading-snug">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Rango de fechas */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-foreground mb-1">
              <Calendar className="h-3.5 w-3.5 inline mr-1 text-foreground-muted" />
              Desde
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setEnabled(false) }}
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-foreground mb-1">
              <Calendar className="h-3.5 w-3.5 inline mr-1 text-foreground-muted" />
              Hasta
            </label>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => { setTo(e.target.value); setEnabled(false) }}
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg shadow-sm transition cursor-pointer"
            >
              <BarChart3 className="h-4 w-4" />
              Generar
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI resumen para Reporte de Ajustes */}
      {enabled && adjustmentKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-rose-600" />
                Total Faltantes
              </span>
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                {adjustmentKpis.countShortages} caso(s)
              </span>
            </div>
            <p className="text-xl font-black text-rose-700">
              -C$ {adjustmentKpis.totalShortages.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-rose-600">Ajustes por cobros pendientes o faltantes en caja</p>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-sky-600" />
                Total Sobrantes
              </span>
              <span className="text-[11px] font-semibold text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
                {adjustmentKpis.countSurpluses} caso(s)
              </span>
            </div>
            <p className="text-xl font-black text-sky-700">
              +C$ {adjustmentKpis.totalSurpluses.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-sky-600">Ajustes por propinas o redondeo a favor</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-slate-600" />
                Balance Neto de Ajustes
              </span>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                {data.length} total
              </span>
            </div>
            <p className={`text-xl font-black ${
              adjustmentKpis.totalSurpluses - adjustmentKpis.totalShortages >= 0
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}>
              {adjustmentKpis.totalSurpluses - adjustmentKpis.totalShortages >= 0 ? '+' : '-'}C$ {Math.abs(adjustmentKpis.totalSurpluses - adjustmentKpis.totalShortages).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500">Resultado neto acumulado en el período</p>
          </div>
        </div>
      )}

      {/* Resultados */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
          <p className="text-xs">Generando reporte...</p>
        </div>
      ) : enabled && data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-foreground-muted bg-card border border-border rounded-2xl">
          <ChevronDown className="h-8 w-8 opacity-30" />
          <p className="text-sm">Sin datos en el rango seleccionado.</p>
        </div>
      ) : enabled && data.length > 0 ? (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden space-y-0">
          {/* Barra de acciones */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-muted/20">
            <p className="text-xs font-semibold text-foreground">
              {selectedOption.label} — {data.length} registro{data.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => exportCSV(data, reportType)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent border border-accent/30 bg-accent/10 hover:bg-accent/20 rounded-lg transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
          </div>

          {/* Tabla de resultados */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-border">
              <thead className="bg-muted/30">
                <tr>
                  {Object.keys(data[0] as Record<string, unknown>)
                    .filter((col) => col !== 'id' && col !== 'monto_numerico')
                    .map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left font-semibold text-foreground-muted uppercase tracking-wider whitespace-nowrap"
                      >
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.map((row, i) => {
                  const visibleEntries = Object.entries(row as Record<string, unknown>).filter(
                    ([k]) => k !== 'id' && k !== 'monto_numerico'
                  )

                  return (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      {visibleEntries.map(([key, val], j) => {
                        let display = val
                        if (val && typeof val === 'object') display = JSON.stringify(val)
                        if (key === 'status') {
                          display =
                            TASK_STATUS_LABELS[val as keyof typeof TASK_STATUS_LABELS] || val
                        }
                        if (key === 'task_type') {
                          display =
                            TASK_TYPE_LABELS[val as keyof typeof TASK_TYPE_LABELS] || val
                        }

                        const isShortage = String(val).toUpperCase() === 'FALTANTE'
                        const isSurplus = String(val).toUpperCase() === 'SOBRANTE'

                        return (
                          <td key={j} className="px-4 py-2.5 text-foreground whitespace-nowrap">
                            {isShortage ? (
                              <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                FALTANTE
                              </span>
                            ) : isSurplus ? (
                              <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                SOBRANTE
                              </span>
                            ) : (
                              String(display ?? '—')
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

