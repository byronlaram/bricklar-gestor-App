/**
 * Navigation Helper for Turn-by-Turn GPS Directions
 * Generates direct deep links to Waze, Google Maps, and Apple Maps.
 */

export interface NavigationOptions {
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  mapsUrl?: string | null
}

/**
 * Generates direct navigation URL for Waze
 */
export function getWazeUrl({ latitude, longitude, address, mapsUrl }: NavigationOptions): string {
  if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
    return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
  }
  if (mapsUrl && mapsUrl.includes('@')) {
    const match = mapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (match) {
      return `https://waze.com/ul?ll=${match[1]},${match[2]}&navigate=yes`
    }
  }
  if (address) {
    return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
  }
  return mapsUrl || 'https://waze.com'
}

/**
 * Generates direct navigation URL for Google Maps
 */
export function getGoogleMapsUrl({ latitude, longitude, address, mapsUrl }: NavigationOptions): string {
  if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
  }
  if (mapsUrl) {
    return mapsUrl
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
  }
  return 'https://maps.google.com'
}

/**
 * Generates direct navigation URL for Apple Maps (iOS devices)
 */
export function getAppleMapsUrl({ latitude, longitude, address, mapsUrl }: NavigationOptions): string {
  if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
    return `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`
  }
  if (address) {
    return `http://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`
  }
  return mapsUrl || 'http://maps.apple.com'
}

/**
 * Formats a clean, professional WhatsApp template message for task departure
 */
export function formatDepartureWhatsAppMessage({
  contactName,
  taskCode,
  address,
  requiresCollection,
  collectionAmount,
  collectionCurrency = 'NIO',
  courierName,
  trackingUrl,
}: {
  contactName?: string | null
  taskCode: string
  address?: string | null
  requiresCollection?: boolean
  collectionAmount?: number | null
  collectionCurrency?: string | null
  courierName?: string | null
  trackingUrl?: string | null
}): string {
  const greeting = contactName ? `¡Hola ${contactName.trim()}!` : '¡Hola!'
  const courier = courierName ? courierName.trim() : 'nuestro repartidor'
  const currencySymbol = collectionCurrency === 'USD' ? '$' : 'C$'

  let message = `${greeting} 👋 Le saluda ${courier} de *Bricklar Logística*.\n\n`
  message += `🛵 Tu pedido *#${taskCode}* va en camino a tu dirección${address ? ` (*${address.trim()}*)` : ''}.\n`

  if (requiresCollection && collectionAmount && collectionAmount > 0) {
    message += `💵 *Monto a pagar en efectivo:* ${currencySymbol} ${collectionAmount.toFixed(2)}\n`
  }

  if (trackingUrl) {
    message += `\n📍 *Sigue la ubicación de tu entrega en vivo aquí:*\n${trackingUrl}\n`
  }

  message += `\nCualquier consulta puedes responderme por este medio. ¡Llego en breve! 📦✨`

  return message
}
