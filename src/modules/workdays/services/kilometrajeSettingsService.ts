import { supabase } from '@/shared/lib/supabaseClient'

export interface KilometrajeSettings {
  enabled: boolean
  allow_not_available: boolean
}

export const DEFAULT_KILOMETRAJE_SETTINGS: KilometrajeSettings = {
  enabled: true,
  allow_not_available: true,
}

const SETTINGS_KEY = 'odometer_settings'

export async function getKilometrajeSettings(): Promise<KilometrajeSettings> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (!error && data?.value_json) {
      const parsed = data.value_json as unknown as KilometrajeSettings
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof parsed.enabled === 'boolean' &&
        typeof parsed.allow_not_available === 'boolean'
      ) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('[Settings] Error fetching odometer settings from DB:', err)
  }

  // Fallback a localStorage
  try {
    const local = localStorage.getItem(SETTINGS_KEY)
    if (local) {
      return JSON.parse(local) as KilometrajeSettings
    }
  } catch (err) {
    console.warn('[Settings] Error reading odometer settings from localStorage:', err)
  }

  return DEFAULT_KILOMETRAJE_SETTINGS
}

export async function saveKilometrajeSettings(
  settings: KilometrajeSettings,
  userId?: string
): Promise<void> {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('[Settings] Error saving odometer settings to localStorage:', err)
  }

  try {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('app_settings')
        .update({
          value_json: settings as any,
          updated_by: userId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({
          key: SETTINGS_KEY,
          value_json: settings as any,
          description: 'Configuración general del control de kilometraje en inicio de jornada',
          updated_by: userId || null,
        })

      if (error) throw error
    }
  } catch (err) {
    console.error('[Settings] Error saving odometer settings to DB:', err)
    throw err
  }
}
