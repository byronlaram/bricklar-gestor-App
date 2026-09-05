import { supabase } from '@/shared/lib/supabaseClient'
import { compressImage } from '@/shared/utils/imageCompressor'

export interface CompanySettings {
  name: string
  legal_name: string
  tax_id: string
  slogan: string
  description: string
  email: string
  phone: string
  whatsapp: string
  address: string
  website: string
  logo_url: string
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'Bricklar Gestor',
  legal_name: 'Distribuidora Bricklar S.A.',
  tax_id: 'J0310000194829',
  slogan: 'Logística y Mensajería Empresarial Inteligente',
  description: 'Gestión eficiente de tareas, envíos y cobros en tiempo real.',
  email: 'contacto@bricklar.com',
  phone: '+505 2222-0000',
  whatsapp: '+505 8888-0000',
  address: 'Managua, Nicaragua - Pista Jean Paul Genie',
  website: 'https://bricklar.com',
  logo_url: '',
}

const SETTINGS_KEY = 'company_profile_settings'

export async function getCompanySettings(): Promise<CompanySettings> {
  // 1. Intentar cargar desde Supabase app_settings
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (!error && data?.value_json) {
      const parsed = data.value_json as Partial<CompanySettings>
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          ...DEFAULT_COMPANY_SETTINGS,
          ...parsed,
        }
      }
    }
  } catch (err) {
    console.warn('[CompanySettings] Error fetching settings from DB:', err)
  }

  // 2. Fallback a localStorage
  try {
    const local = localStorage.getItem(SETTINGS_KEY)
    if (local) {
      const parsed = JSON.parse(local) as Partial<CompanySettings>
      return {
        ...DEFAULT_COMPANY_SETTINGS,
        ...parsed,
      }
    }
  } catch (err) {
    console.warn('[CompanySettings] Error reading from localStorage:', err)
  }

  return DEFAULT_COMPANY_SETTINGS
}

export async function saveCompanySettings(
  settings: CompanySettings,
  userId?: string
): Promise<void> {
  // 1. Guardar en localStorage
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('[CompanySettings] Error saving to localStorage:', err)
  }

  // 2. Guardar en Supabase app_settings
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
          updated_at: new Date().toISOString(),
          updated_by: userId || null,
        })
        .eq('id', existing.id)

      if (error) {
        console.error('[CompanySettings] Error updating Supabase:', error)
        throw new Error(error.message)
      }
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({
          key: SETTINGS_KEY,
          value_json: settings as any,
          description: 'Configuración de marca e información de la empresa',
          updated_at: new Date().toISOString(),
          updated_by: userId || null,
        })

      if (error) {
        console.error('[CompanySettings] Error inserting into Supabase:', error)
        throw new Error(error.message)
      }
    }
  } catch (err: any) {
    console.error('[CompanySettings] Failed to save in DB:', err)
    throw err
  }
}

export async function uploadCompanyLogo(file: File): Promise<string> {
  if (!file) throw new Error('No se ha seleccionado ningún archivo.')

  // Optimizar tamaño del logo (máx 800x800)
  const optimized = await compressImage(file, 800, 800, 0.9)
  const rawExt = (optimized.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
  const fileExt = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(rawExt) ? rawExt : 'png'
  const fileName = `company_logo_${Date.now()}.${fileExt}`
  const filePath = `brand/${fileName}`

  // Intentar subir a bucket 'task-evidences' (o brand)
  const { error: uploadError } = await supabase.storage
    .from('task-evidences')
    .upload(filePath, optimized, { cacheControl: '86400', upsert: true })

  if (uploadError) {
    console.warn('[CompanySettings] Storage upload warning (fallback to DataURL):', uploadError.message)
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(optimized)
    })
  }

  const { data: urlData } = supabase.storage.from('task-evidences').getPublicUrl(filePath)
  return urlData.publicUrl
}
