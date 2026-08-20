import { useState } from 'react'
import { Bus, Search, Phone, Clock, MapPin, Navigation, Plus } from 'lucide-react'
import { useBusRoutes } from '@/modules/buses/hooks/useBuses'
import { BusFormModal } from '@/modules/buses/components/BusFormModal'
import {
  Input,
  Skeleton,
  EmptyState,
  Button,
} from '@/shared/components/ui'

export default function CourierBusesPage() {
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data: routes = [], isLoading } = useBusRoutes()

  const filtered = routes
    .filter((r) => r.is_active)
    .filter((r) => {
      const q = search.toLowerCase()
      return (
        r.destination_city.toLowerCase().includes(q) ||
        r.cooperative_name.toLowerCase().includes(q) ||
        r.origin_terminal.toLowerCase().includes(q)
      )
    })

  const openMapForTerminal = (terminalName: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(terminalName + ' Nicaragua')}`, '_blank')
  }

  return (
    <div className="space-y-5 animate-fade-in pb-20 max-w-2xl mx-auto">
      {/* Header Celeste Pastel Ejecutivo */}
      <div className="bg-[#F5F8FE] border border-blue-100/70 rounded-3xl p-5 shadow-2xs flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540] flex items-center gap-2">
            <Bus className="h-5 w-5 text-sky-700" />
            Directorio de Buses
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Consulta y registra destinos, cooperativas, horarios y contactos.
          </p>
        </div>

        <Button
          onClick={() => setIsFormOpen(true)}
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          className="font-bold text-xs shadow-xs shrink-0 rounded-2xl bg-[#004594] hover:bg-[#003875] text-white"
        >
          Registrar Bus
        </Button>
      </div>

      {/* Buscador táctil */}
      <div>
        <Input
          placeholder="Buscar por destino, cooperativa o terminal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4 text-slate-400" />}
        />
      </div>

      {/* Lista de Cooperativas en Tarjetas Pastel Suaves */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No se encontraron rutas' : 'No hay rutas disponibles'}
          description="Intenta con otro nombre de ciudad, cooperativa o terminal."
          icon={<Bus className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-3.5">
          {filtered.map((route, idx) => {
            const cardStyles = [
              'bg-[#F5F8FE] border-blue-100/70',
              'bg-[#FAF8FE] border-purple-100/70',
              'bg-[#F3F9F6] border-emerald-100/70',
              'bg-[#FCFAF4] border-amber-100/70',
            ]
            const cardStyle = cardStyles[idx % cardStyles.length]

            return (
              <div
                key={route.id}
                className={`p-5 ${cardStyle} border rounded-3xl shadow-2xs space-y-3.5 hover:shadow-xs transition-all`}
              >
                {/* Destino + Cooperativa */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-2xl bg-white/90 text-sky-700 border border-sky-100 shadow-2xs">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-extrabold text-[#0A2540]">{route.destination_city}</h3>
                    </div>
                    <p className="text-xs text-slate-600 font-bold ml-9">{route.cooperative_name}</p>
                  </div>
                </div>

                {/* Terminal y Horario en badges pulcros */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/60 text-xs font-medium">
                  <div className="flex items-center gap-2 text-slate-700 bg-white/80 p-2.5 rounded-2xl border border-slate-200/60">
                    <Bus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>Terminal: <strong className="text-slate-900 font-bold">{route.origin_terminal}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 bg-white/80 p-2.5 rounded-2xl border border-slate-200/60">
                    <Clock className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                    <span>Horarios: <strong className="text-sky-950 font-bold">{route.departure_schedules}</strong></span>
                  </div>
                </div>

                {/* Botón Llamar y Botón Abrir Mapa */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  {route.dispatch_phone && (
                    <a
                      href={`tel:${route.dispatch_phone.replace(/[\s-]/g, '')}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold active:bg-emerald-100 transition cursor-pointer shadow-2xs"
                    >
                      <Phone className="h-4 w-4" />
                      Llamar ({route.dispatch_phone})
                    </a>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openMapForTerminal(route.origin_terminal)}
                    leftIcon={<Navigation className="h-3.5 w-3.5 text-indigo-700" />}
                    className="text-2xs font-bold rounded-2xl"
                  >
                    Abrir Mapa
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Registro / Edición de Bus */}
      <BusFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </div>
  )
}
