import { supabase } from '@/shared/lib/supabaseClient'
import type {
  Vehicle,
  MaintenanceRecord,
  VehicleHealthStatus,
} from '../types/fleet.types'

const FLEET_STORAGE_KEY = 'fleet_vehicles_data'
const FLEET_MAINTENANCE_KEY = 'fleet_maintenance_records_data'

/**
 * Calcula la salud y estado de desgaste de una motocicleta en base a su odómetro y/o fecha de mantenimiento mensual
 */
export function calculateVehicleHealth(vehicle: Vehicle): VehicleHealthStatus {
  const hasWorkingOdometer = vehicle.has_working_odometer !== false
  const currentKm = vehicle.current_odometer || 0
  const lastOilKm = vehicle.last_oil_change_km || 0
  const oilInterval = vehicle.oil_change_interval_km || 2500

  // 1. Cálculo por Odómetro - Aceite
  const kmSinceLastOil = Math.max(0, currentKm - lastOilKm)
  const oilKmRemaining = oilInterval - kmSinceLastOil
  const oilPercentage = Math.max(0, Math.min(100, Math.round((oilKmRemaining / oilInterval) * 100)))

  let oilStatus: 'ok' | 'warning' | 'urgent' = 'ok'
  if (hasWorkingOdometer) {
    if (oilKmRemaining <= 0) {
      oilStatus = 'urgent'
    } else if (oilKmRemaining <= 200) {
      oilStatus = 'warning'
    }
  }

  // 2. Cálculo por Odómetro - Servicio General
  const lastServiceKm = vehicle.last_general_service_km || 0
  const serviceInterval = vehicle.general_service_interval_km || 5000
  const kmSinceLastService = Math.max(0, currentKm - lastServiceKm)
  const serviceKmRemaining = serviceInterval - kmSinceLastService
  const servicePercentage = Math.max(0, Math.min(100, Math.round((serviceKmRemaining / serviceInterval) * 100)))

  let serviceStatus: 'ok' | 'warning' | 'urgent' = 'ok'
  if (hasWorkingOdometer) {
    if (serviceKmRemaining <= 0) {
      serviceStatus = 'urgent'
    } else if (serviceKmRemaining <= 400) {
      serviceStatus = 'warning'
    }
  }

  // 3. Cálculo por Calendario / Tiempo Transcurrido (Cada mes / Días)
  const intervalDays = vehicle.maintenance_interval_days || 30
  
  // Buscar la fecha más reciente de mantenimiento
  const dates = [
    vehicle.last_maintenance_date,
    vehicle.last_general_service_date,
    vehicle.last_oil_change_date,
    vehicle.created_at?.split('T')[0],
  ].filter(Boolean) as string[]

  dates.sort() // orden ascendente
  const mostRecentDateStr = dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString().split('T')[0]

  const lastDate = new Date(mostRecentDateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffTime = today.getTime() - lastDate.getTime()
  const daysSince = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  const daysRemaining = intervalDays - daysSince
  const timePercentage = Math.max(0, Math.min(100, Math.round((Math.max(0, daysRemaining) / intervalDays) * 100)))

  // Próxima fecha calculada
  const nextDateObj = new Date(lastDate)
  nextDateObj.setDate(nextDateObj.getDate() + intervalDays)
  const nextMaintenanceDate = nextDateObj.toISOString().split('T')[0]

  let timeStatus: 'ok' | 'warning' | 'urgent' = 'ok'
  if (daysRemaining < 0) {
    timeStatus = 'urgent' // Vencido por más de X días
  } else if (daysRemaining <= 5) {
    timeStatus = 'warning' // Próximo a vencer (a 5 días o menos de cumplir el mes)
  }

  // 4. Estado Global & Motivo de Alerta Principal
  let overallStatus: 'ok' | 'warning' | 'urgent' = 'ok'
  let primaryAlertReason = ''

  if (!hasWorkingOdometer) {
    // Si el odómetro no funciona, la salud depende 100% del control mensual por calendario
    overallStatus = timeStatus
    if (timeStatus === 'urgent') {
      primaryAlertReason = `Mantenimiento mensual vencido hace ${Math.abs(daysRemaining)} días`
    } else if (timeStatus === 'warning') {
      primaryAlertReason = `Mantenimiento mensual próximo (en ${daysRemaining} días)`
    } else {
      primaryAlertReason = `Al día por calendario (${daysSince} días desde último servicio)`
    }
  } else {
    // Odómetro funcional: se evalúa tanto km como tiempo transcurrido
    if (oilStatus === 'urgent' || serviceStatus === 'urgent' || timeStatus === 'urgent') {
      overallStatus = 'urgent'
      if (oilStatus === 'urgent') {
        primaryAlertReason = `Cambio de aceite vencido por ${Math.abs(oilKmRemaining)} km`
      } else if (timeStatus === 'urgent') {
        primaryAlertReason = `Mantenimiento mensual vencido hace ${Math.abs(daysRemaining)} días`
      } else {
        primaryAlertReason = `Mantenimiento general vencido por ${Math.abs(serviceKmRemaining)} km`
      }
    } else if (oilStatus === 'warning' || serviceStatus === 'warning' || timeStatus === 'warning') {
      overallStatus = 'warning'
      if (oilStatus === 'warning') {
        primaryAlertReason = `Cambio de aceite próximo (restan ${oilKmRemaining} km)`
      } else if (timeStatus === 'warning') {
        primaryAlertReason = `Mantenimiento mensual próximo (restan ${daysRemaining} días)`
      } else {
        primaryAlertReason = `Mantenimiento general próximo (restan ${serviceKmRemaining} km)`
      }
    } else {
      primaryAlertReason = `Al día (Aceite: ${oilKmRemaining} km, Mes: ${daysRemaining} días restantes)`
    }
  }

  return {
    has_working_odometer: hasWorkingOdometer,
    oil_km_remaining: oilKmRemaining,
    oil_percentage: oilPercentage,
    oil_status: oilStatus,
    service_km_remaining: serviceKmRemaining,
    service_percentage: servicePercentage,
    service_status: serviceStatus,
    days_since_last_maintenance: daysSince,
    maintenance_interval_days: intervalDays,
    days_remaining: daysRemaining,
    time_percentage: timePercentage,
    time_status: timeStatus,
    next_maintenance_date: nextMaintenanceDate,
    last_maintenance_date: mostRecentDateStr,
    overall_status: overallStatus,
    primary_alert_reason: primaryAlertReason,
  }
}

/**
 * Obtiene la lista de vehículos de la flota
 */
export async function getVehicles(branchId?: string): Promise<Vehicle[]> {
  const todayStr = new Date().toISOString().split('T')[0]
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', FLEET_STORAGE_KEY)
      .maybeSingle()

    let list: Vehicle[] = []

    if (!error && data?.value_json && Array.isArray(data.value_json)) {
      list = data.value_json as unknown as Vehicle[]
    } else {
      const local = localStorage.getItem(FLEET_STORAGE_KEY)
      if (local) {
        try {
          list = JSON.parse(local) as Vehicle[]
        } catch {
          list = []
        }
      }
    }

    // Normalizar vehículos
    list = list.map((v) => ({
      ...v,
      has_working_odometer: v.has_working_odometer !== false,
      current_odometer: Number(v.current_odometer) || 0,
      oil_change_interval_km: Number(v.oil_change_interval_km) || 2500,
      last_oil_change_km: Number(v.last_oil_change_km) || 0,
      last_oil_change_date: v.last_oil_change_date || todayStr,
      general_service_interval_km: Number(v.general_service_interval_km) || 5000,
      last_general_service_km: Number(v.last_general_service_km) || 0,
      last_general_service_date: v.last_general_service_date || todayStr,
      maintenance_interval_days: Number(v.maintenance_interval_days) || 30,
      last_maintenance_date: v.last_maintenance_date || v.last_general_service_date || v.last_oil_change_date || todayStr,
      last_maintenance_type: v.last_maintenance_type || 'general_maintenance',
      status: v.status || 'active',
    }))

    if (branchId && branchId !== 'all') {
      return list.filter((v) => !v.branch_id || v.branch_id === branchId)
    }

    return list
  } catch (err) {
    console.warn('[Fleet] Error fetching vehicles:', err)
    const local = localStorage.getItem(FLEET_STORAGE_KEY)
    if (local) {
      try {
        let list = JSON.parse(local) as Vehicle[]
        list = list.map((v) => ({
          ...v,
          has_working_odometer: v.has_working_odometer !== false,
          current_odometer: Number(v.current_odometer) || 0,
          oil_change_interval_km: Number(v.oil_change_interval_km) || 2500,
          last_oil_change_km: Number(v.last_oil_change_km) || 0,
          last_oil_change_date: v.last_oil_change_date || todayStr,
          general_service_interval_km: Number(v.general_service_interval_km) || 5000,
          last_general_service_km: Number(v.last_general_service_km) || 0,
          last_general_service_date: v.last_general_service_date || todayStr,
          maintenance_interval_days: Number(v.maintenance_interval_days) || 30,
          last_maintenance_date: v.last_maintenance_date || v.last_general_service_date || v.last_oil_change_date || todayStr,
          last_maintenance_type: v.last_maintenance_type || 'general_maintenance',
          status: v.status || 'active',
        }))
        if (branchId && branchId !== 'all') {
          return list.filter((v) => !v.branch_id || v.branch_id === branchId)
        }
        return list
      } catch {
        return []
      }
    }
    return []
  }
}

