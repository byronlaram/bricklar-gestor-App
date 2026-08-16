import { useState } from 'react'
import {
  Shield,
  Calendar,
  Loader2,
  Search,
  User,
  Activity,
  Info,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'

interface AuditEntry {
  id: string
  actor_user_id: string | null
  actor_email: string | null
  action: string
  entity_code: string | null
  changes: Record<string, unknown> | null
  created_at: string
}

async function fetchAuditLog(
  from: string,
  to: string,
  search: string
): Promise<AuditEntry[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(200)

  if (search) {
    query = query.or(`action.ilike.%${search}%,entity_code.ilike.%${search}%,actor_email.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    // Si la tabla no existe aún, retornamos vacío
    console.warn('[Audit] audit_logs table may not exist yet:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    actor_user_id: row.actor_user_id,
    actor_email: row.actor_email,
    action: row.action,
    entity_code: row.entity_code,
    changes: (row.changes as Record<string, unknown>) ?? null,
    created_at: row.created_at,
  }))
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  UPDATE: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
  DELETE: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
  LOGIN: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20',
  APPROVE: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  CLOSE: 'text-foreground-muted bg-muted border-border',
}

import { getLocalDateString } from '@/shared/utils/date'

export default function AuditPage() {
  const todayStr = getLocalDateString()
  const [from, setFrom] = useState(todayStr)
  const [to, setTo] = useState(todayStr)
  const [search, setSearch] = useState('')

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['audit', from, to, search],
    queryFn: () => fetchAuditLog(from, to, search),
    staleTime: 1000 * 30,
  })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es-NI', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Auditoría del Sistema</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Registro inmutable de acciones críticas realizadas en el sistema.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          Filtros de Auditoría
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Buscar acción, entidad o usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>
          <div className="flex gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-foreground-muted mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />Desde
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground-muted mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />Hasta
              </label>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Log de Auditoría */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
          <p className="text-xs">Cargando log de auditoría...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted bg-card border border-border rounded-2xl">
          <Activity className="h-10 w-10 opacity-30" />
          <p className="text-sm">No hay registros de auditoría para los filtros actuales.</p>
          <p className="text-xs text-foreground-subtle">
            Los registros se generan automáticamente al realizar acciones críticas.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              {entries.length} evento{entries.length !== 1 ? 's' : ''}
            </p>
            <Info className="h-4 w-4 text-foreground-subtle" />
          </div>
          <div className="divide-y divide-border/50 max-h-[60vh] overflow-y-auto">
            {entries.map((entry) => {
              const actionKey = entry.action?.toUpperCase().split('_')[0] ?? ''
              const colorClass = ACTION_COLORS[actionKey] ?? ACTION_COLORS['CLOSE']
              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${colorClass}`}
                  >
                    {entry.action ?? 'N/A'}
                  </span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {entry.entity_code ?? '—'}
                      </p>
                    </div>
                    {entry.changes && (
                      <p className="text-[11px] text-foreground-muted line-clamp-1">
                        {JSON.stringify(entry.changes)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-foreground-subtle">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.actor_email ?? entry.actor_user_id?.slice(0, 8) ?? 'Sistema'}
                      </span>
                      <span>{formatDate(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
