import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Layers,
  Maximize2,
  CheckCircle2,
} from 'lucide-react'
import type { CourierMonitoringSummary } from '../types/monitoring.types'
import type { TaskWithCourier } from '@/modules/tasks/types/task.types'
import { TASK_STATUS_LABELS } from '@/shared/types'

interface LiveMapProps {
  couriers: CourierMonitoringSummary[]
  tasks: TaskWithCourier[]
  selectedCourierId: string | null
  onSelectCourier: (courierId: string | null) => void
  onOpenTaskDetail?: (taskId: string) => void
  className?: string
}

// Coordenadas por defecto (Managua, Nicaragua / Centroamérica)
const DEFAULT_CENTER: [number, number] = [12.1364, -86.2514]
const DEFAULT_ZOOM = 13

// Proveedores de Mapas Gratuitos
const TILE_LAYERS = {
  voyager: {
    name: 'Carto Voyager (Limpio & Moderno)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
  },
  osm: {
    name: 'OpenStreetMap Estándar',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  dark: {
    name: 'Carto Dark (Modo Oscuro)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
}

export function LiveMap({
  couriers,
  tasks,
  selectedCourierId,
  onSelectCourier,
  className = '',
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const routesLayerRef = useRef<L.LayerGroup | null>(null)

  const [activeTileKey, setActiveTileKey] = useState<keyof typeof TILE_LAYERS>('voyager')
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false)

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

    // Posición de motorizados
    couriers.forEach((c) => {
      if (c.position?.latitude && c.position?.longitude) {
        points.push([c.position.latitude, c.position.longitude])
      }
    })

    // Coordenadas de tareas
    tasks.forEach((t) => {
      if (t.latitude && t.longitude) {
        points.push([t.latitude, t.longitude])
      }
    })

    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    } else {
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    }
  }, [couriers, tasks])

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

  // 5. Renderizar Marcadores de Motorizados, Paradas y Rutas
  useEffect(() => {
    if (!markersLayerRef.current || !routesLayerRef.current) return

    markersLayerRef.current.clearLayers()
    routesLayerRef.current.clearLayers()

    // ─── A. Dibujar Marcadores de Tareas / Paradas ───
    tasks.forEach((task, idx) => {
      if (!task.latitude || !task.longitude) return

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

      const marker = L.marker([task.latitude, task.longitude], { icon: taskIcon })

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

    // ─── B. Dibujar Marcadores de Motorizados ───
    couriers.forEach((courier) => {
      if (!courier.position?.latitude || !courier.position?.longitude) return

      const isSelected = selectedCourierId === courier.courier_id
      const isOnline = courier.is_online
      const hasActiveRoute = courier.active_task?.status === 'en_route'

      const statusColor = isOnline ? (hasActiveRoute ? '#9333ea' : '#059669') : '#64748b'

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
            ${
              courier.avatar_url
                ? `<img src="${courier.avatar_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`
                : '🛵'
            }
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
        zIndexOffset: 1000,
      })

      marker.on('click', () => {
        onSelectCourier(courier.courier_id)
      })

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; min-width: 220px; padding: 2px;">
          <div style="display: flex; items-center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <strong style="color: #0f172a; font-size: 13px;">${courier.courier_name}</strong>
            <span style="display: inline-flex; align-items: center; gap: 4px; color: ${isOnline ? '#059669' : '#94a3b8'}; font-weight: bold; font-size: 10px;">
              ● ${isOnline ? 'En línea' : 'Desconectado'}
            </span>
          </div>
          
          ${
            courier.courier_phone
              ? `<div style="margin-bottom: 4px; font-size: 11px; color: #64748b;">
                  <strong>Teléfono:</strong> <a href="tel:${courier.courier_phone}" style="color: #2563eb; text-decoration: underline;">${courier.courier_phone}</a>
                </div>`
              : ''
          }

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #f8fafc; padding: 6px; border-radius: 8px; margin-bottom: 6px; font-size: 10px;">
            <div>Velocidad: <strong>${courier.position.speed != null ? `${courier.position.speed} km/h` : '0 km/h'}</strong></div>
            <div>Precisión: <strong>±${courier.position.accuracy ?? 10}m</strong></div>
          </div>

          ${
            courier.active_task
              ? `<div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 6px; border-radius: 8px; font-size: 11px; color: #581c87; margin-bottom: 6px;">
                  <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #7e22ce;">Parada Actual:</span>
                  <div style="font-weight: bold;">${courier.active_task.code}: ${courier.active_task.title}</div>
                </div>`
              : '<div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">Sin paradas activas en este momento.</div>'
          }

          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #334155; padding-top: 4px;">
            <span>Progreso hoy:</span>
            <span>${courier.completed_tasks_count} / ${courier.assigned_tasks_count} (${courier.progress_percentage}%)</span>
          </div>
        </div>
      `

      marker.bindPopup(popupHtml)
      markersLayerRef.current?.addLayer(marker)

      // ─── C. Trazar Línea de Ruta hacia la tarea activa ───
      if (courier.active_task?.latitude && courier.active_task?.longitude) {
        const polyline = L.polyline(
          [
            [courier.position.latitude, courier.position.longitude],
            [courier.active_task.latitude, courier.active_task.longitude],
          ],
          {
            color: isSelected ? '#6366f1' : '#a855f7',
            weight: isSelected ? 4 : 2.5,
            opacity: 0.85,
            dashArray: '6, 8',
          }
        )
        routesLayerRef.current?.addLayer(polyline)
      }
    })
  }, [couriers, tasks, selectedCourierId, onSelectCourier])

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-card border border-slate-200 bg-slate-100 ${className}`}>
      {/* Contenedor Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Botones de Control Flotantes Superiores */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {/* Selector de Capas */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
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

        {/* Botón Centrar Todos */}
        <button
          type="button"
          onClick={handleFitAllBounds}
          className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl shadow-md border border-slate-200/80 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title="Centrar en todos los puntos activos"
        >
          <Maximize2 className="h-4 w-4 text-slate-600" />
          <span className="hidden sm:inline">Centrar Todos</span>
        </button>
      </div>

      {/* Leyenda Flotante Inferior Izquierda */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-md p-2.5 rounded-xl shadow-md border border-slate-200/80 text-2xs font-semibold text-slate-700 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-600"></span>
          <span>En Ruta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          <span>En Gestión</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
          <span>Completada</span>
        </div>
        <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Motorizado en Vivo</span>
        </div>
      </div>
    </div>
  )
}