async function saveFleetSettingToDb(key: string, value: any, description: string): Promise<void> {
  try {
    const { data: existing, error: selectError } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key)
      .maybeSingle()

    if (selectError) {
      console.warn('[Fleet] DB select error for key:', key, selectError)
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('app_settings')
        .update({
          value_json: value as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        console.warn('[Fleet] DB update error for key:', key, updateError)
      }
    } else {
      const { error: insertError } = await supabase
        .from('app_settings')
        .insert({
          key,
          value_json: value as any,
          description,
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.warn('[Fleet] DB insert error for key:', key, insertError)
      }
    }
  } catch (err) {
    console.warn('[Fleet] DB save error for key:', key, err)
  }
}

/**
 * Guarda o actualiza un vehículo en la flota
 */
export async function saveVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
  const allVehicles = await getVehicles()
  const now = new Date().toISOString()
  const todayStr = now.split('T')[0]

  let savedVehicle: Vehicle

  if (payload.id) {
    // Actualización
    const index = allVehicles.findIndex((v) => v.id === payload.id)
    if (index === -1) throw new Error('Vehículo no encontrado.')

    const prev = allVehicles[index]
    savedVehicle = {
      ...prev,
      ...payload,
      plate: payload.plate ? payload.plate.toUpperCase().trim() : prev.plate,
      brand: payload.brand !== undefined ? payload.brand.trim() : prev.brand,
      model: payload.model !== undefined ? payload.model.trim() : prev.model,
      year: payload.year !== undefined ? (payload.year ? Number(payload.year) : null) : prev.year,
      color: payload.color !== undefined ? payload.color : prev.color,
      branch_id: payload.branch_id !== undefined ? payload.branch_id : prev.branch_id,
      assigned_courier_id: payload.assigned_courier_id !== undefined ? payload.assigned_courier_id : prev.assigned_courier_id,
      assigned_courier_name: payload.assigned_courier_name !== undefined ? payload.assigned_courier_name : prev.assigned_courier_name,
      has_working_odometer: payload.has_working_odometer !== undefined ? payload.has_working_odometer : prev.has_working_odometer !== false,
      current_odometer: payload.current_odometer !== undefined ? Number(payload.current_odometer) : prev.current_odometer,
      oil_change_interval_km: payload.oil_change_interval_km !== undefined ? Number(payload.oil_change_interval_km) : prev.oil_change_interval_km,
      last_oil_change_km: payload.last_oil_change_km !== undefined ? Number(payload.last_oil_change_km) : prev.last_oil_change_km,
      last_oil_change_date: payload.last_oil_change_date !== undefined ? payload.last_oil_change_date : prev.last_oil_change_date,
      general_service_interval_km: payload.general_service_interval_km !== undefined ? Number(payload.general_service_interval_km) : prev.general_service_interval_km,
      last_general_service_km: payload.last_general_service_km !== undefined ? Number(payload.last_general_service_km) : prev.last_general_service_km,
      last_general_service_date: payload.last_general_service_date !== undefined ? payload.last_general_service_date : prev.last_general_service_date,
      maintenance_interval_days: payload.maintenance_interval_days !== undefined ? Number(payload.maintenance_interval_days) : (prev.maintenance_interval_days || 30),
      last_maintenance_date: payload.last_maintenance_date !== undefined ? payload.last_maintenance_date : (prev.last_maintenance_date || todayStr),
      last_maintenance_type: payload.last_maintenance_type !== undefined ? payload.last_maintenance_type : (prev.last_maintenance_type || 'general_maintenance'),
      status: payload.status || prev.status || 'active',
      notes: payload.notes !== undefined ? payload.notes : prev.notes,
      updated_at: now,
    } as Vehicle
    allVehicles[index] = savedVehicle
  } else {
    // Creación
    const initialLastMaintDate = payload.last_maintenance_date || payload.last_general_service_date || payload.last_oil_change_date || todayStr

    savedVehicle = {
      id: crypto.randomUUID(),
      plate: payload.plate?.toUpperCase().trim() || 'M-000000',
      brand: payload.brand?.trim() || 'Yamaha',
      model: payload.model?.trim() || 'YBR 125',
      year: payload.year ? Number(payload.year) : new Date().getFullYear(),
      color: payload.color?.trim() || 'Negro',
      branch_id: payload.branch_id || '',
      assigned_courier_id: payload.assigned_courier_id || null,
      assigned_courier_name: payload.assigned_courier_name || null,
      has_working_odometer: payload.has_working_odometer !== false,
      current_odometer: Number(payload.current_odometer) || 0,
      oil_change_interval_km: Number(payload.oil_change_interval_km) || 2500,
      last_oil_change_km: Number(payload.last_oil_change_km) || 0,
      last_oil_change_date: payload.last_oil_change_date || initialLastMaintDate,
      general_service_interval_km: Number(payload.general_service_interval_km) || 5000,
      last_general_service_km: Number(payload.last_general_service_km) || 0,
      last_general_service_date: payload.last_general_service_date || initialLastMaintDate,
      maintenance_interval_days: Number(payload.maintenance_interval_days) || 30,
      last_maintenance_date: initialLastMaintDate,
      last_maintenance_type: payload.last_maintenance_type || 'general_maintenance',
      status: payload.status || 'active',
      notes: payload.notes || '',
      created_at: now,
      updated_at: now,
    } as Vehicle
    allVehicles.push(savedVehicle)
  }

  // Guardar en localStorage
  try {
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(allVehicles))
  } catch (e) {
    console.warn('[Fleet] localStorage save error:', e)
  }

  // Guardar en Supabase app_settings
  await saveFleetSettingToDb(
    FLEET_STORAGE_KEY,
    allVehicles,
    'Registro maestro de vehículos y motocicletas de la flota'
  )

  return savedVehicle
}

