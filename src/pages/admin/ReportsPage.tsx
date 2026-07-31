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
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/AuthContext'
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS } from '@/shared/types'

type ReportType = 'tasks' | 'settlements' | 'workdays'

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
      .select(`id, consecutive_number, title, task_type, status, priority,
        amount_to_collect, amount_to_pay, created_at,
        assignee:profiles!tasks_assignee_id_fkey(full_name)`)
      .in('branch_id', branchIds)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false })
    return data ?? []
  }

  if (type === 'settlements') {
    const { data } = await supabase
      .from('settlements')
      .select(`id, submitted_at, status,
        total_cash_collected, total_transfer_collected, total_expenses,
        cash_in_hand, discrepancy,
        courier:profiles!settlements_courier_id_fkey(full_name)`)
      .in('branch_id', branchIds)
      .gte('submitted_at', `${from}T00:00:00`)
      .lte('submitted_at', `${to}T23:59:59`)
      .order('submitted_at', { ascending: false })
    return data ?? []
  }

  if (type === 'workdays') {
    const { data } = await supabase
      .from('workdays')
      .select(`id, date, status, fund_amount, notes,
        courier:profiles!workdays_courier_id_fkey(full_name)`)
      .in('branch_id', branchIds)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
    return data ?? []
  }

  return []
}

function exportCSV(data: unknown[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0] as Record<string, unknown>)
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = (row as Record<string, unknown>)[h]
        if (val && typeof val === 'object') return JSON.stringify(val)
        return String(val ?? '')
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {REPORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setReportType(opt.id); setEnabled(false) }}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                  reportType === opt.id
                    ? 'border-accent bg-accent/10 text-accent'
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
                  <p className="text-[11px] text-foreground-muted mt-0.5">{opt.desc}</p>
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
                  {Object.keys(data[0] as Record<string, unknown>).map((col) => (
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
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    {Object.values(row as Record<string, unknown>).map((val, j) => {
                      const key = Object.keys(data[0] as Record<string, unknown>)[j]
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
                      return (
                        <td key={j} className="px-4 py-2.5 text-foreground whitespace-nowrap">
                          {String(display ?? '—')}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
