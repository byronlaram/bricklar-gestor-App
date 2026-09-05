import { supabase } from '@/shared/lib/supabaseClient'

export interface WhatsAppTemplatesSettings {
  departure_enabled: boolean
  departure_template: string
  completion_enabled: boolean
  completion_template: string
}

export const DEFAULT_DEPARTURE_TEMPLATE = `¡Hola {cliente}! 👋 Le saluda {repartidor} de *Bricklar Logística*.

🛵 Tu pedido *#{pedido}* va en camino a tu dirección (*{direccion}*).
{monto_seccion}
📍 *Sigue la ubicación de tu entrega en tiempo real aquí:*
{link_rastreo}

Cualquier consulta puedes responderme por este medio. ¡Llego en breve! 📦✨`

export const DEFAULT_COMPLETION_TEMPLATE = `¡Hola {cliente}! 👋 Le saluda *Bricklar Logística*.

✅ Tu entrega del pedido *#{pedido}* ha sido completada con éxito.
📍 Dirección: {direccion}

¡Muchas gracias por su preferencia! Que tenga un excelente día. 🌟📦`

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppTemplatesSettings = {
  departure_enabled: true,
  departure_template: DEFAULT_DEPARTURE_TEMPLATE,
  completion_enabled: true,
  completion_template: DEFAULT_COMPLETION_TEMPLATE,
}

const SETTINGS_KEY = 'whatsapp_templates_settings'

export async function getWhatsAppTemplatesSettings(): Promise<WhatsAppTemplatesSettings> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (!error && data?.value_json) {
      const parsed = data.value_json as unknown as Partial<WhatsAppTemplatesSettings>
      return {
        departure_enabled: parsed.departure_enabled ?? DEFAULT_WHATSAPP_SETTINGS.departure_enabled,
        departure_template: parsed.departure_template || DEFAULT_DEPARTURE_TEMPLATE,
        completion_enabled: parsed.completion_enabled ?? DEFAULT_WHATSAPP_SETTINGS.completion_enabled,
        completion_template: parsed.completion_template || DEFAULT_COMPLETION_TEMPLATE,
      }
    }
  } catch (err) {
    console.warn('[Settings] Error fetching whatsapp settings from DB:', err)
  }

  // Fallback local storage
  try {
    const local = localStorage.getItem(SETTINGS_KEY)
    if (local) {
      const parsed = JSON.parse(local)
      return {
        departure_enabled: parsed.departure_enabled ?? DEFAULT_WHATSAPP_SETTINGS.departure_enabled,
        departure_template: parsed.departure_template || DEFAULT_DEPARTURE_TEMPLATE,
        completion_enabled: parsed.completion_enabled ?? DEFAULT_WHATSAPP_SETTINGS.completion_enabled,
        completion_template: parsed.completion_template || DEFAULT_COMPLETION_TEMPLATE,
      }
    }
  } catch (err) {
    console.warn('[Settings] Error reading whatsapp settings from localStorage:', err)
  }

  return DEFAULT_WHATSAPP_SETTINGS
}

export async function saveWhatsAppTemplatesSettings(
  settings: WhatsAppTemplatesSettings,
  userId?: string
): Promise<void> {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('[Settings] Error saving whatsapp settings to localStorage:', err)
  }

  try {
    const { error } = await supabase.from('app_settings').upsert({
      key: SETTINGS_KEY,
      value_json: settings as any,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.warn('[Settings] DB error saving whatsapp settings:', error)
    }
  } catch (err) {
    console.warn('[Settings] Error saving whatsapp settings to DB:', err)
  }
}

/**
 * Renders a template replacing dynamic placeholder tags
 */
export function renderWhatsAppTemplate(
  template: string,
  variables: {
    cliente?: string | null
    pedido: string
    direccion?: string | null
    monto?: number | null
    moneda?: string | null
    repartidor?: string | null
    link_rastreo?: string | null
    empresa?: string | null
  }
): string {
  let result = template

  const clientName = (variables.cliente || '').trim() || 'Estimado(a) Cliente'
  const courierName = (variables.repartidor || '').trim() || 'nuestro repartidor'
  const address = (variables.direccion || '').trim() || 'Dirección registrada'
  const currencySymbol = variables.moneda === 'USD' ? '$' : 'C$'
  const amountStr = variables.monto && variables.monto > 0 ? `${currencySymbol} ${variables.monto.toFixed(2)}` : ''

  const montoSeccion =
    amountStr ? `💵 *Monto a pagar en efectivo:* ${amountStr}` : ''

  result = result.replace(/\{cliente\}/gi, clientName)
  result = result.replace(/\{pedido\}/gi, variables.pedido)
  result = result.replace(/\{direccion\}/gi, address)
  result = result.replace(/\{monto\}/gi, amountStr)
  result = result.replace(/\{monto_seccion\}/gi, montoSeccion)
  result = result.replace(/\{repartidor\}/gi, courierName)
  result = result.replace(/\{link_rastreo\}/gi, variables.link_rastreo || '')
  result = result.replace(/\{empresa\}/gi, variables.empresa || 'Bricklar Logística')

  // Limpiar líneas vacías duplicadas si monto_seccion estaba vacío
  result = result.replace(/\n{3,}/g, '\n\n').trim()

  return result
}
