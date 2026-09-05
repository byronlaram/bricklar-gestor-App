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
