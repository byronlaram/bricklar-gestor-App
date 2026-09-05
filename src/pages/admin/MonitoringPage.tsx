import { useState, useEffect } from 'react'
import {
  Bike,
  Navigation,
  CheckCircle2,
  Clock,
  RefreshCw,
  Building2,
  Map as MapIcon,
  Users,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import { useLiveMonitoring } from '@/modules/monitoring/hooks/useLiveMonitoring'
import { LiveMap } from '@/modules/monitoring/components/LiveMap'
import { CourierMonitorSidebar } from '@/modules/monitoring/components/CourierMonitorSidebar'
import type { MonitoringFilters } from '@/modules/monitoring/types/monitoring.types'
import { Card, Button } from '@/shared/components/ui'

export default function MonitoringPage() {
  const { profile } = useAuth()
  const { data: branches = [] } = useBranches()

  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || (branches[0]?.id ?? '')

  const [filters, setFilters] = useState<MonitoringFilters>({
    branch_id: defaultBranchId,
    courier_id: '',
    status_filter: 'all',
  })

  // Sincronizar automáticamente la sucursal activa cuando cargue el perfil o las sucursales
  useEffect(() => {
    if (profile?.primary_branch_id || profile?.branch_ids?.[0]) {
      const userBranch = profile.primary_branch_id || profile.branch_ids[0]
      if (!filters.branch_id || profile.role === 'junior_admin') {
        setFilters((prev) => (prev.branch_id === userBranch ? prev : { ...prev, branch_id: userBranch }))
      }
    } else if (!filters.branch_id && branches.length > 0) {
      setFilters((prev) => ({ ...prev, branch_id: branches[0].id }))
    }
  }, [branches, filters.branch_id, profile])

  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map')

  const { couriersSummary, mapTasks, stats, refetchTasks } = useLiveMonitoring(filters)

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] space-y-4 animate-fade-in">
      {/* ─── Cabecera Principal ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Monitoreo en Vivo & Rutas
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              GPS en Vivo
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Supervisión geográfica en tiempo real de la flota de motorizados y estado de paradas de hoy.
          </p>
        </div>

        {/* Filtro de Sucursal & Acciones */}
        <div className="flex items-center gap-2">
          {branches.length > 1 && (
            <div className="relative">
              <Building2 className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filters.branch_id}
                onChange={(e) => setFilters((prev) => ({ ...prev, branch_id: e.target.value }))}
                className="pl-9 pr-8 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchTasks()}
            leftIcon={<RefreshCw className="h-3.5 w-3.5 text-slate-500" />}
            className="shadow-2xs"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* ─── Métricas Operacionales Rápidas ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <Card className="p-3.5 bg-white border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Flota Activa</span>
            <Bike className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 font-mono">
              {stats.activeWorkdaysCount}
            </span>
            <span className="text-2xs text-slate-500">/ {stats.totalCouriers} asignados</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-purple-50/80 border-purple-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-2xs font-bold text-purple-900 uppercase tracking-wider">
            <span>En Ruta Ahora</span>
            <Navigation className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-purple-950 font-mono">
              {stats.couriersEnRouteCount}
            </span>
            <span className="text-2xs text-purple-800">repartidores</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-blue-50/80 border-blue-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-2xs font-bold text-blue-900 uppercase tracking-wider">
            <span>Paradas Pendientes</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-blue-950 font-mono">
              {stats.pendingTasksToday}
            </span>
            <span className="text-2xs text-blue-800">por completar</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-emerald-50/80 border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-2xs font-bold text-emerald-900 uppercase tracking-wider">
            <span>Entregadas Hoy</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-950 font-mono">
              {stats.completedTasksToday}
            </span>
            <span className="text-2xs text-emerald-800">/ {stats.totalTasksToday} paradas</span>
          </div>
        </Card>
      </div>

      {/* ─── Selector de Vista Móvil (Mapa vs Lista) ─── */}
      <div className="flex sm:hidden p-1 bg-slate-100 rounded-xl shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
          }`}
        >
          <MapIcon className="h-4 w-4" />
          <span>Mapa Interactivo</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Motorizados ({couriersSummary.length})</span>
        </button>
      </div>

      {/* ─── Contenedor Principal: Mapa (70%) + Panel Lateral (30%) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Mapa Interactivo */}
        <div
          className={`lg:col-span-8 xl:col-span-9 h-full ${
            mobileTab === 'map' ? 'block' : 'hidden lg:block'
          }`}
        >
          <LiveMap
            couriers={couriersSummary}
            tasks={mapTasks}
            selectedCourierId={selectedCourierId}
            onSelectCourier={setSelectedCourierId}
            className="h-full"
          />
        </div>

        {/* Panel Lateral de Motorizados */}
        <div
          className={`lg:col-span-4 xl:col-span-3 h-full ${
            mobileTab === 'list' ? 'block' : 'hidden lg:block'
          }`}
        >
          <CourierMonitorSidebar
            couriers={couriersSummary}
            selectedCourierId={selectedCourierId}
            onSelectCourier={setSelectedCourierId}
          />
        </div>
      </div>
    </div>
  )
}
