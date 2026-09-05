import { supabase } from '@/shared/lib/supabaseClient'
import type { TaskType } from '@/shared/types'
import { TASK_TYPE_CONFIGS, type TaskTypeConfig } from '../config/taskTypeConfig'

export type TaskNature = 'income' | 'expense' | 'neutral'

export interface CustomTaskTypeConfig extends TaskTypeConfig {
  nature: TaskNature
  enabled: boolean
  badgeColor?: string
}

export const DEFAULT_TASK_NATURE_MAP: Record<TaskType, TaskNature> = {
  delivery: 'income',
  purchase: 'expense',
  fuel: 'expense',
  bank_deposit: 'expense',
  credit_payment: 'expense',
  service_payment: 'expense',
  bus_shipment: 'expense',
  logistics_shipment: 'neutral',
  other_errand: 'neutral',
}

export function buildDefaultCustomConfigs(): Record<TaskType, CustomTaskTypeConfig> {
  const result = {} as Record<TaskType, CustomTaskTypeConfig>
  for (const [key, baseConfig] of Object.entries(TASK_TYPE_CONFIGS)) {
    const typeKey = key as TaskType
    const nature = DEFAULT_TASK_NATURE_MAP[typeKey] || 'neutral'
    result[typeKey] = {
      ...baseConfig,
      nature,
      enabled: true,
    }
  }
  return result
}

const SETTINGS_KEY = 'task_types_custom_configs'

export async function getTaskTypesSettings(): Promise<Record<TaskType, CustomTaskTypeConfig>> {
  const defaults = buildDefaultCustomConfigs()

  // 1. Intentar cargar desde base de datos (app_settings)
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (!error && data?.value_json) {
      const parsed = data.value_json as Record<string, Partial<CustomTaskTypeConfig>>
      if (typeof parsed === 'object' && parsed !== null) {
        const merged: Record<TaskType, CustomTaskTypeConfig> = { ...defaults }
        for (const [typeKey, customVal] of Object.entries(parsed)) {
          if (customVal && typeof customVal === 'object') {
            if (merged[typeKey as TaskType]) {
              merged[typeKey as TaskType] = {
                ...merged[typeKey as TaskType],
                ...customVal,
              }
            } else {
              // Nueva gestión personalizada creada por el usuario
              merged[typeKey as TaskType] = {
                type: typeKey as TaskType,
                label: customVal.label || typeKey,
                suggestedTitle: customVal.suggestedTitle || customVal.label || typeKey,
                nature: customVal.nature || 'neutral',
                enabled: customVal.enabled !== false,
                entityType: customVal.entityType || 'custom',
                defaultRequiresCollection: customVal.defaultRequiresCollection || false,
                defaultRequiresPayment: customVal.defaultRequiresPayment || false,
                defaultPaymentMethod: customVal.defaultPaymentMethod,
                descriptionPlaceholder: customVal.descriptionPlaceholder || 'Detalles de la gestión...',
                addressLabel: customVal.addressLabel || 'Dirección / Destino',
                addressPlaceholder: customVal.addressPlaceholder || 'Ej: Altamira...',
                contactNameLabel: customVal.contactNameLabel || 'Contacto / Titular',
                contactNamePlaceholder: customVal.contactNamePlaceholder || 'Ej: Juan Pérez',
                referenceNumberLabel: customVal.referenceNumberLabel || 'N° de Referencia',
                referenceNumberPlaceholder: customVal.referenceNumberPlaceholder || 'Ej: REF-001',
                fastModeFields: customVal.fastModeFields || ['contact_name', 'address', 'phone', 'financial'],
                ...customVal,
              } as CustomTaskTypeConfig
            }
          }
        }
        return merged
      }
    }
  } catch (err) {
    console.warn('[TaskTypesSettings] Error fetching settings from DB:', err)
  }

  // 2. Fallback a localStorage
  try {
    const local = localStorage.getItem(SETTINGS_KEY)
    if (local) {
      const parsed = JSON.parse(local) as Record<string, Partial<CustomTaskTypeConfig>>
      const merged: Record<TaskType, CustomTaskTypeConfig> = { ...defaults }
      for (const [typeKey, customVal] of Object.entries(parsed)) {
        if (customVal && typeof customVal === 'object') {
          if (merged[typeKey as TaskType]) {
            merged[typeKey as TaskType] = {
              ...merged[typeKey as TaskType],
              ...customVal,
            }
          } else {
            // Nueva gestión personalizada creada
            merged[typeKey as TaskType] = {
              type: typeKey as TaskType,
              label: customVal.label || typeKey,
              suggestedTitle: customVal.suggestedTitle || customVal.label || typeKey,
              nature: customVal.nature || 'neutral',
              enabled: customVal.enabled !== false,
              entityType: customVal.entityType || 'custom',
              defaultRequiresCollection: customVal.defaultRequiresCollection || false,
              defaultRequiresPayment: customVal.defaultRequiresPayment || false,
              defaultPaymentMethod: customVal.defaultPaymentMethod,
              ...customVal,
            } as CustomTaskTypeConfig
          }
        }
      }
      return merged
    }
  } catch (err) {
    console.warn('[TaskTypesSettings] Error reading from localStorage:', err)
  }

  return defaults
}

export async function saveTaskTypesSettings(
  settings: Record<TaskType, CustomTaskTypeConfig>,
  userId?: string
): Promise<void> {
  // 1. Guardar en localStorage para disponibilidad inmediata
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('[TaskTypesSettings] Error saving to localStorage:', err)
  }

  // 2. Guardar en DB Supabase (app_settings)
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
        console.error('[TaskTypesSettings] Error updating Supabase:', error)
        throw new Error(error.message)
      }
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({
          key: SETTINGS_KEY,
          value_json: settings as any,
          description: 'Configuraciones personalizadas de tipos de tareas',
          updated_at: new Date().toISOString(),
          updated_by: userId || null,
        })

      if (error) {
        console.error('[TaskTypesSettings] Error inserting into Supabase:', error)
        throw new Error(error.message)
      }
    }
  } catch (err: any) {
    console.error('[TaskTypesSettings] Failed to save in DB:', err)
    throw err
  }
}