/**
 * Elimina un vehículo de la flota
 */
export async function deleteVehicle(id: string): Promise<void> {
  const allVehicles = await getVehicles()
  const filtered = allVehicles.filter((v) => v.id !== id)

  try {
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(filtered))
  } catch (e) {
    console.warn('[Fleet] localStorage delete error:', e)
  }

  await saveFleetSettingToDb(
    FLEET_STORAGE_KEY,
    filtered,
    'Registro maestro de vehículos y motocicletas de la flota'
  )
}

/**
 * Obtiene el historial de registros de mantenimiento mecánico
 */
export async function getMaintenanceRecords(vehicleId?: string): Promise<MaintenanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', FLEET_MAINTENANCE_KEY)
      .maybeSingle()

    let list: MaintenanceRecord[] = []

    if (!error && data?.value_json && Array.isArray(data.value_json)) {
      list = data.value_json as unknown as MaintenanceRecord[]
    } else {
      const local = localStorage.getItem(FLEET_MAINTENANCE_KEY)
      if (local) {
        list = JSON.parse(local) as MaintenanceRecord[]
      }
    }

    if (vehicleId) {
      return list.filter((r) => r.vehicle_id === vehicleId)
    }

    return list
  } catch (err) {
    console.warn('[Fleet] Error fetching maintenance records:', err)
    const local = localStorage.getItem(FLEET_MAINTENANCE_KEY)
    if (local) {
      const list = JSON.parse(local) as MaintenanceRecord[]
      if (vehicleId) return list.filter((r) => r.vehicle_id === vehicleId)
      return list
    }
    return []
  }
}

