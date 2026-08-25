import { useState } from 'react'
import {
  Bus,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  Search,
  Phone,
  Clock,
  MapPin,
  Power,
} from 'lucide-react'
import { useBusRoutes, useBusMutations } from '@/modules/buses/hooks/useBuses'
import { BusFormModal } from '@/modules/buses/components/BusFormModal'
import { BusDetailModal } from '@/modules/buses/components/BusDetailModal'
import type { BusRoute } from '@/modules/buses/types/buses.types'

export default function BusDirectoryPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [routeToEdit, setRouteToEdit] = useState<BusRoute | null>(null)
  const [routeToView, setRouteToView] = useState<BusRoute | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const { data: routes = [], isLoading } = useBusRoutes()
  const { deleteBusRoute, updateBusRoute, isDeleting } = useBusMutations()

  const filtered = routes.filter((r) => {
    const q = search.toLowerCase()
    return (
      r.destination_city.toLowerCase().includes(q) ||
      r.cooperative_name.toLowerCase().includes(q) ||
      r.origin_terminal.toLowerCase().includes(q)
    )
  })

  const handleView = (route: BusRoute) => {
    setRouteToView(route)
    setIsDetailOpen(true)
  }

  const handleEdit = (route: BusRoute) => {
    setRouteToEdit(route)
    setIsModalOpen(true)
  }

  const handleNew = () => {
    setRouteToEdit(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (route: BusRoute) => {
    if (!window.confirm(`¿Eliminar la ruta hacia "${route.destination_city}" (${route.cooperative_name})?`)) return
    await deleteBusRoute(route.id)
  }

  const handleToggleStatus = async (route: BusRoute) => {
    await updateBusRoute({ id: route.id, payload: { is_active: !route.is_active } })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Directorio de Buses</h1>
          <p className="text-xs text-foreground-muted">
            Catálogo de rutas de bus para envío y retiro de encomiendas.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl shadow-md transition cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Agregar Ruta
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar por destino, cooperativa o terminal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
          />
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-xs">Cargando directorio de buses...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Bus className="h-10 w-10 opacity-30" />
          <p className="text-sm">No se encontraron rutas de bus.</p>
          <button onClick={handleNew} className="text-xs text-accent hover:underline cursor-pointer">
            Agregar la primera ruta
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground-muted uppercase tracking-wider">Destino</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground-muted uppercase tracking-wider hidden sm:table-cell">Cooperativa</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground-muted uppercase tracking-wider hidden md:table-cell">Terminal Origen</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground-muted uppercase tracking-wider hidden lg:table-cell">Horarios</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground-muted uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground-muted uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((route) => (
                  <tr key={route.id} className={`hover:bg-muted/20 transition-colors ${!route.is_active ? 'opacity-50' : ''}`}>
                    <td
                      onClick={() => handleView(route)}
                      className="px-4 py-3 cursor-pointer group select-none"
                    >
                      <div className="space-y-1.5">
                        {/* 1. Destino (Interactivo con indicador visual) */}
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="font-extrabold text-foreground group-hover:text-accent transition-colors text-xs sm:text-sm">
                            {route.destination_city}
                          </span>
                        </div>

                        {/* 2. Horarios de Salida (Recuadro azul con texto en color blanco) */}
                        {route.departure_schedules && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#0284c7] dark:bg-sky-600 px-2.5 py-0.5 rounded-lg shadow-2xs w-fit">
                            <Clock className="h-3 w-3 text-white shrink-0" />
                            <span className="text-white font-bold">{route.departure_schedules}</span>
                          </div>
                        )}

                        {/* 3. Teléfono (Gris oscuro visible a juego con los iconos de acciones) */}
                        {route.dispatch_phone && (
                          <p className="text-foreground-muted font-bold text-xs flex items-center gap-1.5 pt-0.5">
                            <Phone className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
                            <span className="text-foreground-muted font-bold tracking-wide">
                              {route.dispatch_phone}
                            </span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td
                      onClick={() => handleView(route)}
                      className="px-4 py-3 hidden sm:table-cell cursor-pointer"
                    >
                      <p className="text-foreground font-medium">{route.cooperative_name}</p>
                    </td>
                    <td
                      onClick={() => handleView(route)}
                      className="px-4 py-3 hidden md:table-cell text-foreground-muted cursor-pointer"
                    >
                      {route.origin_terminal}
                    </td>
                    <td
                      onClick={() => handleView(route)}
                      className="px-4 py-3 hidden lg:table-cell cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-foreground-muted">
                        <Clock className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                        <span className="text-[11px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-md border border-sky-100 dark:border-sky-800/50">
                          {route.departure_schedules || 'No especificado'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          route.is_active ? 'bg-emerald-500' : 'bg-rose-400'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(route)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            route.is_active
                              ? 'text-foreground-muted hover:text-amber-600 hover:bg-amber-500/10'
                              : 'text-foreground-muted hover:text-emerald-600 hover:bg-emerald-500/10'
                          }`}
                          title={route.is_active ? 'Desactivar ruta' : 'Activar ruta'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(route)}
                          className="p-1.5 rounded-lg text-foreground-muted hover:text-accent hover:bg-accent/10 transition cursor-pointer"
                          title="Editar ruta"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(route)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-foreground-muted hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                          title="Eliminar ruta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle / Solo Lectura */}
      <BusDetailModal
        route={routeToView}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setRouteToView(null)
        }}
        onEdit={(route) => {
          setIsDetailOpen(false)
          setRouteToView(null)
          handleEdit(route)
        }}
      />

      {/* Modal de Edición / Creación */}
      <BusFormModal
        isOpen={isModalOpen}
        routeToEdit={routeToEdit}
        onClose={() => {
          setIsModalOpen(false)
          setRouteToEdit(null)
        }}
      />
    </div>
  )
}
