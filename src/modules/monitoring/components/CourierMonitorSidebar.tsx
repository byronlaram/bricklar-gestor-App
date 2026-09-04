import { useState } from 'react'
import {
  Bike,
  Navigation,
  Phone,
  Search,
} from 'lucide-react'
import type { CourierMonitoringSummary } from '../types/monitoring.types'
import { Avatar } from '@/shared/components/ui'

interface CourierMonitorSidebarProps {
  couriers: CourierMonitoringSummary[]
  selectedCourierId: string | null
  onSelectCourier: (courierId: string | null) => void
}

export function CourierMonitorSidebar({
  couriers,
  selectedCourierId,
  onSelectCourier,
}: CourierMonitorSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'en_route'>('all')

  const filteredCouriers = couriers.filter((c) => {
    const matchesSearch = c.courier_name.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    if (filterMode === 'online') return c.is_online
    if (filterMode === 'en_route') return c.active_task?.status === 'en_route'
    return true
  })

  const formatLastPing = (timestamp: string | null) => {
    if (!timestamp) return 'Sin señal reciente'
    const diffSeconds = Math.round((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (diffSeconds < 60) return `Hace ${diffSeconds}s`
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `Hace ${diffMinutes}m`
    return `Hace ${Math.floor(diffMinutes / 60)}h`
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header y Filtros */}
      <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bike className="h-4 w-4 text-indigo-600" />
            <span>Flota de Motorizados</span>
          </h2>
          <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
            {couriers.filter((c) => c.is_online).length} en línea
          </span>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {/* Pestañas Rápidas */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-2xs font-bold">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`py-1 rounded-lg transition cursor-pointer text-center ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos ({couriers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('online')}
            className={`py-1 rounded-lg transition cursor-pointer text-center ${
              filterMode === 'online'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            En línea ({couriers.filter((c) => c.is_online).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('en_route')}
            className={`py-1 rounded-lg transition cursor-pointer text-center ${
              filterMode === 'en_route'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            En ruta ({couriers.filter((c) => c.active_task?.status === 'en_route').length})
          </button>
        </div>
      </div>

      {/* Lista de Motorizados */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {filteredCouriers.length === 0 ? (
          <div className="p-8 text-center space-y-2 text-slate-400">
            <Bike className="h-8 w-8 mx-auto stroke-1 text-slate-300" />
            <p className="text-xs font-semibold">No se encontraron motorizados activos con estos filtros.</p>
          </div>
        ) : (
          filteredCouriers.map((courier) => {
            const isSelected = selectedCourierId === courier.courier_id
            const isEnRoute = courier.active_task?.status === 'en_route'
            const isInProgress = courier.active_task?.status === 'in_progress'

            return (
              <div
                key={courier.courier_id}
                onClick={() => onSelectCourier(isSelected ? null : courier.courier_id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-400/50 shadow-md'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-2xs'
                }`}
              >
                {/* Cabecera del Motorizado */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar
                        src={courier.avatar_url || undefined}
                        name={courier.courier_name}
                        size="md"
                        className="rounded-xl border border-slate-200"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          courier.is_online ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {courier.courier_name}
                      </h3>
                      <p className="text-2xs text-slate-500 font-mono">
                        {formatLastPing(courier.last_ping)}
                      </p>
                    </div>
                  </div>

                  {courier.courier_phone && (
                    <a
                      href={`tel:${courier.courier_phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shrink-0"
                      title="Llamar al motorizado"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {/* Parada / Tarea Actual */}
                {courier.active_task ? (
                  <div
                    className={`p-2.5 rounded-xl border text-2xs space-y-1 ${
                      isEnRoute
                        ? 'bg-purple-50/90 border-purple-200 text-purple-950'
                        : isInProgress
                        ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-extrabold">
                      <span className="flex items-center gap-1">
                        <Navigation className="h-3 w-3 text-purple-600 shrink-0" />
                        {isEnRoute ? 'En ruta hacia:' : isInProgress ? 'En gestión en:' : 'Próxima parada:'}
                      </span>
                      <span className="font-mono text-purple-800">{courier.active_task.code}</span>
                    </div>
                    <p className="font-bold truncate text-slate-900">{courier.active_task.title}</p>
                    {courier.active_task.address && (
                      <p className="text-[10px] text-slate-600 truncate">{courier.active_task.address}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-2 bg-slate-50 rounded-xl text-2xs text-slate-500 italic text-center">
                    Sin entregas asignadas para hoy
                  </div>
                )}

                {/* Barra de Progreso de Entregas */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-2xs font-semibold text-slate-600">
                    <span>Avance de entregas:</span>
                    <span className="font-bold text-slate-900">
                      {courier.completed_tasks_count} / {courier.assigned_tasks_count} ({courier.progress_percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${courier.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Botón de Enfoque */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectCourier(courier.courier_id)
                  }}
                  className={`w-full py-1.5 text-2xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Navigation className="h-3 w-3" />
                  <span>{isSelected ? 'Enfocado en el mapa' : 'Enfocar en mapa'}</span>
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
