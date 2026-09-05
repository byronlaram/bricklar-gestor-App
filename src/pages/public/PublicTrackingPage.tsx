import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin,
  Phone,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowRight,
  DollarSign,
  Share2,
} from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { getPublicTaskTracking } from '@/modules/tasks/services/tasksService'
import type { PublicTaskTrackingData } from '@/modules/tasks/services/tasksService'
import {
  Card,
  Button,
  Badge,
  Skeleton,
} from '@/shared/components/ui'
import { formatDate } from '@/shared/utils/format'

const CHANNEL_NAME = 'courier-tracking'
const DEFAULT_CENTER: [number, number] = [12.1364, -86.2514] // Managua, Nicaragua

export default function PublicTrackingPage() {
  const { taskCodeOrId } = useParams<{ taskCodeOrId: string }>()
  const navigate = useNavigate()
  const [searchCode, setSearchCode] = useState('')
  const [liveCourierPos, setLiveCourierPos] = useState<{
    latitude: number
    longitude: number
    timestamp: string
  } | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const destinationMarkerRef = useRef<L.Marker | null>(null)
  const courierMarkerRef = useRef<L.Marker | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)

  // 1. Query para obtener los datos públicos de la tarea
  const {
    data: task,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<PublicTaskTrackingData | null>({
    queryKey: ['public-task-tracking', taskCodeOrId],
    queryFn: () => getPublicTaskTracking(taskCodeOrId || ''),
    enabled: !!taskCodeOrId,
    refetchInterval: 1000 * 20, // Refresca cada 20 segundos
    staleTime: 1000 * 10,
  })

  // 2. Escuchar ubicación en tiempo real del motorizado asignado via Supabase Broadcast
  useEffect(() => {
    if (!task?.courier?.id) return

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { broadcast: { self: true } },
    })

    channel
      .on('broadcast', { event: 'location_update' }, (payload) => {
        const data = payload.payload
        if (data && data.courier_id === task.courier?.id) {
          setLiveCourierPos({
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: data.timestamp || new Date().toISOString(),
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [task?.courier?.id])

  // 3. Inicializar y actualizar Mapa Leaflet
  const initMap = useCallback(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(DEFAULT_CENTER, 14)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map)

    mapInstanceRef.current = map
  }, [])

  useEffect(() => {
    initMap()
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [initMap])

  // Actualizar marcadores en el mapa
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !task) return

    const destLat = task.latitude
    const destLng = task.longitude
    const hasDest = typeof destLat === 'number' && typeof destLng === 'number' && !isNaN(destLat) && !isNaN(destLng)

    const courierLat = liveCourierPos?.latitude
    const courierLng = liveCourierPos?.longitude
    const hasCourier = typeof courierLat === 'number' && typeof courierLng === 'number' && !isNaN(courierLat) && !isNaN(courierLng)

    const bounds: [number, number][] = []

    // Marcador de Destino (Cliente)
    if (hasDest) {
      const destCoords: [number, number] = [destLat!, destLng!]
      bounds.push(destCoords)

      const destIcon = L.divIcon({
        className: 'custom-destination-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.4); border: 2.5px solid white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })

      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setLatLng(destCoords)
      } else {
        destinationMarkerRef.current = L.marker(destCoords, { icon: destIcon })
          .addTo(map)
          .bindPopup(`<strong>Destino de Entrega</strong><br/>${task.address || 'Ubicación de entrega'}`)
      }
    }

    // Marcador del Motorizado (Repartidor)
    if (hasCourier && ['en_route', 'in_progress'].includes(task.status)) {
      const courierCoords: [number, number] = [courierLat!, courierLng!]
      bounds.push(courierCoords)

      const courierIcon = L.divIcon({
        className: 'custom-courier-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background: rgba(16,185,129,0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #059669; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(5,150,105,0.5); border: 2.5px solid white; z-index: 10;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      })

      if (courierMarkerRef.current) {
        courierMarkerRef.current.setLatLng(courierCoords)
      } else {
        courierMarkerRef.current = L.marker(courierCoords, { icon: courierIcon })
          .addTo(map)
          .bindPopup(`<strong>${task.courier?.full_name || 'Motorizado en ruta'}</strong><br/>En camino`)
      }

      // Línea punteada de ruta
      if (hasDest) {
        const lineCoords = [courierCoords, [destLat!, destLng!] as [number, number]]
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs(lineCoords)
        } else {
          routeLineRef.current = L.polyline(lineCoords, {
            color: '#10b981',
            weight: 3.5,
            dashArray: '6, 8',
            opacity: 0.8,
          }).addTo(map)
        }
      }
    } else if (courierMarkerRef.current) {
      map.removeLayer(courierMarkerRef.current)
      courierMarkerRef.current = null
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current)
        routeLineRef.current = null
      }
    }

    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 15)
      } else {
        map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 16 })
      }
    }
  }, [task, liveCourierPos])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchCode.trim()) return
    navigate(`/rastreo/${searchCode.trim().toUpperCase()}`)
  }

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2500)
    } catch {
      // ignore
    }
  }

  // Estado y descripción amigable del pedido
  const statusMeta = useMemo(() => {
    if (!task) return null

    switch (task.status) {
      case 'en_route':
        return {
          title: 'Tu pedido está en camino',
          subtitle: 'El motorizado se dirige a tu dirección de entrega.',
          badge: 'En Camino',
          badgeVariant: 'en_route' as const,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          step: 2,
        }
      case 'in_progress':
        return {
          title: 'Motorizado en tu zona',
          subtitle: 'El repartidor ha llegado al punto de entrega y está gestionando la entrega.',
          badge: 'En Gestión',
          badgeVariant: 'en_route' as const,
          color: 'text-blue-700 bg-blue-50 border-blue-200',
          step: 3,
        }
      case 'completed':
        return {
          title: '¡Entrega Completada con Éxito!',
          subtitle: `Entregado el ${formatDate(task.completed_at || task.scheduled_date)}.`,
          badge: 'Entregado',
          badgeVariant: 'completed' as const,
          color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
          step: 4,
        }
      case 'assigned':
        return {
          title: 'Pedido asignado a motorizado',
          subtitle: 'Tu paquete está listo en sucursal y próximo a salir a ruta.',
          badge: 'Preparado',
          badgeVariant: 'assigned' as const,
          color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          step: 1,
        }
      case 'pending':
        return {
          title: 'Pedido recibido en sucursal',
          subtitle: 'Tu orden está siendo programada para despacho.',
          badge: 'Pendiente',
          badgeVariant: 'pending' as const,
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          step: 0,
        }
      case 'not_completed':
        return {
          title: 'Incidencia en la entrega',
          subtitle: 'No fue posible completar la entrega. Será reprogramada en breve.',
          badge: 'No Completado',
          badgeVariant: 'urgent' as const,
          color: 'text-rose-700 bg-rose-50 border-rose-200',
          step: 2,
        }
      case 'cancelled':
        return {
          title: 'Orden cancelada',
          subtitle: 'Este pedido fue cancelado por el remitente o administración.',
          badge: 'Cancelado',
          badgeVariant: 'neutral' as const,
          color: 'text-slate-700 bg-slate-100 border-slate-300',
          step: 0,
        }
      default:
        return {
          title: 'Estado del Pedido',
          subtitle: 'En proceso logístico',
          badge: task.status,
          badgeVariant: 'neutral' as const,
          color: 'text-slate-700 bg-slate-50 border-slate-200',
          step: 1,
        }
    }
  }, [task])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header Corporativo Público */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white flex items-center justify-center font-black text-base shadow-xs">
              B
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 tracking-tight leading-none">
                Bricklar Gestor
              </div>
              <div className="text-2xs text-slate-500 font-semibold tracking-wider uppercase">
                Rastreo en Tiempo Real
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {task && (
              <button
                type="button"
                onClick={handleShareLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isCopied ? 'Enlace Copiado' : 'Compartir'}</span>
              </button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
              className="text-xs font-bold"
            >
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* BUSCADOR MANUAL SI NO HAY TAREA O NO SE ENCUENTRA */}
        {!taskCodeOrId && (
          <Card className="p-6 sm:p-8 text-center space-y-5 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto border border-indigo-100">
              <Search className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Rastrea tu Paquete o Entrega
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Ingresa el código de guía o referencia proporcionado por Bricklar Logística para ver la ubicación de tu motorizado en vivo.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto flex gap-2">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Ejemplo: TRK-0024"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
              />
              <Button type="submit" variant="primary" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Rastrear
              </Button>
            </form>
          </Card>
        )}

        {/* ESTADO DE CARGA */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-48 rounded-3xl" />
          </div>
        )}

        {/* ERROR / NO ENCONTRADO */}
        {taskCodeOrId && !isLoading && (!task || isError) && (
          <Card className="p-8 text-center space-y-4 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                No encontramos la orden "{taskCodeOrId}"
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                Verifica que el código de entrega esté escrito correctamente o contacta a soporte.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto flex gap-2 pt-2">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Buscar otro código..."
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none font-mono uppercase"
              />
              <Button type="submit" variant="primary" size="sm">
                Buscar
              </Button>
            </form>
          </Card>
        )}

        {/* DETALLE Y MAPA EN VIVO DEL PEDIDO */}
        {task && statusMeta && (
          <div className="space-y-6 animate-fade-in">
            {/* Banner Hero de Estado */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg space-y-4 border border-indigo-700/50">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-700/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-500/40 text-indigo-200">
                    #{task.code}
                  </span>
                  <Badge variant={statusMeta.badgeVariant} size="sm">
                    {statusMeta.badge}
                  </Badge>
                </div>
                <span className="text-2xs text-indigo-200 font-medium">
                  Fecha: {formatDate(task.scheduled_date)}
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {statusMeta.title}
                </h1>
                <p className="text-xs sm:text-sm text-indigo-200 font-medium leading-relaxed">
                  {statusMeta.subtitle}
                </p>
              </div>

              {/* Barra de Progreso Step by Step */}
              <div className="pt-2">
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    { label: 'Recibido', step: 1 },
                    { label: 'Asignado', step: 2 },
                    { label: 'En Ruta', step: 3 },
                    { label: 'Entregado', step: 4 },
                  ].map((s) => {
                    const isDone = statusMeta.step >= s.step
                    const isCurrent = statusMeta.step === s.step

                    return (
                      <div key={s.step} className="space-y-1.5">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isDone
                              ? 'bg-emerald-400 shadow-xs'
                              : 'bg-white/20'
                          } ${isCurrent ? 'animate-pulse' : ''}`}
                        />
                        <span
                          className={`text-3xs sm:text-2xs uppercase tracking-wider font-extrabold block ${
                            isDone ? 'text-teal-200' : 'text-indigo-300/60'
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* MAPA INTERACTIVO EN VIVO */}
            <Card className="overflow-hidden border border-slate-200 rounded-3xl shadow-sm bg-white">
              <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Mapa en Vivo & Ubicación de Entrega
                  </span>
                </div>
                {['en_route', 'in_progress'].includes(task.status) && (
                  <span className="text-2xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                    GPS Activo
                  </span>
                )}
              </div>

              <div
                ref={mapContainerRef}
                className="w-full h-72 sm:h-96 z-10 bg-slate-100"
                style={{ minHeight: '280px' }}
              />
            </Card>

            {/* SECCIÓN REPARTIDOR Y DETALLES DE LA ENTREGA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta del Repartidor Asignado */}
              <Card className="p-5 space-y-4 bg-white border border-slate-200 rounded-3xl shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Repartidor Asignado
                  </span>
                  <Badge variant="assigned" size="sm">
                    Bricklar Courier
                  </Badge>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center shrink-0 border border-indigo-200 text-base">
                    {task.courier?.avatar_url ? (
                      <img
                        src={task.courier.avatar_url}
                        alt={task.courier.full_name}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      (task.courier?.full_name || 'MO').substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {task.courier?.full_name || 'Motorizado en ruta'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Repartidor Oficial Bricklar</p>
                  </div>
                </div>

                {/* Botones de Contacto Directo */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {task.courier?.phone ? (
                    <a
                      href={`tel:${task.courier.phone}`}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition"
                    >
                      <Phone className="h-4 w-4" />
                      Llamar
                    </a>
                  ) : (
                    <div className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-medium">
                      Sin teléfono
                    </div>
                  )}

                  {task.courier?.phone ? (
                    <a
                      href={`https://wa.me/${task.courier.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hola, tengo una consulta sobre mi entrega #${task.code}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  ) : (
                    <div className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-medium">
                      Sin WhatsApp
                    </div>
                  )}
                </div>
              </Card>

              {/* Tarjeta de Información de Entrega */}
              <Card className="p-5 space-y-4 bg-white border border-slate-200 rounded-3xl shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Detalles de la Entrega
                  </span>
                  <span className="text-2xs font-mono font-bold text-slate-500">
                    {task.title}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-500 block text-2xs uppercase">Dirección de Destino:</span>
                      <span className="font-medium text-slate-900 leading-snug">{task.address || 'Dirección registrada en guía'}</span>
                    </div>
                  </div>

                  {task.contact_name && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-slate-500 font-semibold">Destinatario:</span>
                      <span className="font-bold text-slate-900">{task.contact_name}</span>
                    </div>
                  )}

                  {task.requires_collection && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                        Cobro a Pagar en Efectivo:
                      </span>
                      <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        {task.expected_collection_currency === 'USD' ? '$' : 'C$'}{' '}
                        {(task.expected_collection_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {task.status === 'completed' && task.proof_signature_url && (
                    <div className="border-t border-slate-100 pt-2">
                      <span className="text-2xs font-bold text-slate-500 uppercase block mb-1">
                        Firma de Recepción (POD):
                      </span>
                      <img
                        src={task.proof_signature_url}
                        alt="Firma de Entrega"
                        className="h-16 rounded-xl border border-slate-200 bg-slate-50 p-1 object-contain"
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Footer Público */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-4xl mx-auto px-4">
          Bricklar GestorApp &copy; {new Date().getFullYear()} &bull; Logística y Control de Entregas
        </div>
      </footer>
    </div>
  )
}
