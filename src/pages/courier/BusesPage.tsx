import { useState } from 'react'
import { Bus, Search, Phone, Clock, MapPin, Loader2 } from 'lucide-react'
import { useBusRoutes } from '@/modules/buses/hooks/useBuses'

export default function CourierBusesPage() {
  const [search, setSearch] = useState('')

  const { data: routes = [], isLoading } = useBusRoutes()

  const filtered = routes
    .filter((r) => r.is_active)
    .filter((r) => {
      const q = search.toLowerCase()
      return (
        r.destination_city.toLowerCase().includes(q) ||
        r.cooperative_name.toLowerCase().includes(q)
      )
    })

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Buses / Encomiendas</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Consulta de rutas, horarios y contactos de despacho.
        </p>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Buscar destino o cooperativa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
          <p className="text-sm">Cargando rutas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Bus className="h-10 w-10 opacity-30" />
          <p className="text-sm text-center">
            {search ? 'No se encontraron rutas para tu búsqueda.' : 'No hay rutas disponibles.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((route) => (
            <div
              key={route.id}
              className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3 active:scale-[0.99] transition-transform"
            >
              {/* Destino + Cooperativa */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <p className="font-bold text-base text-foreground">{route.destination_city}</p>
                  </div>
                  <p className="text-xs text-foreground-muted mt-1 ml-8">{route.cooperative_name}</p>
                </div>

                {route.dispatch_phone && (
                  <a
                    href={`tel:${route.dispatch_phone.replace(/[\s-]/g, '')}`}
                    className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold active:bg-emerald-500/20 transition"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Llamar
                  </a>
                )}
              </div>

              {/* Info de horarios y terminal */}
              <div className="grid grid-cols-1 gap-2 pt-3 border-t border-border/40">
                <div className="flex items-start gap-2 text-foreground-muted text-xs">
                  <Bus className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground-subtle" />
                  <span>Terminal: <span className="text-foreground font-medium">{route.origin_terminal}</span></span>
                </div>
                <div className="flex items-start gap-2 text-foreground-muted text-xs">
                  <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground-subtle" />
                  <span>Horarios: <span className="text-foreground font-medium">{route.departure_schedules}</span></span>
                </div>
                {route.dispatch_phone && (
                  <div className="flex items-center gap-2 text-foreground-muted text-xs">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
                    <span className="font-mono text-foreground">{route.dispatch_phone}</span>
                  </div>
                )}
              </div>

              {/* Notas */}
              {route.notes && (
                <div className="p-2.5 bg-muted/40 border border-border/40 rounded-xl text-[11px] text-foreground-muted">
                  💡 {route.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
