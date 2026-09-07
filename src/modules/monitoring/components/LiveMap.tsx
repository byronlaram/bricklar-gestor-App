import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Layers,
  Maximize,
  Minimize2,
  Crosshair,
  CheckCircle2,
  Route,
  ListFilter,
  AlertCircle,
} from 'lucide-react'
import type { CourierMonitoringSummary, BreadcrumbPoint } from '../types/monitoring.types'
import type { TaskWithCourier } from '@/modules/tasks/types/task.types'
import { TASK_STATUS_LABELS } from '@/shared/types'
import { parseCoordinatesFromMapsUrl } from '@/shared/utils/geoHelper'

interface LiveMapProps {
  couriers: CourierMonitoringSummary[]
  tasks: TaskWithCourier[]
  selectedCourierId: string | null
  onSelectCourier: (courierId: string | null) => void
  onOpenTaskDetail?: (taskId: string) => void
  trails?: Record<string, BreadcrumbPoint[]>
  statusFilter?: 'all' | 'en_route' | 'in_progress' | 'pending' | 'completed'
  onStatusFilterChange?: (status: 'all' | 'en_route' | 'in_progress' | 'pending' | 'completed') => void
  className?: string
}

// Coordenadas por defecto (Managua, Nicaragua / Centroamérica)
const DEFAULT_CENTER: [number, number] = [12.1364, -86.2514]
const DEFAULT_ZOOM = 13