/**
 * Registra un nuevo servicio o mantenimiento mecánico y actualiza el odómetro / fechas de mantenimiento del vehículo
 */
export async function addMaintenanceRecord(
  payload: Omit<MaintenanceRecord, 'id' | 'created_at'>
): Promise<MaintenanceRecord> {
  const allRecords = await getMaintenanceRecords()
  const now = new Date().toISOString()

  const newRecord: MaintenanceRecord = {
    ...payload,
    id: crypto.randomUUID(),
    created_at: now,
  }

  allRecords.unshift(newRecord)

  // Guardar en localStorage
  try {
    localStorage.setItem(FLEET_MAINTENANCE_KEY, JSON.stringify(allRecords))
  } catch (e) {
    console.warn('[Fleet] localStorage save record error:', e)
  }

  // Guardar en Supabase app_settings
  await saveFleetSettingToDb(
    FLEET_MAINTENANCE_KEY,
    allRecords,
    'Bitácora histórica de servicios mecánicos y mantenimientos de flota'
  )

  // Actualizar vehículo correspondiente
  const allVehicles = await getVehicles()
  const vIndex = allVehicles.findIndex((v) => v.id === payload.vehicle_id)
  if (vIndex !== -1) {
    const v = allVehicles[vIndex]
    const updatedVehicle: Vehicle = {
      ...v,
      last_maintenance_date: payload.service_date,
      last_maintenance_type: payload.service_type,
      updated_at: now,
    }

    if (v.has_working_odometer && payload.odometer_at_service > 0) {
      updatedVehicle.current_odometer = Math.max(v.current_odometer, payload.odometer_at_service)
    }

    if (payload.service_type === 'oil_change') {
      if (v.has_working_odometer && payload.odometer_at_service > 0) {
        updatedVehicle.last_oil_change_km = payload.odometer_at_service
      }
      updatedVehicle.last_oil_change_date = payload.service_date
    }

    if (payload.service_type === 'general_maintenance') {
      if (v.has_working_odometer && payload.odometer_at_service > 0) {
        updatedVehicle.last_general_service_km = payload.odometer_at_service
        updatedVehicle.last_oil_change_km = payload.odometer_at_service
      }
      updatedVehicle.last_general_service_date = payload.service_date
      updatedVehicle.last_oil_change_date = payload.service_date
    }

    allVehicles[vIndex] = updatedVehicle
    try {
      localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(allVehicles))
    } catch {
      // ignore
    }
    await saveFleetSettingToDb(
      FLEET_STORAGE_KEY,
      allVehicles,
      'Registro maestro de vehículos y motocicletas de la flota'
    )
  }

  return newRecord
}

/**
 * Sincroniza el odómetro final del vehículo cuando un motorizado finaliza su jornada
 */
export async function syncVehicleOdometerFromWorkday(
  courierId: string,
  finalKm: number
): Promise<void> {
  if (!courierId || !finalKm || isNaN(finalKm)) return

  try {
    const allVehicles = await getVehicles()
    const targetVehicle = allVehicles.find((v) => v.assigned_courier_id === courierId)

    if (targetVehicle && targetVehicle.has_working_odometer !== false && finalKm > targetVehicle.current_odometer) {
      await saveVehicle({
        id: targetVehicle.id,
        current_odometer: finalKm,
      })
    }
  } catch (err) {
    console.warn('[Fleet] Could not auto-sync vehicle odometer:', err)
  }
}

