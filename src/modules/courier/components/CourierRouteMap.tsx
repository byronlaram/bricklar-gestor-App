import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Navigation,
  Phone,
  MessageSquare,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize2,
  Route,
  LocateFixed,
  Layers,
  ExternalLink,
  Clock,
  DollarSign,
  Receipt,
  MapPin,
  Play,
  RotateCcw,
} from 'lucide-react'
import type { TaskWithCourier } from '@/modules/tasks/types/task.types'
import { TaskStatusBadge } from '@/modules/tasks/components/TaskStatusBadge'
import { Button, Card } from '@/shared/components/ui'
import { cn } from '@/shared/utils/cn'

interface CourierRouteMapProps {
  tasks: TaskWithCourier[]
  courierLocation?: { latitude: number; longitude: number; heading?: number | null } | null
  onStartRoute: (task: TaskWithCourier) => void
  onCancelRoute: (task: TaskWithCourier) => void
  onStartManagement: (task: TaskWithCourier) => void
  onComplete: (task: TaskWithCourier) => void
  isChangingStatus?: boolean
  className?: string
}

// Coordenadas por defecto (Managua, Nicaragua)
const DEFAULT_CENTER: [number, number] = [12.1364, -86.2514]
const DEFAULT_ZOOM = 14

const TILE_LAYERS = {
  esri: {
    name: 'Esri Callejero (Limpio & Rápido)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; OpenStreetMap contributors',
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  hot: {
    name: 'OSM Humanitario (Detallado)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap',
  },
  satellite: {
    name: 'Esri Satelital (Vista Aérea)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, i-cubed, USDA, USGS, AEX, GeoEye',
  },
}

export function CourierRouteMap({
  tasks,
  courierLocation,
  onStartRoute,
  onCancelRoute,
  onStartManagement,
  onComplete,
  isChangingStatus = false,
  className = '',
}: CourierRouteMapProps) {
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const routePolylineRef = useRef<L.Polyline | null>(null)
  const courierMarkerRef = useRef<L.Marker | null>(null)

  const [activeTileKey, setActiveTileKey] = useState<keyof typeof TILE_LAYERS>('esri')
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  // Reajustar dimensiones de Leaflet cuando cambia a pantalla completa
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize()
    }, 150)
    return () => clearTimeout(timer)
  }, [isFullscreen])

  // Salir de pantalla completa con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // Ordenar tareas por orden de ruta
  const orderedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => (a.route_order ?? 999) - (b.route_order ?? 999))
  }, [tasks])

  // Tareas con coordenadas válidas
  const mappedTasks = useMemo(() => {
    return orderedTasks.filter((t) => t.latitude != null && t.longitude != null && !isNaN(t.latitude) && !isNaN(t.longitude))
  }, [orderedTasks])

  // Seleccionar automáticamente la primera tarea pendiente si no hay ninguna seleccionada
  useEffect(() => {
    if (!selectedTaskId && orderedTasks.length > 0) {
      const firstActive = orderedTasks.find((t) => t.status === 'en_route' || t.status === 'in_progress') ||
        orderedTasks.find((t) => t.status === 'pending' || t.status === 'assigned') ||
        orderedTasks[0]
      if (firstActive) {
        setSelectedTaskId(firstActive.id)
      }
    }
  }, [orderedTasks, selectedTaskId])

  const selectedTask = useMemo(() => {
    return orderedTasks.find((t) => t.id === selectedTaskId) || null
  }, [orderedTasks, selectedTaskId])

  const selectedIndex = useMemo(() => {
    if (!selectedTaskId) return -1
    return orderedTasks.findIndex((t) => t.id === selectedTaskId)
  }, [orderedTasks, selectedTaskId])

  // 1. Inicializar Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const initialLayer = L.tileLayer(TILE_LAYERS[activeTileKey].url, {
      attribution: TILE_LAYERS[activeTileKey].attribution,
      maxZoom: 19,
    }).addTo(map)

    tileLayerRef.current = initialLayer

    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // 2. Cambiar capa de mapa
  const handleSwitchTile = (key: keyof typeof TILE_LAYERS) => {
    setActiveTileKey(key)
    setIsLayerMenuOpen(false)
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current)
      const newLayer = L.tileLayer(TILE_LAYERS[key].url, {
        attribution: TILE_LAYERS[key].attribution,
        maxZoom: 19,
      }).addTo(mapInstanceRef.current)
      tileLayerRef.current = newLayer
    }
  }

  // 3. Centrar en la ubicación del motorizado
  const handleCenterOnCourier = useCallback(() => {
    if (!mapInstanceRef.current) return

    if (courierLocation?.latitude && courierLocation?.longitude) {
      mapInstanceRef.current.flyTo(
        [courierLocation.latitude, courierLocation.longitude],
        16,
        { duration: 1.2 }
      )
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapInstanceRef.current?.flyTo(
            [pos.coords.latitude, pos.coords.longitude],
            16,
            { duration: 1.2 }
          )
        },
        () => {
          // Fallback a Managua
          mapInstanceRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    }
  }, [courierLocation])

  // 4. Centrar para ver toda la ruta
  const handleFitAllRoute = useCallback(() => {
    if (!mapInstanceRef.current) return

    const points: [number, number][] = []

    if (courierLocation?.latitude && courierLocation?.longitude) {
      points.push([courierLocation.latitude, courierLocation.longitude])
    }

    mappedTasks.forEach((t) => {
      if (t.latitude != null && t.longitude != null) {
        points.push([t.latitude, t.longitude])
      }
    })

    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 80], maxZoom: 16 })
    } else {
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    }
  }, [courierLocation, mappedTasks])

  // Auto-ajustar vista inicial cuando se cargan las tareas
  useEffect(() => {
    if (mappedTasks.length > 0) {
      handleFitAllRoute()
    }
  }, [mappedTasks.length])

  // 5. Centrar cuando se selecciona una tarea específica
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedTask) return

    if (selectedTask.latitude != null && selectedTask.longitude != null) {
      mapInstanceRef.current.flyTo(
        [selectedTask.latitude, selectedTask.longitude],
        16,
        { duration: 0.8 }
      )
    }
  }, [selectedTaskId])

  // 6. Dibujar Marcadores y Trazar Líneas de Ruta
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return

    markersLayerRef.current.clearLayers()

    // ─── A. Marcador del Motorizado (GPS en vivo) ───
    if (courierLocation?.latitude && courierLocation?.longitude) {
      const courierHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); cursor: pointer;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(38, 50, 107, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #181d43 0%, #26326b 100%);
            border: 3px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"></circle>
              <circle cx="5.5" cy="17.5" r="3.5"></circle>
              <circle cx="15" cy="5" r="1"></circle>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"></path>
            </svg>
          </div>
          <div style="
            background: #181d43;
            color: white;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
            margin-top: 2px;
            border: 1px solid white;
            white-space: nowrap;
          ">
            TÚ
          </div>
        </div>
      `

      const courierIcon = L.divIcon({
        html: courierHtml,
        className: 'custom-courier-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const marker = L.marker([courierLocation.latitude, courierLocation.longitude], {
        icon: courierIcon,
        zIndexOffset: 1000,
      }).addTo(markersLayerRef.current)

      courierMarkerRef.current = marker
    }

    // ─── B. Marcadores de Paradas Numeradas ───
    const routeCoords: [number, number][] = []

    // Agregar posición inicial del motorizado si existe
    if (courierLocation?.latitude && courierLocation?.longitude) {
      routeCoords.push([courierLocation.latitude, courierLocation.longitude])
    }

    orderedTasks.forEach((task, idx) => {
      if (task.latitude == null || task.longitude == null) return

      const isSelected = task.id === selectedTaskId
      const isEnRoute = task.status === 'en_route'
      const isInProgress = task.status === 'in_progress'
      const isCompleted = task.status === 'completed'
      const isCancelled = task.status === 'cancelled' || task.approval_status === 'rejected'

      const stopNumber = task.route_order || idx + 1

      // Color según estado
      const pinColor = isCompleted
        ? '#059669' // Emerald
        : isEnRoute
        ? '#9333ea' // Purple
        : isInProgress
        ? '#d97706' // Amber
        : isCancelled
        ? '#94a3b8' // Slate
        : '#2563eb' // Blue

      if (!isCompleted && !isCancelled) {
        routeCoords.push([task.latitude, task.longitude])
      }

      const html = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
          ${
            isEnRoute || isSelected
              ? `<div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: ${
                  isEnRoute ? 'rgba(147, 51, 234, 0.4)' : 'rgba(37, 99, 235, 0.35)'
                }; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; top: -7px;"></div>`
              : ''
          }
          <div style="
            background: ${pinColor};
            color: white;
            padding: ${isSelected ? '6px 10px' : '4px 8px'};
            border-radius: 9999px;
            font-size: ${isSelected ? '12px' : '11px'};
            font-weight: 800;
            box-shadow: ${isSelected ? '0 6px 14px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.25)'};
            border: ${isSelected ? '3px solid #ffffff' : '2px solid #ffffff'};
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            transition: all 0.2s ease;
          ">
            <span>#${stopNumber}</span>
            <span style="font-size: 9px; opacity: 0.95;">${task.code}</span>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: ${isSelected ? '8px' : '6px'} solid ${pinColor};
            margin-top: -1px;
          "></div>
        </div>
      `

      const stopIcon = L.divIcon({
        html,
        className: 'custom-stop-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const marker = L.marker([task.latitude, task.longitude], {
        icon: stopIcon,
        zIndexOffset: isSelected ? 900 : isEnRoute ? 800 : 100,
      }).addTo(markersLayerRef.current!)

      marker.on('click', () => {
        setSelectedTaskId(task.id)
      })
    })

    // ─── C. Trazar Polilínea de Ruta ───
    if (routePolylineRef.current) {
      routePolylineRef.current.remove()
      routePolylineRef.current = null
    }

    if (routeCoords.length >= 2) {
      const polyline = L.polyline(routeCoords, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.75,
        dashArray: '8, 8',
        lineCap: 'round',
      }).addTo(markersLayerRef.current)

      routePolylineRef.current = polyline
    }
  }, [orderedTasks, selectedTaskId, courierLocation])

  // Navegar a parada anterior / siguiente
  const handlePrevStop = () => {
    if (selectedIndex > 0) {
      setSelectedTaskId(orderedTasks[selectedIndex - 1].id)
    }
  }

  const handleNextStop = () => {
    if (selectedIndex < orderedTasks.length - 1) {
      setSelectedTaskId(orderedTasks[selectedIndex + 1].id)
    }
  }

  // Enlaces de navegación externa (Google Maps / Waze)
  const openGoogleMaps = (task: TaskWithCourier) => {
    if (task.latitude != null && task.longitude != null) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`,
        '_blank'
      )
    } else {
      const query = encodeURIComponent(`${task.address || ''} Managua Nicaragua`)
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
    }
  }

  const openWaze = (task: TaskWithCourier) => {
    if (task.latitude != null && task.longitude != null) {
      window.open(`https://waze.com/ul?ll=${task.latitude},${task.longitude}&navigate=yes`, '_blank')
    } else {
      const query = encodeURIComponent(task.address || '')
      window.open(`https://waze.com/ul?q=${query}&navigate=yes`, '_blank')
    }
  }

  const openWhatsApp = (phone?: string | null) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    const url = cleanPhone.startsWith('505')
      ? `https://wa.me/${cleanPhone}`
      : `https://wa.me/505${cleanPhone}`
    window.open(url, '_blank')
  }

  // Contadores rápidos
  const completedCount = orderedTasks.filter((t) => t.status === 'completed').length
  const pendingCount = orderedTasks.filter(
    (t) => t.status === 'pending' || t.status === 'assigned' || t.status === 'en_route' || t.status === 'in_progress'
  ).length

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden flex flex-col',
        isFullscreen
          ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none border-0 shadow-none bg-slate-900 animate-fade-in'
          : 'h-[calc(100vh-140px)] min-h-[520px] rounded-2xl border border-slate-200 bg-slate-100 shadow-sm',
        className
      )}
    >
      {/* ── Barra Superior Flotante con Resumen & Controles ── */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Resumen de paradas */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <MapPin className="w-4 h-4 text-primary-600" />
            <span>{orderedTasks.length} Paradas</span>
          </div>
          <div className="h-3.5 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {pendingCount} Pendientes
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {completedCount} Listas
            </span>
          </div>
        </div>

        {/* Botones de acción del mapa */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Recentrar en motorizado */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCenterOnCourier}
            className="bg-white/95 backdrop-blur-md shadow-md hover:bg-white text-slate-700 font-semibold text-xs h-9 px-3 rounded-xl border-slate-200"
            title="Centrar en mi ubicación GPS"
          >
            <LocateFixed className="w-3.5 h-3.5 text-primary-600 mr-1.5" />
            <span className="hidden sm:inline">Mi Posición</span>
          </Button>

          {/* Ver toda la ruta */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFitAllRoute}
            className="bg-white/95 backdrop-blur-md shadow-md hover:bg-white text-slate-700 font-semibold text-xs h-9 px-3 rounded-xl border-slate-200"
            title="Ver toda la ruta completa"
          >
            <Route className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
            <span className="hidden sm:inline">Ver Ruta</span>
          </Button>

          {/* Menú de Capas */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLayerMenuOpen((prev) => !prev)}
              className="bg-white/95 backdrop-blur-md shadow-md hover:bg-white text-slate-700 font-semibold text-xs h-9 w-9 p-0 rounded-xl border-slate-200 flex items-center justify-center"
              title="Cambiar vista del mapa"
            >
              <Layers className="w-4 h-4 text-slate-700" />
            </Button>

            {isLayerMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Capa del Mapa
                </div>
                {(Object.keys(TILE_LAYERS) as (keyof typeof TILE_LAYERS)[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSwitchTile(key)}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center justify-between transition-colors',
                      activeTileKey === key
                        ? 'bg-primary-50 text-primary-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <span>{TILE_LAYERS[key].name}</span>
                    {activeTileKey === key && <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón Pantalla Completa */}
          <Button
            type="button"
            variant={isFullscreen ? 'primary' : 'outline'}
            size="sm"
            onClick={toggleFullscreen}
            className={cn(
              'shadow-md font-semibold text-xs h-9 px-3 rounded-xl',
              isFullscreen
                ? 'bg-primary-700 hover:bg-primary-800 text-white border-primary-600'
                : 'bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 border-slate-200'
            )}
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Ampliar mapa a pantalla completa'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 mr-1 text-white" />
                <span>Salir</span>
              </>
            ) : (
              <>
                <Maximize className="w-3.5 h-3.5 text-primary-600 mr-1" />
                <span className="hidden sm:inline">Pantalla Completa</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Contenedor del Mapa Leaflet ── */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0" />

      {/* ── Ficha Flotante Inferior de la Parada Activa ── */}
      {selectedTask ? (
        <div className="absolute bottom-3 left-3 right-3 z-[400] max-w-2xl mx-auto">
          <Card className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-4 transition-all duration-300">
            {/* Cabecera de la parada con flechas de navegación */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-700 text-white font-extrabold text-xs shadow-xs">
                  #{selectedIndex + 1}
                </span>
                <div>
                  <span className="text-xs font-mono font-bold text-slate-800 tracking-tight">
                    {selectedTask.code}
                  </span>
                  <span className="ml-2 text-[11px] text-slate-500 font-medium">
                    (Parada {selectedIndex + 1} de {orderedTasks.length})
                  </span>
                </div>
              </div>

              {/* Controles anterior / siguiente */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevStop}
                  disabled={selectedIndex <= 0}
                  className="h-7 w-7 p-0 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  title="Parada anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleNextStop}
                  disabled={selectedIndex >= orderedTasks.length - 1}
                  className="h-7 w-7 p-0 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  title="Parada siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Contenido Principal de la Parada */}
            <div className="py-2.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {selectedTask.title}
                  </h4>
                  <p className="text-xs text-slate-600 truncate">
                    {selectedTask.contact_name || selectedTask.institution_name || 'Sin contacto específico'}
                  </p>
                </div>
                <TaskStatusBadge status={selectedTask.status} />
              </div>

              {/* Dirección */}
              <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-relaxed">
                  {selectedTask.address || 'Sin dirección registrada'}
                </span>
              </div>

              {/* Montos / Financiero si aplica */}
              {selectedTask.requires_collection && (
                <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <span className="font-semibold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Cobro Requerido:
                  </span>
                  <span className="font-extrabold font-mono">
                    {selectedTask.expected_collection_currency === 'USD' ? 'US$' : 'C$'}
                    {Number(selectedTask.expected_collection_amount || 0).toFixed(2)}
                  </span>
                </div>
              )}

              {selectedTask.requires_payment && (
                <div className="flex items-center justify-between text-xs bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200">
                  <span className="font-semibold flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                    Pago / Compra:
                  </span>
                  <span className="font-extrabold font-mono">
                    {selectedTask.expected_payment_currency === 'USD' ? 'US$' : 'C$'}
                    {Number(selectedTask.expected_payment_amount || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Barra de Acciones Rápidas (Navegar / Llamar / WhatsApp / Completar) */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              {/* Selector de Navegación GPS */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[150px]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openGoogleMaps(selectedTask)}
                  className="flex-1 h-8 text-xs font-semibold bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                  title="Abrir en Google Maps"
                >
                  <Navigation className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Maps
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openWaze(selectedTask)}
                  className="flex-1 h-8 text-xs font-semibold bg-white border-sky-200 text-sky-700 hover:bg-sky-50"
                  title="Abrir en Waze"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1 text-sky-600" />
                  Waze
                </Button>
              </div>

              {/* Contacto directo */}
              {selectedTask.phone && (
                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${selectedTask.phone}`}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                    title="Llamar al cliente"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => openWhatsApp(selectedTask.whatsapp || selectedTask.phone)}
                    className="h-8 w-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors"
                    title="Escribir por WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Botón de Acción Operativa de la Tarea */}
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedTask.status === 'pending' || selectedTask.status === 'assigned' ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isChangingStatus}
                    onClick={() => onStartRoute(selectedTask)}
                    className="h-8 text-xs font-bold bg-primary-700 hover:bg-primary-800 text-white shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 mr-1 fill-white" />
                    Iniciar Ruta
                  </Button>
                ) : selectedTask.status === 'en_route' ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isChangingStatus}
                      onClick={() => onCancelRoute(selectedTask)}
                      className="h-8 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      title="Cancelar ruta y regresar a pendiente"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isChangingStatus}
                      onClick={() => onStartManagement(selectedTask)}
                      className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Llegué al Sitio
                    </Button>
                  </div>
                ) : selectedTask.status === 'in_progress' ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isChangingStatus}
                    onClick={() => onComplete(selectedTask)}
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Completar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/motorizado/tareas/${selectedTask.id}`)}
                    className="h-8 text-xs font-semibold text-slate-700"
                  >
                    Ver Detalle
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="absolute bottom-4 left-4 right-4 z-[400] text-center bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
          No hay tareas programadas para mostrar en el mapa.
        </div>
      )}
    </div>
  )
}
