/**
 * Utilidades de fecha libres de desfase de zona horaria (UTC vs Local).
 * En Nicaragua/Centroamérica (UTC-6), `new Date().toISOString()` salta al día siguiente
 * a partir de las 6:00 PM. Estas funciones garantizan la fecha local exacta.
 */

/**
 * Retorna la fecha local en formato YYYY-MM-DD.
 */
export function getLocalDateString(d: Date | string = new Date()): string {
  const dateObj = typeof d === 'string' ? parseDateString(d) : d
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parsea un string YYYY-MM-DD de forma segura como fecha local (sin desfase UTC).
 */
export function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date()
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return new Date(dateStr)
  return new Date(year, month - 1, day, 12, 0, 0)
}

/**
 * Retorna la fecha de mañana en formato YYYY-MM-DD.
 */
export function getLocalTomorrowString(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return getLocalDateString(d)
}

/**
 * Retorna la fecha de ayer en formato YYYY-MM-DD.
 */
export function getLocalYesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getLocalDateString(d)
}

/**
 * Retorna el inicio de la semana actual (Lunes) en formato YYYY-MM-DD.
 */
export function getStartOfWeekString(d: Date = new Date()): string {
  const date = new Date(d)
  const day = date.getDay() // 0 = Domingo, 1 = Lunes...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Ajuste a Lunes
  date.setDate(diff)
  return getLocalDateString(date)
}

/**
 * Retorna el fin de la semana actual (Domingo) en formato YYYY-MM-DD.
 */
export function getEndOfWeekString(d: Date = new Date()): string {
  const start = parseDateString(getStartOfWeekString(d))
  start.setDate(start.getDate() + 6)
  return getLocalDateString(start)
}
