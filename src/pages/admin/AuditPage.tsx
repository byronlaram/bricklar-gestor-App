import { useState, useEffect } from 'react'
import {
  Shield,
  Calendar,
  Loader2,
  Search,
  Activity,
  Download,
  Printer,
  FileCode2,
  Copy,
  Check,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import { getAuditLogs, type AuditLogEntry, type AuditFilters } from '@/shared/services/auditService'
import { getLocalDateString } from '@/shared/utils/date'
import { formatDate } from '@/shared/utils/format'
import {
  Card,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  useToast,
} from '@/shared/components/ui'

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  UPDATE: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  DELETE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  LOGIN: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  APPROVE: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  REJECT: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  CLOSE: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  OVERRIDE: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
}

const MODULE_LABELS: Record<string, string> = {
  all: 'Todos los Módulos',
  tasks: 'Tareas & Envíos',
  settlements: 'Liquidaciones',
  daily_closures: 'Cierres Diarios',
  exchange_rates: 'Tipos de Cambio',
  workdays: 'Jornadas Laborales',
  funds: 'Entregas de Fondos',
  profiles: 'Usuarios & Perfiles',
}

export default function AuditPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: branches = [] } = useBranches()
  const todayStr = getLocalDateString()

  const [from, setFrom] = useState(todayStr)
  const [to, setTo] = useState(todayStr)
  const [search, setSearch] = useState('')
  const [selectedModule, setSelectedModule] = useState('all')
  const [selectedAction, setSelectedAction] = useState('all')
  const [selectedBranchId, setSelectedBranchId] = useState('all')

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const filters: AuditFilters = {
    from,
    to,
    search: search.trim() || undefined,
    entityType: selectedModule !== 'all' ? selectedModule : undefined,
    action: selectedAction !== 'all' ? selectedAction : undefined,
    branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined,
    limit: 300,
  }

  const { data: entries = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['audit-logs', from, to, search, selectedModule, selectedAction, selectedBranchId],
    queryFn: () => getAuditLogs(filters),
    staleTime: 1000 * 20,
  })

  // Suscripción en tiempo real a nuevos logs de auditoría
  useEffect(() => {
    const channel = supabase
      .channel('realtime_audit_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Exportar a CSV
  const handleExportCSV = () => {
    if (entries.length === 0) {
      toast.error('Sin registros', 'No hay registros de auditoría para exportar.')
      return
    }

    const headers = ['ID', 'Fecha y Hora', 'Accion', 'Modulo', 'Codigo Entidad', 'Usuario', 'Rol', 'Sucursal', 'Detalles/Cambios']
    const rows = entries.map((e) => [
      e.id,
      new Date(e.created_at).toLocaleString('es-NI'),
      e.action,
      e.entity_type,
      e.entity_code || '',
      e.actor_profile?.full_name || e.actor_email || 'Sistema',
      e.actor_role || '',
      e.branch?.name || '',
      `"${JSON.stringify(e.changes || {}).replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Bitacora_Auditoria_${from}_a_${to}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Archivo Generado', 'La bitácora de auditoría se ha exportado exitosamente a CSV.')
  }

  // Imprimir Bitácora en PDF
  const handlePrintAuditPDF = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=900')
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes para generar el PDF.')
      return
    }

    const rowsHtml = entries
      .map(
        (e) => `
      <tr>
        <td style="font-family: monospace; font-size: 10px; color: #64748b;">${new Date(e.created_at).toLocaleTimeString('es-NI')}</td>
        <td><strong style="text-transform: uppercase; font-size: 10px; color: #0284c7;">${e.action}</strong></td>
        <td><span style="font-size: 10px; font-weight: 700;">${MODULE_LABELS[e.entity_type] || e.entity_type}</span></td>
        <td style="font-family: monospace; font-weight: bold;">${e.entity_code || '—'}</td>
        <td>${e.actor_profile?.full_name || e.actor_email || 'Sistema'}</td>
        <td>${e.branch?.name || 'General'}</td>
        <td style="font-size: 9.5px; color: #475569;">${JSON.stringify(e.changes || {})}</td>
      </tr>
    `
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Bitácora de Auditoría - Bricklar</title>
          <style>
            body { font-family: sans-serif; font-size: 11px; color: #0f172a; margin: 20px; }
            h1 { font-size: 18px; color: #0369a1; margin-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
            td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>BRICKLAR LOGISTICS - BITÁCORA DE AUDITORÍA</h1>
          <p style="font-size: 10px; color: #64748b;">Período: ${formatDate(from)} al ${formatDate(to)} | Total Registros: ${entries.length} | Impreso el: ${new Date().toLocaleString('es-NI')}</p>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Código</th>
                <th>Usuario</th>
                <th>Sucursal</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleCopyJson = () => {
    if (!selectedEntry?.changes) return
    navigator.clipboard.writeText(JSON.stringify(selectedEntry.changes, null, 2))
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-sky-600" />
            Bitácora de Auditoría en Tiempo Real
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro inmutable de trazabilidad, aprobaciones, cancelaciones y cambios operativos en el sistema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
            className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs"
          >
            Refrescar
          </Button>

          <Button
            onClick={handleExportCSV}
            disabled={entries.length === 0}
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-3.5 w-3.5 text-emerald-600" />}
            className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs"
          >
            Exportar CSV
          </Button>

          <Button
            onClick={handlePrintAuditPDF}
            disabled={entries.length === 0}
            variant="outline"
            size="sm"
            leftIcon={<Printer className="h-3.5 w-3.5 text-sky-600" />}
            className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs"
          >
            Imprimir PDF
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Avanzados */}
      <Card className="p-4 bg-white border-slate-200 shadow-2xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Buscador */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por código, usuario, correo o acción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-900 shadow-2xs font-medium"
            />
          </div>

          {/* Módulo */}
          <div className="relative">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-900 shadow-2xs font-medium cursor-pointer"
            >
              {Object.entries(MODULE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Acción */}
          <div className="relative">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-900 shadow-2xs font-medium cursor-pointer"
            >
              <option value="all">Todas las Acciones</option>
              <option value="CREATE">CREATE (Creación)</option>
              <option value="UPDATE">UPDATE (Modificación)</option>
              <option value="APPROVE">APPROVE (Aprobación)</option>
              <option value="REJECT">REJECT (Rechazo)</option>
              <option value="CLOSE">CLOSE (Cierre)</option>
              <option value="DELETE">DELETE (Eliminación)</option>
            </select>
          </div>

          {/* Sucursal */}
          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-900 shadow-2xs font-medium cursor-pointer"
            >
              <option value="all">Todas las Sucursales</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rango de Fechas */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Rango de Fecha:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-900 shadow-2xs font-medium"
            />
            <span className="text-xs text-slate-400">al</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-900 shadow-2xs font-medium"
            />
          </div>
          <div className="ml-auto text-2xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {entries.length} registro{entries.length !== 1 ? 's' : ''} encontrado{entries.length !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      {/* Tabla de Eventos */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
            <p className="text-xs font-semibold text-slate-600">Cargando registros de auditoría en tiempo real...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Activity className="h-10 w-10 opacity-30 text-slate-400" />
            <p className="text-sm font-bold text-slate-700">Sin eventos de auditoría para los filtros seleccionados</p>
            <p className="text-xs text-slate-400">
              Las acciones operativas clave (crear tareas, aprobar liquidaciones, cierres y tarifas) se registran de forma inmutable.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-3">Acción</th>
                  <th className="py-3 px-3">Módulo</th>
                  <th className="py-3 px-3">Entidad / Código</th>
                  <th className="py-3 px-3">Usuario Ejecutor</th>
                  <th className="py-3 px-3">Sucursal</th>
                  <th className="py-3 px-4 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const style = ACTION_COLORS[entry.action] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
                  const actorName = entry.actor_profile?.display_name || entry.actor_profile?.full_name || entry.actor_email || 'Sistema'

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatDate(entry.created_at.slice(0, 10))}</div>
                        <div className="text-2xs text-slate-400 font-mono">
                          {new Date(entry.created_at).toLocaleTimeString('es-NI')}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-2xs font-extrabold border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {entry.action}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-semibold text-slate-700">
                        {MODULE_LABELS[entry.entity_type] || entry.entity_type}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-sky-700 whitespace-nowrap">
                        {entry.entity_code || entry.entity_id?.slice(0, 8) || '—'}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>👤 {actorName}</span>
                        </div>
                        {entry.actor_role && (
                          <span className="text-[10px] text-slate-400 font-medium capitalize">
                            {entry.actor_role.replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {entry.branch?.name || '—'}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          onClick={() => setSelectedEntry(entry)}
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="h-3.5 w-3.5 text-slate-500" />}
                          className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-2xs font-bold shadow-2xs"
                        >
                          Ver Cambios
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Visor de Cambios (Diff Viewer) */}
      <Modal isOpen={!!selectedEntry} onClose={() => setSelectedEntry(null)}>
        <ModalContent className="max-w-2xl bg-white rounded-3xl p-6 shadow-2xl">
          <ModalHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-sky-600" />
                <ModalTitle className="text-lg font-bold text-slate-900">Detalle del Registro de Auditoría</ModalTitle>
              </div>
              {selectedEntry && (
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${(ACTION_COLORS[selectedEntry.action] || ACTION_COLORS.CLOSE).bg} ${(ACTION_COLORS[selectedEntry.action] || ACTION_COLORS.CLOSE).text} ${(ACTION_COLORS[selectedEntry.action] || ACTION_COLORS.CLOSE).border}`}
                >
                  {selectedEntry.action}
                </span>
              )}
            </div>
            <ModalDescription className="text-xs text-slate-500 mt-1">
              Información de contexto, usuario responsable y snapshot de datos modificados.
            </ModalDescription>
          </ModalHeader>

          {selectedEntry && (
            <ModalBody className="space-y-4 py-3">
              {/* Metadata resumida */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Módulo</span>
                  <span className="font-bold text-slate-800">{MODULE_LABELS[selectedEntry.entity_type] || selectedEntry.entity_type}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Código / ID</span>
                  <span className="font-mono font-bold text-sky-700">{selectedEntry.entity_code || selectedEntry.entity_id || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Usuario Ejecutor</span>
                  <span className="font-bold text-slate-800">{selectedEntry.actor_profile?.full_name || selectedEntry.actor_email || 'Sistema'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha y Hora</span>
                  <span className="font-mono text-slate-700">{new Date(selectedEntry.created_at).toLocaleString('es-NI')}</span>
                </div>
              </div>

              {/* Visor de Cambios JSON */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Snapshot de Cambios & Parámetros:</span>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 font-bold"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {isCopied ? 'Copiado' : 'Copiar JSON'}
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs font-mono max-h-64 overflow-y-auto border border-slate-800">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(selectedEntry.changes, null, 2) || 'Sin cambios adicionales registrados'}</pre>
                </div>
              </div>
            </ModalBody>
          )}

          <ModalFooter>
            <Button onClick={() => setSelectedEntry(null)} variant="primary" size="sm" className="font-bold">
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
