/**
 * Helper de Geolocalización y Geocercas Antifraude
 */

export interface GeoCoordinates {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface DeliveryGeoVerification {
  verified: boolean
  is_within_geofence: boolean
  distance_meters: number | null
  courier_lat: number | null
  courier_lng: number | null
  courier_accuracy: number | null
  destination_lat: number | null
  destination_lng: number | null
  captured_at: string
}

/**
 * Radio de geocerca estándar en metros para considerar una entrega válida en sitio (150 metros)
 */
export const STANDARD_GEOFENCE_RADIUS_METERS = 150

/**
 * Calcula la distancia ortodrómica en metros entre dos coordenadas geográficas usando la fórmula de Haversine
 */
export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Radio medio de la Tierra en metros
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c)
}

/**
 * Formatea una distancia en metros a un texto legible (ej: "45 m" o "1.4 km")
 */
export function formatGeoDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) return 'Distancia no disponible'
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

export const formatDistance = formatGeoDistance

/**
 * Obtiene la posición GPS actual del dispositivo de forma asíncrona mediante Promise
 */
export async function getDeviceCurrentPosition(
  timeoutMs: number = 7000
): Promise<GeoCoordinates | null> {
  if (!navigator.geolocation) {
    return null
  }

  return new Promise((resolve) => {
    let resolved = false

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(null)
      }
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          })
        }
      },
      (error) => {
        console.warn('[GeoHelper] Could not retrieve GPS location:', error.message)
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          resolve(null)
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 15000,
      }
    )
  })
}

/**
 * Evalúa y construye el objeto de verificación de geocerca para una tarea al momento de finalizar
 */
export function buildDeliveryVerification(
  courierCoords: GeoCoordinates | null,
  destinationCoords: { latitude?: number | null; longitude?: number | null } | null,
  geofenceRadius: number = STANDARD_GEOFENCE_RADIUS_METERS
): DeliveryGeoVerification {
  const now = new Date().toISOString()

  if (
    !courierCoords ||
    !destinationCoords ||
    typeof destinationCoords.latitude !== 'number' ||
    typeof destinationCoords.longitude !== 'number'
  ) {
    return {
      verified: !!courierCoords,
      is_within_geofence: false,
      distance_meters: null,
      courier_lat: courierCoords?.latitude ?? null,
      courier_lng: courierCoords?.longitude ?? null,
      courier_accuracy: courierCoords?.accuracy ?? null,
      destination_lat: destinationCoords?.latitude ?? null,
      destination_lng: destinationCoords?.longitude ?? null,
      captured_at: now,
    }
  }

  const distance = getDistanceInMeters(
    courierCoords.latitude,
    courierCoords.longitude,
    destinationCoords.latitude,
    destinationCoords.longitude
  )

  const isWithin = distance <= geofenceRadius

  return {
    verified: true,
    is_within_geofence: isWithin,
    distance_meters: distance,
    courier_lat: courierCoords.latitude,
    courier_lng: courierCoords.longitude,
    courier_accuracy: courierCoords.accuracy ?? null,
    destination_lat: destinationCoords.latitude,
    destination_lng: destinationCoords.longitude,
    captured_at: now,
  }
}

/**
 * Parsea automáticamente latitud y longitud desde enlaces de Google Maps, Waze o coordenadas directas
 */
export function parseCoordinatesFromMapsUrl(
  input: string | null | undefined
): { latitude: number; longitude: number } | null {
  if (!input || typeof input !== 'string') return null
  let text = input.trim()

  try {
    text = decodeURIComponent(text)
  } catch {
    // Ignorar error de decodificación
  }

  // 1. Google Maps data pattern: !3d12.136453!4d-86.251423
  const dataMatch = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/i)
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1])
    const lng = parseFloat(dataMatch[2])
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng }
    }
  }

  // 2. Directo "lat, lng" ej: "12.1364, -86.2514" o "12.1364,-86.2514"
  const directMatch = text.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/)
  if (directMatch) {
    const lat = parseFloat(directMatch[1])
    const lng = parseFloat(directMatch[3])
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng }
    }
  }

  // 3. URL con /@lat,lng o ?q=lat,lng o &q=lat,lng o query=lat,lng o /place/lat,lng o ll=lat,lng o destination=lat,lng o daddr=lat,lng o search/lat,lng o dir//lat,lng
  const urlCoordMatch = text.match(/(?:@|q=|query=|ll=|loc:|place\/|destination=|daddr=|search\/|dir\/+)(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i)
  if (urlCoordMatch) {
    const lat = parseFloat(urlCoordMatch[1])
    const lng = parseFloat(urlCoordMatch[2])
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng }
    }
  }

  // 4. Patrón decimal en cualquier parte del texto
  const anyCoordMatch = text.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/)
  if (anyCoordMatch) {
    const lat = parseFloat(anyCoordMatch[1])
    const lng = parseFloat(anyCoordMatch[2])
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng }
    }
  }

  return null
}

