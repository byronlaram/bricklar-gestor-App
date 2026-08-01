import { useState } from 'react'
import {
  Database as DatabaseIcon,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Server,
  ShieldCheck,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'

interface StatusItem {
  label: string
  status: 'ok' | 'warning' | 'error' | 'idle'
  detail?: string
}

export default function MaintenancePage() {
  const queryClient = useQueryClient()

  const [isClearingCache, setIsClearingCache] = useState(false)
  const [cacheCleared, setCacheCleared] = useState(false)

  const [isCheckingDb, setIsCheckingDb] = useState(false)
  const [dbStatus, setDbStatus] = useState<StatusItem[]>([])

  const handleClearCache = () => {
    setIsClearingCache(true)
    setCacheCleared(false)
    setTimeout(() => {
      queryClient.clear()
      setIsClearingCache(false)
      setCacheCleared(true)
      setTimeout(() => setCacheCleared(false), 3000)
    }, 800)
  }

  const handleCheckDb = async () => {
    setIsCheckingDb(true)
    setDbStatus([])

    const checks = [
      { table: 'profiles', label: 'Tabla de Perfiles (profiles)' },
      { table: 'branches', label: 'Tabla de Sucursales (branches)' },
      { table: 'tasks', label: 'Tabla de Tareas (tasks)' },
      { table: 'workdays', label: 'Tabla de Jornadas (workdays)' },
      { table: 'settlements', label: 'Tabla de Liquidaciones (settlements)' },
      { table: 'bus_routes', label: 'Directorio de Buses (bus_routes)' },
    ] as const

    const results: StatusItem[] = []

    for (const check of checks) {
      try {
        const { error, count } = await supabase
          .from(check.table)
          .select('id', { count: 'exact', head: true })

        if (error) {
          results.push({ label: check.label, status: 'error', detail: error.message })
        } else {
          results.push({ label: check.label, status: 'ok', detail: `${count ?? 0} registros` })
        }
      } catch (e: unknown) {
        results.push({ label: check.label, status: 'error', detail: (e as Error).message })
      }
    }

    setDbStatus(results)
    setIsCheckingDb(false)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mantenimiento</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Herramientas de diagnóstico y mantenimiento del sistema.
        </p>
      </div>

      {/* Caché del Cliente */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Caché del Cliente</h2>
        </div>
        <p className="text-xs text-foreground-muted">
          Limpia el caché de TanStack Query. Útil para forzar una recarga fresca de todos los datos
          sin necesidad de recargar la página.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearCache}
            disabled={isClearingCache}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-border text-foreground hover:bg-muted/50 disabled:opacity-50 rounded-lg transition cursor-pointer"
          >
            {isClearingCache ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Limpiando...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Limpiar Caché de Consultas
              </>
            )}
          </button>
          {cacheCleared && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Caché limpiado
            </span>
          )}
        </div>
      </div>

      {/* Verificación de Base de Datos */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <DatabaseIcon className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Verificación de Base de Datos</h2>
        </div>
        <p className="text-xs text-foreground-muted">
          Verifica la conectividad y existencia de las tablas principales del sistema en Supabase.
        </p>
        <button
          onClick={handleCheckDb}
          disabled={isCheckingDb}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
        >
          {isCheckingDb ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <Server className="h-3.5 w-3.5" />
              Verificar Tablas del Sistema
            </>
          )}
        </button>

        {dbStatus.length > 0 && (
          <div className="space-y-2 mt-2">
            {dbStatus.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
                  item.status === 'ok'
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : item.status === 'warning'
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-rose-500/20 bg-rose-500/5'
                }`}
              >
                {item.status === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : item.status === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${item.status === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : item.status === 'error' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {item.label}
                  </p>
                  {item.detail && <p className="text-foreground-muted text-[11px]">{item.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información del Sistema */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Información del Sistema</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Aplicación', value: 'GestorOps v1.0' },
            { label: 'Backend', value: 'Supabase (PostgreSQL)' },
            { label: 'Frontend', value: 'React 18 + Vite' },
            { label: 'UI', value: 'TailwindCSS / CSS Variables' },
            { label: 'Estado', value: 'TanStack Query v5' },
            { label: 'Entorno', value: import.meta.env.MODE },
          ].map((item) => (
            <div key={item.label} className="bg-muted/30 border border-border/40 rounded-xl p-3">
              <p className="text-[11px] text-foreground-muted font-medium">{item.label}</p>
              <p className="font-semibold text-foreground mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
