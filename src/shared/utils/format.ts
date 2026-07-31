import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import type { Currency } from '../types'

const DEFAULT_TZ = import.meta.env.VITE_DEFAULT_TIMEZONE ?? 'America/Managua'

// ─── Fechas ────────────────────────────────────────────────────────────────────

/** Formatea una fecha en la zona horaria de Managua */
export function formatDate(
  date: Date | string | null | undefined,
  fmt = 'dd/MM/yyyy'
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return formatInTimeZone(d, DEFAULT_TZ, fmt, { locale: es })
}

/** Formatea fecha y hora en la zona horaria de Managua */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy HH:mm")
}

/** Formatea solo la hora en la zona horaria de Managua */
export function formatTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'HH:mm')
}

/** Retorna la fecha actual en Managua como string YYYY-MM-DD */
export function todayManagua(): string {
  return formatInTimeZone(new Date(), DEFAULT_TZ, 'yyyy-MM-dd')
}

// ─── Moneda ────────────────────────────────────────────────────────────────────

const NIO_FORMATTER = new Intl.NumberFormat('es-NI', {
  style: 'currency',
  currency: 'NIO',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formatea un monto según su moneda.
 * Usa Intl.NumberFormat para separadores regionales correctos.
 * Acepta string o number — internamente convierte a number.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: Currency
): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return currency === 'NIO'
    ? NIO_FORMATTER.format(num)
    : USD_FORMATTER.format(num)
}

/** Prefijo de moneda sin el monto (C$ o US$) */
export function currencySymbol(currency: Currency): string {
  return currency === 'NIO' ? 'C$' : 'US$'
}

/**
 * Parsea un string de monto a number de forma segura.
 * Maneja tanto comas como puntos como separador decimal según el locale.
 * Lanza error si el resultado no es un número válido.
 */
export function parseAmount(raw: string): number {
  // Remover separadores de miles y normalizar separador decimal
  const normalized = raw.replace(/[,]/g, '').trim()
  const num = parseFloat(normalized)
  if (isNaN(num)) throw new Error(`Monto inválido: "${raw}"`)
  return num
}

/** Calcula el equivalente en NIO usando el tipo de cambio */
export function toNIO(amount: number, currency: Currency, exchangeRate: number): number {
  if (currency === 'NIO') return amount
  return parseFloat((amount * exchangeRate).toFixed(2))
}

// ─── Números ───────────────────────────────────────────────────────────────────

/** Formatea un número con separadores de miles */
export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('es-NI', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// ─── Teléfonos ─────────────────────────────────────────────────────────────────

/** Construye un link de WhatsApp para Nicaragua (prefijo 505) */
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const withCountry = digits.startsWith('505') ? digits : `505${digits}`
  return `https://wa.me/${withCountry}`
}

/** Construye un link de llamada tel: */
export function telUrl(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`
}

// ─── Mapas ─────────────────────────────────────────────────────────────────────

/** Construye un link de Waze a partir de coordenadas */
export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
}

/** Construye un link de Google Maps a partir de coordenadas */
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`
}

/** Valida si una URL es de Google Maps o Waze */
export function isValidMapUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname.includes('google.com') ||
      parsed.hostname.includes('maps.app.goo.gl') ||
      parsed.hostname.includes('waze.com') ||
      parsed.hostname.includes('goo.gl')
    )
  } catch {
    return false
  }
}
