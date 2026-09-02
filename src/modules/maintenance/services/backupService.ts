import { supabase } from '@/shared/lib/supabaseClient'

export interface BackupMetadata {
  version: string
  created_at: string
  created_by?: string
  app_name: string
  tables_summary: Record<string, number>
}

export interface BackupData {
  metadata: BackupMetadata
  data: {
    branches: any[]
    profiles: any[]
    bus_routes: any[]
    tasks: any[]
    task_assignments: any[]
    task_status_history: any[]
    workdays: any[]
    cash_movements: any[]
    settlements: any[]
    settlement_adjustments: any[]
    audit_logs?: any[]
  }
}

export interface BackupScheduleConfig {
  enabled: boolean
  frequency: 'daily' | 'every_12h' | 'weekly'
  time: string // '23:00'
  last_backup_at?: string
  auto_download: boolean
}

const BACKUP_CONFIG_KEY = 'bricklar_backup_schedule_config'

/**
 * Obtiene la configuración de respaldo automático guardada
 */
export function getBackupScheduleConfig(): BackupScheduleConfig {
  try {
    const raw = localStorage.getItem(BACKUP_CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading backup config from localStorage:', e)
  }
  return {
    enabled: true,
    frequency: 'daily',
    time: '23:00',
    auto_download: true,
  }
}

/**
 * Guarda la configuración de respaldo automático
 */
export function saveBackupScheduleConfig(config: BackupScheduleConfig): void {
  localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(config))
}

/**
 * Genera un respaldo completo de todas las tablas del sistema
 */
export async function generateFullBackup(userEmail?: string): Promise<BackupData> {
  const [
    branchesRes,
    profilesRes,
    busRoutesRes,
    tasksRes,
    assignmentsRes,
    historyRes,
    workdaysRes,
    movementsRes,
    settlementsRes,
    adjustmentsRes,
    auditRes,
  ] = await Promise.all([
    supabase.from('branches').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('bus_routes').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('task_assignments').select('*'),
    supabase.from('task_status_history').select('*'),
    supabase.from('workdays').select('*'),
    supabase.from('cash_movements').select('*'),
    supabase.from('settlements').select('*'),
    supabase.from('settlement_adjustments').select('*'),
    supabase.from('audit_logs').select('*').limit(200),
  ])

  const tablesData = {
    branches: branchesRes.data || [],
    profiles: profilesRes.data || [],
    bus_routes: busRoutesRes.data || [],
    tasks: tasksRes.data || [],
    task_assignments: assignmentsRes.data || [],
    task_status_history: historyRes.data || [],
    workdays: workdaysRes.data || [],
    cash_movements: movementsRes.data || [],
    settlements: settlementsRes.data || [],
    settlement_adjustments: adjustmentsRes.data || [],
    audit_logs: auditRes.data || [],
  }

  const summary: Record<string, number> = {}
  for (const [key, rows] of Object.entries(tablesData)) {
    summary[key] = rows.length
  }

  const now = new Date()
  const backup: BackupData = {
    metadata: {
      version: '1.0',
      created_at: now.toISOString(),
      created_by: userEmail || 'Administrador',
      app_name: 'Bricklar GestorApp',
      tables_summary: summary,
    },
    data: tablesData,
  }

  // Actualizar última fecha de respaldo en config local
  const currentConfig = getBackupScheduleConfig()
  currentConfig.last_backup_at = now.toISOString()
  saveBackupScheduleConfig(currentConfig)

  return backup
}

/**
 * Dispara la descarga del archivo de respaldo en formato JSON en el navegador del usuario
 */
export function triggerBackupDownload(backup: BackupData): void {
  const jsonString = JSON.stringify(backup, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `bricklar_respaldo_completo_${dateStr}.json`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Lee y valida un archivo de respaldo subido por el usuario
 */
export async function parseBackupFile(file: File): Promise<BackupData> {
  const text = await file.text()
  const parsed = JSON.parse(text)

  if (!parsed.data && !parsed.metadata) {
    // Si viene en formato plano directo { profiles: [], tasks: [] }
    const summary: Record<string, number> = {}
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) {
        summary[key] = parsed[key].length
      }
    }
    return {
      metadata: {
        version: '1.0',
        created_at: new Date().toISOString(),
        created_by: 'Archivo importado',
        app_name: 'Bricklar GestorApp',
        tables_summary: summary,
      },
      data: parsed,
    }
  }

  if (!parsed.data) {
    throw new Error('El archivo no contiene un formato de datos de respaldo válido.')
  }

  return parsed as BackupData
}

/**
 * Restaura los datos desde un objeto de respaldo hacia Supabase
 */
export async function restoreFromBackupData(backup: BackupData): Promise<{ success: boolean; message: string }> {
  const d = backup.data

  // 1. Perfiles y Sucursales (Catálogos base)
  if (d.branches && d.branches.length > 0) {
    await supabase.from('branches').upsert(d.branches, { onConflict: 'id' })
  }

  if (d.profiles && d.profiles.length > 0) {
    await supabase.from('profiles').upsert(d.profiles, { onConflict: 'id' })
  }

  if (d.bus_routes && d.bus_routes.length > 0) {
    await supabase.from('bus_routes').upsert(d.bus_routes, { onConflict: 'id' })
  }

  // 2. Jornadas y Movimientos
  if (d.workdays && d.workdays.length > 0) {
    await supabase.from('workdays').upsert(d.workdays, { onConflict: 'id' })
  }

  if (d.cash_movements && d.cash_movements.length > 0) {
    await supabase.from('cash_movements').upsert(d.cash_movements, { onConflict: 'id' })
  }

  if (d.settlements && d.settlements.length > 0) {
    await supabase.from('settlements').upsert(d.settlements, { onConflict: 'id' })
  }

  if (d.settlement_adjustments && d.settlement_adjustments.length > 0) {
    await supabase.from('settlement_adjustments').upsert(d.settlement_adjustments, { onConflict: 'id' })
  }

  // 3. Tareas, Asignaciones e Historial
  if (d.tasks && d.tasks.length > 0) {
    await supabase.from('tasks').upsert(d.tasks, { onConflict: 'id' })
  }

  if (d.task_assignments && d.task_assignments.length > 0) {
    await supabase.from('task_assignments').upsert(d.task_assignments, { onConflict: 'id' })
  }

  if (d.task_status_history && d.task_status_history.length > 0) {
    await supabase.from('task_status_history').upsert(d.task_status_history, { onConflict: 'id' })
  }

  return {
    success: true,
    message: 'Base de datos restaurada exitosamente a partir del archivo de respaldo.',
  }
}
