import { useState, useRef, useEffect, useMemo } from 'react'
import { Bus, MapPin, Clock, Phone, ChevronDown, X, Check, Search, Sparkles } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import type { BusRoute } from '../types/buses.types'
import { useBusRoutes } from '../hooks/useBuses'

interface BusRouteComboboxProps {
  value?: string
  onChange: (value: string) => void
  onSelectRoute?: (route: BusRoute) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function BusRouteCombobox({
  value = '',
  onChange,
  onSelectRoute,
  placeholder = 'Buscar por destino (ej: Siuna) o cooperativa (ej: Wendelyn)...',
  error,
  disabled = false,
  className,
}: BusRouteComboboxProps) {
  const { data: busRoutes = [], isLoading } = useBusRoutes()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Sincronizar valor externo
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Filtrado y ranking inteligente por Destino, Cooperativa y Terminal
  const filteredRoutes = useMemo(() => {
    if (!busRoutes || busRoutes.length === 0) return []

    const q = normalizeString(query)
    if (!q) {
      // Si no hay búsqueda, mostrar las rutas activas ordenadas por destino
      return [...busRoutes]
        .filter((r) => r.is_active !== false)
        .map((route) => ({
          route,
          score: 1,
          matchReason: 'all' as const,
        }))
    }

    return busRoutes
      .filter((r) => r.is_active !== false)
      .map((route) => {
        const destNorm = normalizeString(route.destination_city)
        const coopNorm = normalizeString(route.cooperative_name)
        const origNorm = normalizeString(route.origin_terminal)
        const notesNorm = normalizeString(route.notes || '')

        let score = 0
        let matchReason: 'destination' | 'cooperative' | 'origin' | 'notes' = 'cooperative'

        // Coincidencia exacta o inicial en Destino (ej: "Siuna", "Estelí")
        if (destNorm.startsWith(q)) {
          score += 100
          matchReason = 'destination'
        } else if (destNorm.includes(q)) {
          score += 70
          matchReason = 'destination'
        }

        // Coincidencia en Cooperativa / Empresa (ej: "Wendelyn", "Cotran")
        if (coopNorm.startsWith(q)) {
          score += 80
          if (score <= 80) matchReason = 'cooperative'
        } else if (coopNorm.includes(q)) {
          score += 50
          if (score <= 50) matchReason = 'cooperative'
        }

        // Coincidencia en Terminal de Origen (ej: "Mayoreo", "Huembes")
        if (origNorm.includes(q)) {
          score += 30
          if (score <= 30) matchReason = 'origin'
        }

        // Coincidencia en Notas
        if (notesNorm.includes(q)) {
          score += 10
          if (score <= 10) matchReason = 'notes'
        }

        return { route, score, matchReason }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
  }, [busRoutes, query])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Desplazar elemento resaltado a la vista
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement
      if (el) {
        el.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    setIsOpen(true)
    setHighlightedIndex(-1)
  }

  const handleSelect = (route: BusRoute) => {
    setSelectedRoute(route)
    setQuery(route.cooperative_name)
    onChange(route.cooperative_name)
    onSelectRoute?.(route)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setQuery('')
    onChange('')
    setSelectedRoute(null)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < filteredRoutes.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredRoutes.length - 1))
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && filteredRoutes[highlightedIndex]) {
      e.preventDefault()
      handleSelect(filteredRoutes[highlightedIndex].route)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Campo de búsqueda interactivo */}
      <div className="relative flex items-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
          <Bus className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'w-full pl-9 pr-16 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border rounded-xl font-medium transition-all shadow-2xs',
            'focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500',
            error
              ? 'border-rose-300 text-rose-900 focus:ring-rose-500/40 focus:border-rose-500'
              : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100',
            disabled && 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          )}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            disabled={disabled}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Indicador de sugerencia de auto-completado */}
      {selectedRoute && !isOpen && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-lg border border-sky-200/80 dark:border-sky-800/60 animate-fade-in">
          <Sparkles className="h-3 w-3 text-sky-600 shrink-0" />
          <span className="font-semibold">{selectedRoute.origin_terminal}</span>
          <span>➔</span>
          <span className="font-bold">{selectedRoute.destination_city}</span>
          {selectedRoute.departure_schedules && (
            <span className="text-slate-500 dark:text-slate-400 text-2xs">({selectedRoute.departure_schedules})</span>
          )}
        </div>
      )}

      {/* Dropdown de Sugerencias */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 flex flex-col animate-fade-in">
          {/* Header del dropdown con total y tip */}
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
              <Search className="h-3 w-3 text-sky-500" />
              Directorio de Buses ({filteredRoutes.length})
            </span>
            <span className="text-2xs text-slate-400 hidden sm:inline">Busca por destino (ej: Siuna) o cooperativa</span>
          </div>

          {/* Lista de Rutas */}
          <ul ref={listRef} className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-1">
            {isLoading ? (
              <li className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
                Cargando directorio de buses...
              </li>
            ) : filteredRoutes.length === 0 ? (
              <li className="p-4 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No hay transportes registrados para "{query}"
                </p>
                <p className="text-2xs text-slate-400">
                  Puedes seguir escribiendo el nombre libremente si no está en el directorio.
                </p>
              </li>
            ) : (
              filteredRoutes.map(({ route, matchReason }, index) => {
                const isSelected = value === route.cooperative_name
                const isHighlighted = index === highlightedIndex

                return (
                  <li
                    key={route.id || index}
                    onClick={() => handleSelect(route)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'p-2.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1',
                      isHighlighted
                        ? 'bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800'
                        : isSelected
                        ? 'bg-slate-50 dark:bg-slate-800/60'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
                    )}
                  >
                    {/* Fila Principal: Nombre del Transporte y Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="p-1 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 shrink-0">
                          <Bus className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {route.cooperative_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {matchReason === 'destination' && (
                          <span className="text-2xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            🎯 Destino: {route.destination_city}
                          </span>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                      </div>
                    </div>

                    {/* Fila Secundaria: Ruta y Terminales */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-[11px] text-slate-600 dark:text-slate-300 pl-7">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{route.origin_terminal}</span>
                        <span className="text-sky-600 font-bold">➔</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{route.destination_city}</span>
                      </span>

                      {route.departure_schedules && (
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-2xs">
                          <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          <span>{route.departure_schedules}</span>
                        </span>
                      )}

                      {route.dispatch_phone && (
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-2xs">
                          <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          <span>{route.dispatch_phone}</span>
                        </span>
                      )}
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