// Proveedores de Mapas Gratuitos y Libres de Marcas de Agua
const TILE_LAYERS = {
  osm: {
    name: 'OpenStreetMap Estándar',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  esri: {
    name: 'Esri Callejero (Limpio & Rápido)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; OpenStreetMap contributors',
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

export function LiveMap({
  couriers,
  tasks,
  selectedCourierId,
  onSelectCourier,
  trails = {},
  statusFilter = 'all',
  onStatusFilterChange,
  className = '',
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const routesLayerRef = useRef<L.LayerGroup | null>(null)

  const [activeTileKey, setActiveTileKey] = useState<keyof typeof TILE_LAYERS>('osm')
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false)
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showTrails, setShowTrails] = useState(true)

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

  // 1. Inicializar Mapa Leaflet una sola vez
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    })

    // Controles de zoom abajo a la derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const initialLayer = L.tileLayer(TILE_LAYERS[activeTileKey].url, {
      attribution: TILE_LAYERS[activeTileKey].attribution,
      maxZoom: 19,
    }).addTo(map)

    tileLayerRef.current = initialLayer

    const markersGroup = L.layerGroup().addTo(map)
    const routesGroup = L.layerGroup().addTo(map)

    markersLayerRef.current = markersGroup
    routesLayerRef.current = routesGroup
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // 2. Cambiar estilo de capa de mapa
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

  // 3. Ajustar vista para abarcar todos los elementos activos
  const handleFitAllBounds = useCallback(() => {
    if (!mapInstanceRef.current) return

    const points: [number, number][] = []

    // Coordenadas de tareas filtradas
    tasks.forEach((t) => {
      const lat = t.latitude ?? parseCoordinatesFromMapsUrl(t.maps_url)?.latitude
      const lng = t.longitude ?? parseCoordinatesFromMapsUrl(t.maps_url)?.longitude
      if (lat && lng) {
        points.push([lat, lng])
      }
    })

    // Posición de motorizados (incluida en vista general o cuando no hay tareas filtradas)
    if (statusFilter === 'all' || statusFilter === 'en_route' || points.length === 0) {
      couriers.forEach((c) => {
        if (c.position?.latitude && c.position?.longitude) {
          points.push([c.position.latitude, c.position.longitude])
        }
      })
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })
    } else {
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    }
  }, [couriers, tasks, statusFilter])

  // Reajustar vista automáticamente cuando cambia el filtro de estado o se cargan tareas por primera vez
  const initialFitDoneRef = useRef(false)
  useEffect(() => {
    if (!initialFitDoneRef.current && tasks.length > 0) {
      initialFitDoneRef.current = true
      handleFitAllBounds()
    }
  }, [tasks.length, handleFitAllBounds])

  useEffect(() => {
    if (statusFilter) {
      const timer = setTimeout(() => {
        handleFitAllBounds()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [statusFilter, handleFitAllBounds])

  // 4. Centrar en el motorizado seleccionado
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedCourierId) return

    const selected = couriers.find((c) => c.courier_id === selectedCourierId)
    if (selected?.position?.latitude && selected?.position?.longitude) {
      mapInstanceRef.current.flyTo(
        [selected.position.latitude, selected.position.longitude],
        16,
        { duration: 1.2 }
      )
    }
  }, [selectedCourierId, couriers])

  // 5. Renderizar Marcadores de Motorizados, Paradas, Rutas e Historial Continuo
  useEffect(() => {
    if (!markersLayerRef.current || !routesLayerRef.current) return

    markersLayerRef.current.clearLayers()
    routesLayerRef.current.clearLayers()

    // Si estamos en un filtro específico (como 'pending' o 'completed'), ocultar el rastro continuo del motorizado
    const isShowingTrails = showTrails && (statusFilter === 'all' || statusFilter === 'en_route')

    // ─── A. Dibujar Marcadores de Tareas / Paradas ───
    tasks.forEach((task, idx) => {
      const effectiveLat = task.latitude ?? parseCoordinatesFromMapsUrl(task.maps_url)?.latitude
      const effectiveLng = task.longitude ?? parseCoordinatesFromMapsUrl(task.maps_url)?.longitude
      if (!effectiveLat || !effectiveLng) return

      const isEnRoute = task.status === 'en_route'
      const isInProgress = task.status === 'in_progress'
      const isCompleted = task.status === 'completed'

      const pinBgColor = isEnRoute
        ? '#9333ea' // Purple
        : isInProgress
        ? '#d97706' // Amber
        : isCompleted
        ? '#059669' // Emerald
        : '#2563eb' // Blue

      const html = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
          ${isEnRoute ? '<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(147, 51, 234, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px;"></div>' : ''}
          <div style="
            background: ${pinBgColor};
            color: white;
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            font-family: monospace;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
            border: 2px solid white;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>#${task.route_order || idx + 1}</span>
            <span style="font-size: 9px; opacity: 0.9;">${task.code}</span>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid ${pinBgColor};
            margin-top: -1px;
          "></div>
        </div>
      `

      const taskIcon = L.divIcon({
        html,
        className: 'custom-task-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const marker = L.marker([effectiveLat, effectiveLng], { icon: taskIcon })

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 210px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <strong style="color: #0f172a; font-size: 13px;">${task.code}</strong>
            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: bold; color: #475569;">
              ${TASK_STATUS_LABELS[task.status] || task.status}
            </span>
          </div>
          <div style="font-weight: bold; color: #1e293b; margin-bottom: 4px;">${task.title}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">
            <strong>Contacto:</strong> ${task.contact_name || task.provider_name || 'Sin especificar'}
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            <strong>Dirección:</strong> ${task.address || 'Sin dirección registrada'}
          </div>
          ${
            task.requires_collection
              ? `<div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 8px; border-radius: 8px; color: #065f46; font-size: 11px; font-weight: bold; margin-bottom: 8px;">
                  Cobro: ${task.expected_collection_currency === 'USD' ? 'US$' : 'C$'}${task.expected_collection_amount?.toFixed(2)}
                </div>`
              : ''
          }
          <div style="display: flex; gap: 4px; padding-top: 4px;">
            ${
              task.phone
                ? `<a href="tel:${task.phone}" style="flex: 1; text-align: center; background: #e0e7ff; color: #3730a3; padding: 4px 6px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 10px;">Llamar</a>`
                : ''
            }
            ${
              task.whatsapp
                ? `<a href="https://wa.me/${task.whatsapp.replace(/\D/g, '')}" target="_blank" style="flex: 1; text-align: center; background: #dcfce7; color: #166534; padding: 4px 6px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 10px;">WhatsApp</a>`
                : ''
            }
          </div>
        </div>
      `

      marker.bindPopup(popupContent)
      markersLayerRef.current?.addLayer(marker)
    })

    // ─── B. Dibujar Marcadores de Motorizados & Rastro de Trayectoria Continua ───
    couriers.forEach((courier) => {
      const isSelected = selectedCourierId === courier.courier_id
      const isOnline = courier.is_online
      const hasActiveRoute = courier.active_task?.status === 'en_route'
      const statusColor = isOnline ? (hasActiveRoute ? '#9333ea' : '#059669') : '#64748b'

      // 1. Rastro continuo de trayectoria (Trail)
      if (isShowingTrails) {
        const courierTrail = [...(trails[courier.courier_id] || [])]

        // Añadir posición en vivo actual al final del rastro
        if (courier.position?.latitude && courier.position?.longitude) {
          const lastPoint = courierTrail[courierTrail.length - 1]
          if (
            !lastPoint ||
            Math.abs(lastPoint.latitude - courier.position.latitude) > 0.00003 ||
            Math.abs(lastPoint.longitude - courier.position.longitude) > 0.00003
          ) {
            courierTrail.push({
              latitude: courier.position.latitude,
              longitude: courier.position.longitude,
              timestamp: new Date().toISOString(),
              speed: courier.position.speed,
            })
          }
        }

        if (courierTrail.length >= 2) {
          const latLngs: [number, number][] = courierTrail.map((p) => [p.latitude, p.longitude])

          // Glow exterior
          const glowPolyline = L.polyline(latLngs, {
            color: isSelected ? '#6366f1' : '#818cf8',
            weight: isSelected ? 8 : 5,
            opacity: isSelected ? 0.35 : 0.2,
            lineCap: 'round',
            lineJoin: 'round',
          })
          routesLayerRef.current?.addLayer(glowPolyline)

          // Trazo central nítido
          const corePolyline = L.polyline(latLngs, {
            color: isSelected ? '#4338ca' : '#6366f1',
            weight: isSelected ? 3.5 : 2.5,
            opacity: isSelected ? 0.95 : 0.75,
            dashArray: isSelected ? undefined : '5, 6',
            lineCap: 'round',
            lineJoin: 'round',
          })
          routesLayerRef.current?.addLayer(corePolyline)

          // Puntos intermedios de paso (Breadcrumbs)
          if (isSelected || courierTrail.length <= 15) {
            courierTrail.forEach((point, pIdx) => {
              if (pIdx === 0 || pIdx % 4 === 0 || pIdx === courierTrail.length - 1) {
                const circle = L.circleMarker([point.latitude, point.longitude], {
                  radius: isSelected ? 3.5 : 2.5,
                  fillColor: isSelected ? '#4338ca' : '#6366f1',
                  color: '#ffffff',
                  weight: 1.5,
                  opacity: 1,
                  fillOpacity: 0.9,
                })
                const timeStr = point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : ''
                circle.bindTooltip(`📍 ${courier.courier_name} (${timeStr}${point.speed ? ` · ${point.speed} km/h` : ''})`, {
                  direction: 'top',
                  offset: [0, -4],
                })
                routesLayerRef.current?.addLayer(circle)
              }
            })
          }
        }
      }

      if (!courier.position?.latitude || !courier.position?.longitude) return

      const courierHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); cursor: pointer;">
          ${
            isOnline
              ? `<div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${statusColor}; opacity: 0.35; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: ${statusColor};
            border: 3px solid white;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 900;
            font-size: 13px;
            position: relative;
            ${isSelected ? 'outline: 3px solid #6366f1; outline-offset: 2px;' : ''}
          ">
            <svg style="width: 18px; height: 18px; fill: currentColor;" viewBox="0 0 24 24">
              <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm14-8.5c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm-8.2-7.5l2.2-3.7c.3-.5.8-.8 1.4-.8h3.6v2h-3.1l-1.5 2.5 1.9 1.9c.4.4.6.9.6 1.4v4.2h-2v-3.7l-2.4-2.4-2.1 3.5-1.7-1 2.6-4.4z"/>
            </svg>
          </div>
          <div style="
            background: rgba(15, 23, 42, 0.85);
            color: white;
            backdrop-filter: blur(4px);
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            margin-top: 3px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.2);
          ">
            ${courier.courier_name}
          </div>
        </div>
      `

      const courierIcon = L.divIcon({
        html: courierHtml,
        className: 'custom-courier-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const marker = L.marker([courier.position.latitude, courier.position.longitude], {
        icon: courierIcon,
        zIndexOffset: isSelected ? 1000 : 500,
      })

      const timeStr = courier.last_ping
        ? new Date(courier.last_ping).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Sin registro reciente'

      const courierPopup = `
        <div style="font-family: inherit; font-size: 12px; min-width: 200px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <strong style="color: #0f172a; font-size: 13px;">${courier.courier_name}</strong>
            <span style="background: ${isOnline ? '#dcfce7' : '#f1f5f9'}; color: ${isOnline ? '#166534' : '#64748b'}; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: bold;">
              ${isOnline ? 'En línea' : 'Sin señal'}
            </span>
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">
            <strong>Última señal GPS:</strong> ${timeStr}
          </div>
          ${
            courier.position?.speed != null
              ? `<div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">
                  <strong>Velocidad:</strong> ${Math.round(courier.position.speed)} km/h
                </div>`
              : ''
          }
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            <strong>Entregas:</strong> ${courier.completed_tasks_count} / ${courier.assigned_tasks_count} (${courier.progress_percentage}%)
          </div>
          ${
            courier.active_task
              ? `<div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 4px 8px; border-radius: 8px; color: #6b21a8; font-size: 11px; font-weight: bold; margin-bottom: 6px;">
                  Gestión: ${courier.active_task.code} - ${courier.active_task.title}
                </div>`
              : ''
          }
          ${
            courier.courier_phone
              ? `<a href="tel:${courier.courier_phone}" style="display: block; text-align: center; background: #e0e7ff; color: #3730a3; padding: 4px 6px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 10px; margin-top: 4px;">
                  Llamar al motorizado
                </a>`
              : ''
          }
        </div>
      `

      marker.bindPopup(courierPopup)
      marker.on('click', () => onSelectCourier(isSelected ? null : courier.courier_id))
      markersLayerRef.current?.addLayer(marker)

      // ─── C. Trazar Línea de Ruta hacia la tarea activa ───
      if (isShowingTrails && courier.active_task?.latitude && courier.active_task?.longitude) {
        const polyline = L.polyline(
          [
            [courier.position.latitude, courier.position.longitude],
            [courier.active_task.latitude, courier.active_task.longitude],
          ],
          {
            color: isSelected ? '#9333ea' : '#c084fc',
            weight: isSelected ? 4 : 2.5,
            opacity: 0.85,
            dashArray: '6, 8',
          }
        )
        routesLayerRef.current?.addLayer(polyline)
      }
    })
  }, [couriers, tasks, selectedCourierId, onSelectCourier, trails, showTrails, statusFilter])

  const activeCouriersCount = couriers.filter((c) => c.is_online || c.position != null).length
  const tasksWithCoordsCount = tasks.filter((t) => t.latitude || parseCoordinatesFromMapsUrl(t.maps_url)).length

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none border-0 shadow-none bg-slate-900 flex flex-col animate-fade-in'
          : `relative w-full h-full rounded-2xl overflow-hidden shadow-card border border-slate-200 bg-slate-100 ${className}`
      }
    >
      {/* Contenedor Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Banner Superior cuando está en Pantalla Completa */}
      {isFullscreen && (
        <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-lg flex items-center gap-2.5 pointer-events-auto animate-fade-in">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold tracking-tight">
            Monitoreo en Pantalla Completa
          </span>
          <span className="text-[10px] font-semibold bg-indigo-600/80 px-2 py-0.5 rounded-md">
            {activeCouriersCount} motorizados activos
          </span>
        </div>
      )}

      {/* Aviso informativo si hay tareas filtradas pero sin coordenadas registradas */}
      {statusFilter !== 'all' && tasks.length > 0 && tasksWithCoordsCount === 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md text-amber-200 px-4 py-2 rounded-xl border border-amber-500/30 shadow-xl text-xs font-semibold flex items-center gap-2 animate-fade-in max-w-[92%] sm:max-w-md pointer-events-auto text-center justify-center">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            {tasks.length} parada(s) {statusFilter === 'pending' ? 'pendientes' : statusFilter === 'completed' ? 'completadas' : 'filtradas'} registradas hoy (sin enlace con coordenadas GPS).
          </span>
        </div>
      )}

      {/* Botones de Control Flotantes Superiores */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {/* Selector de Filtro de Estado de Tareas */}
        {onStatusFilterChange && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsStatusMenuOpen(!isStatusMenuOpen)
                setIsLayerMenuOpen(false)
              }}
              className={`p-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border ${
                statusFilter && statusFilter !== 'all'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-200'
                  : 'bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 hover:text-slate-900 border-slate-200/80'
              }`}
              title="Filtrar tareas por estado en el mapa"
            >
              <ListFilter className="h-4 w-4" />
              <span className="hidden sm:inline">
                {statusFilter === 'en_route'
                  ? 'En Ruta'
                  : statusFilter === 'in_progress'
                  ? 'En Gestión'
                  : statusFilter === 'pending'
                  ? 'Pendientes'
                  : statusFilter === 'completed'
                  ? 'Completadas'
                  : 'Filtrar Estado'}
              </span>
            </button>

            {isStatusMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 space-y-1 z-30 animate-fade-in">
                {[
                  { key: 'all', label: 'Todas las tareas', color: 'bg-slate-500' },
                  { key: 'en_route', label: 'En Ruta', color: 'bg-purple-600' },
                  { key: 'in_progress', label: 'En Gestión', color: 'bg-amber-500' },
                  { key: 'pending', label: 'Pendientes', color: 'bg-blue-600' },
                  { key: 'completed', label: 'Completadas', color: 'bg-emerald-600' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onStatusFilterChange(item.key as any)
                      setIsStatusMenuOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-xl font-semibold transition cursor-pointer flex items-center justify-between ${
                      (statusFilter || 'all') === item.key
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span>{item.label}</span>
                    </span>
                    {(statusFilter || 'all') === item.key && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selector de Capas */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsLayerMenuOpen(!isLayerMenuOpen)
              setIsStatusMenuOpen(false)
            }}
            className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl shadow-md border border-slate-200/80 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Cambiar capa de mapa"
          >
            <Layers className="h-4 w-4 text-indigo-600" />
            <span className="hidden sm:inline">Capas</span>
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 space-y-1 z-30 animate-fade-in">
              {(Object.keys(TILE_LAYERS) as (keyof typeof TILE_LAYERS)[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSwitchTile(key)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl font-semibold transition cursor-pointer flex items-center justify-between ${
                    activeTileKey === key
                      ? 'bg-indigo-50 text-indigo-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{TILE_LAYERS[key].name}</span>
                  {activeTileKey === key && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botón Toggle Rastro de Ruta / Trayectoria */}
        <button
          type="button"
          onClick={() => setShowTrails(!showTrails)}
          className={`p-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border ${
            showTrails
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white/95 backdrop-blur-md hover:bg-white text-slate-500 border-slate-200/80'
          }`}
          title={showTrails ? 'Ocultar rastro GPS continuo' : 'Mostrar rastro GPS continuo'}
        >
          <Route className="h-4 w-4 text-indigo-600" />
          <span className="hidden sm:inline">{showTrails ? 'Rastro GPS ✓' : 'Rastro GPS'}</span>
        </button>

        {/* Botón Centrar Todos */}
        <button
          type="button"
          onClick={handleFitAllBounds}
          className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl shadow-md border border-slate-200/80 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title="Centrar en todos los puntos activos"
        >
          <Crosshair className="h-4 w-4 text-slate-600" />
          <span className="hidden sm:inline">Centrar Todos</span>
        </button>

        {/* Botón Pantalla Completa / Salir */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className={`p-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border ${
            isFullscreen
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500'
              : 'bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 hover:text-slate-900 border-slate-200/80'
          }`}
          title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Ampliar a pantalla completa'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-4 w-4 text-white" />
              <span>Salir</span>
            </>
          ) : (
            <>
              <Maximize className="h-4 w-4 text-indigo-600" />
              <span className="hidden sm:inline">Pantalla Completa</span>
            </>
          )}
        </button>
      </div>

      {/* Leyenda Flotante Inferior Izquierda con chips interactivos */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-md border border-slate-200/80 text-2xs font-semibold text-slate-700 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onStatusFilterChange && onStatusFilterChange(statusFilter === 'en_route' ? 'all' : 'en_route')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${
            statusFilter === 'en_route' ? 'bg-purple-100 text-purple-900 font-bold ring-1 ring-purple-400' : 'hover:bg-slate-100'
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-purple-600"></span>
          <span>En Ruta</span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange && onStatusFilterChange(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${
            statusFilter === 'in_progress' ? 'bg-amber-100 text-amber-900 font-bold ring-1 ring-amber-400' : 'hover:bg-slate-100'
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          <span>En Gestión</span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange && onStatusFilterChange(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${
            statusFilter === 'pending' ? 'bg-blue-100 text-blue-900 font-bold ring-1 ring-blue-400' : 'hover:bg-slate-100'
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
          <span>Pendiente</span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange && onStatusFilterChange(statusFilter === 'completed' ? 'all' : 'completed')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${
            statusFilter === 'completed' ? 'bg-emerald-100 text-emerald-900 font-bold ring-1 ring-emerald-400' : 'hover:bg-slate-100'
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
          <span>Completada</span>
        </button>

        <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Motorizado en Vivo</span>
        </div>

        {showTrails && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
            <span className="w-4 h-1 rounded-full bg-indigo-500"></span>
            <span>Rastro Recorrido</span>
          </div>
        )}
      </div>
    </div>
  )
}
