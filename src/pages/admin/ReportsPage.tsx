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
  Building2,
  Printer,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import { useAuth } from '@/modules/auth/useAuth'
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS, WORKDAY_STATUS_LABELS } from '@/shared/types'
import { getTasks } from '@/modules/tasks/services/tasksService'
import { getSettlements } from '@/modules/settlements/services/settlementsService'
import { getWorkdays } from '@/modules/workdays/services/workdaysService'
import { getLocalDateString } from '@/shared/utils/date'

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
  branchId?: string
) {
  if (type === 'tasks') {
    const res = await getTasks({
      date_from: from,
      date_to: to,
      branch_id: branchId || undefined,
      page_size: 1000,
    })

    const formatted = res.data.map((t) => ({
      id: t.id,
      codigo: t.code || 'N/A',
      titulo: t.title || 'Sin título',
      fecha_programada: t.scheduled_date || 'N/A',
      tipo: TASK_TYPE_LABELS[t.task_type] || t.task_type,
      estado: TASK_STATUS_LABELS[t.status] || t.status,
      prioridad: t.priority?.toUpperCase() || 'NORMAL',
      motorizado: t.courier?.display_name || t.courier?.full_name || 'Sin asignar',
      cliente_contacto: t.contact_name || '—',
      telefono: t.phone || '—',
      direccion: t.address || '—',
      requiere_cobro: t.requires_collection ? 'Sí' : 'No',
      monto_cobro: t.requires_collection ? `C$ ${(t.expected_collection_amount || 0).toFixed(2)}` : '—',
      metodo_cobro: t.requires_collection ? (t.expected_payment_method === 'bank_transfer' ? 'Transferencia' : 'Efectivo') : '—',
      requiere_pago: t.requires_payment ? 'Sí' : 'No',
      monto_pago: t.requires_payment ? `C$ ${(t.expected_payment_amount || 0).toFixed(2)}` : '—',
    }))

    return formatted as unknown as Record<string, unknown>[]
  }

  if (type === 'settlements') {
    const settlementsList = await getSettlements({
      date_from: from,
      date_to: to,
      branch_id: branchId || undefined,
    })

    const formatted = settlementsList.map((s: any) => {
      const summary = s.cash_summary
      const collections = summary?.collectionsNIO ?? s.expected_cash
      const expenses = summary?.expensesNIO ?? s.total_expenses
      const alreadyReceived = summary?.alreadyReceivedNIO ?? 0
      const expCash = s.expected_cash || 0
      const actCash = s.actual_cash || 0
      const diff = s.difference || 0

      return {
        id: s.id,
        fecha_liquidacion: s.settlement_date,
        motorizado: s.courier_profile?.display_name || s.courier_profile?.full_name || 'N/A',
        sucursal: s.branch?.name || 'N/A',
        estado: s.status === 'approved' ? 'Aprobada' : 'Pendiente Revisión',
        cobros_ruta: `+C$ ${collections.toFixed(2)}`,
        gastos_ruta: `-C$ ${expenses.toFixed(2)}`,
        entregado_previo: `-C$ ${alreadyReceived.toFixed(2)}`,
        efectivo_esperado: `C$ ${expCash.toFixed(2)}`,
        efectivo_entregado: `C$ ${actCash.toFixed(2)}`,
        diferencia: diff === 0 ? 'C$ 0.00 (Cuadre Exacto)' : diff > 0 ? `+C$ ${diff.toFixed(2)} (Sobrante)` : `-C$ ${Math.abs(diff).toFixed(2)} (Faltante)`,
        observaciones: s.notes || 'Sin observaciones',
      }
    })

    return formatted as unknown as Record<string, unknown>[]
  }

  if (type === 'workdays') {
    const workdaysList = await getWorkdays({
      date_from: from,
      date_to: to,
      branch_id: branchId || undefined,
    })

    const formatted = workdaysList.map((w: any) => {
      let kmDisplay = 'No disponible'
      if (w.initial_km !== null && w.initial_km !== undefined) {
        kmDisplay = `${w.initial_km} km`
      } else if (w.notes?.includes('[Kilometraje No Disponible]')) {
        const reason = w.notes.match(/Motivo:\s*([^|]+)/)?.[1]?.trim()
        if (reason) kmDisplay = `No disponible (${reason})`
      }

      const initialCash = w.cash_summary?.initialCashNIO ?? w.initial_cash ?? 0
      const collections = w.cash_summary?.collectionsNIO ?? 0
      const expenses = w.cash_summary?.expensesNIO ?? 0
      const alreadyReceived = w.cash_summary?.alreadyReceivedNIO ?? 0
      const cashInHand = w.cash_summary?.cashInHandNIO ?? initialCash

      return {
        id: w.id,
        fecha: w.work_date,
        motorizado: w.courier_profile?.display_name || w.courier_profile?.full_name || 'N/A',
        sucursal: w.branch?.name || 'N/A',
        estado: (WORKDAY_STATUS_LABELS && WORKDAY_STATUS_LABELS[w.status as keyof typeof WORKDAY_STATUS_LABELS]) || w.status,
        fondo_inicial: `C$ ${initialCash.toFixed(2)}`,
        cobros_ruta: `+C$ ${collections.toFixed(2)}`,
        gastos_ruta: `-C$ ${expenses.toFixed(2)}`,
        entregas_caja: `-C$ ${alreadyReceived.toFixed(2)}`,
        saldo_en_mano: `C$ ${cashInHand.toFixed(2)}`,
        km_inicial: kmDisplay,
        km_final: w.final_km !== null && w.final_km !== undefined ? `${w.final_km} km` : 'En recorrido',
        observaciones: w.notes || 'Ninguna',
      }
    })

    return formatted as unknown as Record<string, unknown>[]
  }

  if (type === 'adjustments') {
    // 1. Obtener liquidaciones en el rango solicitado
    const settlementsList = await getSettlements({
      date_from: from,
      date_to: to,
      branch_id: branchId || undefined,
    })

    // 2. Intentar consultar registros detallados en settlement_adjustments
    let adjustmentsData: any[] = []
    try {
      const { data, error } = await supabase
        .from('settlement_adjustments')
        .select(`
          id,
          settlement_id,
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
              full_name,
              display_name
            ),
            branch:branches!settlements_branch_id_fkey (
              name
            )
          ),
          adjuster:profiles!settlement_adjustments_adjusted_by_fkey (
            full_name,
            display_name
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && data) {
        adjustmentsData = data
      }
    } catch (e) {
      console.warn('[Reports] Notice: settlement_adjustments query error:', e)
    }

    const adjustmentsBySettlementId = new Map<string, any>()
    adjustmentsData.forEach((adj) => {
      if (adj.settlement_id) {
        adjustmentsBySettlementId.set(adj.settlement_id, adj)
      }
    })

    const formatted: Record<string, unknown>[] = []
    const processedSettlementIds = new Set<string>()

    // 3. Filtrar liquidaciones que presenten discrepancia (faltante o sobrante)
    const settlementsWithDiff = settlementsList.filter(
      (s) => Math.abs(s.difference || 0) > 0.001
    )

    for (const s of settlementsWithDiff) {
      processedSettlementIds.add(s.id)
      const adj = adjustmentsBySettlementId.get(s.id)
      const amount =
        adj?.adjustment_amount !== undefined
          ? Number(adj.adjustment_amount)
          : Number(s.difference || 0)
      const isShortage = amount < 0

      formatted.push({
        id: adj?.id || s.id,
        fecha_liquidacion: s.settlement_date,
        motorizado:
          s.courier_profile?.display_name || s.courier_profile?.full_name || 'N/A',
        sucursal: s.branch?.name || 'N/A',
        tipo_ajuste: isShortage ? 'FALTANTE' : 'SOBRANTE',
        monto_ajuste: `${amount > 0 ? '+' : ''}C$ ${amount.toFixed(2)}`,
        monto_numerico: amount,
        motivo_justificacion:
          adj?.reason ||
          s.notes ||
          (isShortage ? 'Faltante en arqueo físico' : 'Sobrante en arqueo físico'),
        autorizado_por:
          adj?.adjuster?.display_name ||
          adj?.adjuster?.full_name ||
          s.reviewer_profile?.display_name ||
          s.reviewer_profile?.full_name ||
          'Administrador',
      })
    }

    // 4. Incluir ajustes independientes o históricos en settlement_adjustments no capturados previamente
    for (const adj of adjustmentsData) {
      if (adj.settlement_id && processedSettlementIds.has(adj.settlement_id)) continue

      const rowDate = adj.settlement?.settlement_date || adj.created_at?.split('T')[0]
      const dateMatch = (!from || rowDate >= from) && (!to || rowDate <= to)
      const branchMatch = !branchId || adj.settlement?.branch_id === branchId

      if (dateMatch && branchMatch) {
        const amount = Number(adj.adjustment_amount || 0)
        const isShortage = amount < 0

        formatted.push({
          id: adj.id,
          fecha_liquidacion: rowDate,
          motorizado:
            adj.settlement?.courier?.display_name ||
            adj.settlement?.courier?.full_name ||
            'N/A',
          sucursal: adj.settlement?.branch?.name || 'N/A',
          tipo_ajuste: isShortage ? 'FALTANTE' : 'SOBRANTE',
          monto_ajuste: `${amount > 0 ? '+' : ''}C$ ${amount.toFixed(2)}`,
          monto_numerico: amount,
          motivo_justificacion:
            adj.reason || (isShortage ? 'Faltante registrado' : 'Sobrante registrado'),
          autorizado_por:
            adj.adjuster?.display_name || adj.adjuster?.full_name || 'Administrador',
        })
      }
    }

    // Ordenar por fecha de liquidación descendente
    formatted.sort((a, b) =>
      String(b.fecha_liquidacion).localeCompare(String(a.fecha_liquidacion))
    )

    return formatted as unknown as Record<string, unknown>[]
  }

  return []
}

function exportCSV(data: unknown[], filename: string) {
  if (!data.length) return
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

function exportPDF({
  data,
  reportTitle,
  from,
  to,
  branchName,
  authorName,
}: {
  data: Record<string, unknown>[]
  reportTitle: string
  from: string
  to: string
  branchName: string
  authorName: string
}) {
  if (!data.length) return

  const rawHeaders = Object.keys(data[0])
  const headers = rawHeaders.filter((h) => h !== 'id' && h !== 'monto_numerico')
  const nowStr = new Date().toLocaleString('es-NI')

  const rowsHtml = data
    .map((row, idx) => {
      const cells = headers
        .map((h) => {
          let val = row[h]
          if (val && typeof val === 'object') val = JSON.stringify(val)
          const str = String(val ?? '—')
          return `<td style="padding: 7px 9px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #1e293b; white-space: nowrap;">${str}</td>`
        })
        .join('')
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
      return `<tr style="background-color: ${bg};">${cells}</tr>`
    })
    .join('')

  const headersHtml = headers
    .map(
      (h) =>
        `<th style="padding: 8px 9px; background-color: #0f172a; color: #ffffff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; border-right: 1px solid #334155; white-space: nowrap;">${h.replace(/_/g, ' ')}</th>`
    )
    .join('')

  const logoUrl = window.location.origin + '/branding/bricklar-logo.png'

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes en tu navegador para generar el PDF.')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${reportTitle} - Bricklar</title>
        <style>
          @page {
            size: landscape;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 12px;
            background: #ffffff;
            font-size: 11px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .logo-box {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-img {
            height: 46px;
            object-fit: contain;
          }
          .company-name {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .report-badge {
            font-size: 10px;
            font-weight: 800;
            color: #4338ca;
            background: #eef2ff;
            padding: 2px 8px;
            border-radius: 6px;
            display: inline-block;
            margin-top: 2px;
            border: 1px solid #c7d2fe;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #475569;
            line-height: 1.45;
          }
          .meta-title {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .summary-bar {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 9px 14px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 600;
            color: #334155;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          .footer {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 16px;
            border-top: 1px dashed #cbd5e1;
            font-size: 10px;
            color: #64748b;
          }
          .signature-box {
            border-top: 1px solid #64748b;
            width: 200px;
            text-align: center;
            padding-top: 5px;
            color: #334155;
            font-weight: 700;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-box">
            <img src="${logoUrl}" class="logo-img" alt="Logo Bricklar" onerror="this.style.display='none'" />
            <div>
              <div class="company-name">BRICKLAR GESTOR</div>
              <div class="report-badge">${reportTitle.toUpperCase()}</div>
            </div>
          </div>
          <div class="meta-box">
            <div class="meta-title">${reportTitle}</div>
            <div><strong>Rango:</strong> ${from} al ${to}</div>
            <div><strong>Sucursal:</strong> ${branchName}</div>
            <div><strong>Generado por:</strong> ${authorName}</div>
            <div><strong>Fecha de Emisión:</strong> ${nowStr}</div>
          </div>
        </div>

        <div class="summary-bar">
          <div>Total de Registros: <span style="color: #4338ca; font-weight: 800;">${data.length}</span></div>
          <div>Módulo de Reportes Ejecutivos & Auditoría</div>
        </div>

        <table>
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>
            <div>Documento oficial generado por el Sistema Bricklar Gestor.</div>
            <div>Impreso el: ${nowStr}</div>
          </div>
          <div class="signature-box">
            Firma y Sello de Autorización
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

export default function ReportsPage() {
  const { profile } = useAuth()
  const { data: branches = [] } = useBranches()

  const todayStr = getLocalDateString()
  const [reportType, setReportType] = useState<ReportType>('tasks')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [from, setFrom] = useState(todayStr)
  const [to, setTo] = useState(todayStr)
  const [enabled, setEnabled] = useState(true)

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['report', reportType, from, to, selectedBranchId],
    queryFn: () => fetchReportData(reportType, from, to, selectedBranchId || undefined),
    enabled: enabled,
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
                onClick={() => { setReportType(opt.id); setEnabled(true) }}
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

        {/* Rango de fechas y sucursal */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-foreground mb-1">
              <Calendar className="h-3.5 w-3.5 inline mr-1 text-foreground-muted" />
              Desde
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-foreground mb-1">
              <Calendar className="h-3.5 w-3.5 inline mr-1 text-foreground-muted" />
              Hasta
            </label>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-foreground mb-1">
              <Building2 className="h-3.5 w-3.5 inline mr-1 text-foreground-muted" />
              Sucursal
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            >
              <option value="">Todas las sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  exportPDF({
                    data,
                    reportTitle: selectedOption.label,
                    from,
                    to,
                    branchName:
                      branches.find((b) => b.id === selectedBranchId)?.name || 'Todas las sucursales',
                    authorName:
                      profile?.display_name || profile?.full_name || 'Administrador General',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-300 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Exportar PDF
              </button>
              <button
                onClick={() => exportCSV(data, reportType)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent border border-accent/30 bg-accent/10 hover:bg-accent/20 rounded-lg transition cursor-pointer shadow-2xs"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
            </div>
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
