import { supabase } from '@/shared/lib/supabaseClient'
import type {
  Vehicle,
  MaintenanceRecord,
  VehicleHealthStatus,
} from '../types/fleet.types'

const FLEET_STORAGE_KEY = 'fleet_vehicles_data'
const FLEET_MAINTENANCE_KEY = 'fleet_maintenance_records_data'

/**
 * Calcula la salud y estado de desgaste de una motocicleta en base a su odómetro
 */
export function calculateVehicleHealth(vehicle: Vehicle): VehicleHealthStatus {
  const currentKm = vehicle.current_odometer || 0
  const lastOilKm = vehicle.last_oil_change_km || 0
  const oilInterval = vehicle.oil_change_interval_km || 2500

  const kmSinceLastOil = Math.max(0, currentKm - lastOilKm)
  const oilKmRemaining = oilInterval - kmSinceLastOil
  const oilPercentage = Math.max(0, Math.min(100, Math.round((oilKmRemaining / oilInterval) * 100)))

  let oilStatus: 'ok' | 'warning' | 'urgent' = 'ok'
  if (oilKmRemaining <= 0) {
    oilStatus = 'urgent'
  } else if (oilKmRemaining <= 200) {
    oilStatus = 'warning'
  }

  const lastServiceKm = vehicle.last_general_service_km || 0
  const serviceInterval = vehicle.general_service_interval_km || 5000

  const kmSinceLastService = Math.max(0, currentKm - lastServiceKm)
  const serviceKmRemaining = serviceInterval - kmSinceLastService
  const servicePercentage = Math.max(0, Math.min(100, Math.round((serviceKmRemaining / serviceInterval) * 100)))

  let serviceStatus: 'ok' | 'warning' | 'urgent' = 'ok'
  if (serviceKmRemaining <= 0) {
    serviceStatus = 'urgent'
  } else if (serviceKmRemaining <= 400) {
    serviceStatus = 'warning'
  }

  let overallStatus: 'ok' | 'warning' | 'urgent' = 'ok'
  if (oilStatus === 'urgent' || serviceStatus === 'urgent') {
    overallStatus = 'urgent'
  } else if (oilStatus === 'warning' || serviceStatus === 'warning') {
    overallStatus = 'warning'
  }

  return {
    oil_km_remaining: oilKmRemaining,
    oil_percentage: oilPercentage,
    oil_status: oilStatus,
    service_km_remaining: serviceKmRemaining,
    service_percentage: servicePercentage,
    service_status: serviceStatus,
    overall_status: overallStatus,
  }
}

/**
 * Obtiene la lista de vehículos de la flota
 */
export async function getVehicles(branchId?: string): Promise<Vehicle[]> {
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
        list = JSON.parse(local) as Vehicle[]
      }
    }

    if (branchId && branchId !== 'all') {
      return list.filter((v) => v.branch_id === branchId)
    }

    return list
  } catch (err) {
    console.warn('[Fleet] Error fetching vehicles:', err)
    const local = localStorage.getItem(FLEET_STORAGE_KEY)
    if (local) {
      const list = JSON.parse(local) as Vehicle[]
      if (branchId && branchId !== 'all') {
        return list.filter((v) => v.branch_id === branchId)
      }
      return list
    }
    return []
  }
}

/**
 * Guarda o actualiza un vehículo en la flota
 */
export async function saveVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
  const allVehicles = await getVehicles()
  const now = new Date().toISOString()
  const todayDate = now.split('T')[0]

  let savedVehicle: Vehicle

  if (payload.id) {
    // Actualización
    const index = allVehicles.findIndex((v) => v.id === payload.id)
    if (index === -1) throw new Error('Vehículo no encontrado.')

    savedVehicle = {
      ...allVehicles[index],
      ...payload,
      updated_at: now,
    } as Vehicle
    allVehicles[index] = savedVehicle
  } else {
    // Creación
    savedVehicle = {
      id: crypto.randomUUID(),
      plate: payload.plate?.toUpperCase().trim() || 'M-000000',
      brand: payload.brand?.trim() || 'Desconocida',
      model: payload.model?.trim() || 'Moped',
      year: payload.year || new Date().getFullYear(),
      color: payload.color?.trim() || 'Negro',
      assigned_courier_id: payload.assigned_courier_id || null,
      assigned_courier_name: payload.assigned_courier_name || null,
      branch_id: payload.branch_id || '',
      current_odometer: Number(payload.current_odometer) || 0,
      oil_change_interval_km: Number(payload.oil_change_interval_km) || 2500,
      last_oil_change_km: Number(payload.last_oil_change_km) || Number(payload.current_odometer) || 0,
      last_oil_change_date: payload.last_oil_change_date || todayDate,
      general_service_interval_km: Number(payload.general_service_interval_km) || 5000,
      last_general_service_km: Number(payload.last_general_service_km) || Number(payload.current_odometer) || 0,
      last_general_service_date: payload.last_general_service_date || todayDate,
      status: payload.status || 'active',
      notes: payload.notes || null,
      created_at: now,
      updated_at: now,
    }
    allVehicles.unshift(savedVehicle)
  }

  // Guardar en localStorage
  try {
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(allVehicles))
  } catch (e) {
    console.warn('[Fleet] localStorage save error:', e)
  }

  // Guardar en Supabase app_settings
  await supabase.from('app_settings').upsert({
    key: FLEET_STORAGE_KEY,
    value_json: allVehicles as any,
    description: 'Registro maestro de vehículos y motocicletas de la flota',
    updated_at: now,
  })

  return savedVehicle
}

/**
 * Elimina un vehículo de la flota
 */
export async function deleteVehicle(id: string): Promise<void> {
  const allVehicles = await getVehicles()
  const filtered = allVehicles.filter((v) => v.id !== id)
  const now = new Date().toISOString()

  try {
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(filtered))
  } catch (e) {
    console.warn('[Fleet] localStorage delete error:', e)
  }

  await supabase.from('app_settings').upsert({
    key: FLEET_STORAGE_KEY,
    value_json: filtered as any,
    description: 'Registro maestro de vehículos y motocicletas de la flota',
    updated_at: now,
  })
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
 * Registra un nuevo servicio o mantenimiento mecánico y actualiza el odómetro base del vehículo
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
  await supabase.from('app_settings').upsert({
    key: FLEET_MAINTENANCE_KEY,
    value_json: allRecords as any,
    description: 'Bitácora histórica de servicios mecánicos y mantenimientos de flota',
    updated_at: now,
  })

  // Si fue cambio de aceite o mantenimiento general, actualizar el kilometraje base en el vehículo
  const allVehicles = await getVehicles()
  const vIndex = allVehicles.findIndex((v) => v.id === payload.vehicle_id)
  if (vIndex !== -1) {
    const v = allVehicles[vIndex]
    const updatedVehicle: Vehicle = {
      ...v,
      current_odometer: Math.max(v.current_odometer, payload.odometer_at_service),
      updated_at: now,
    }

    if (payload.service_type === 'oil_change') {
      updatedVehicle.last_oil_change_km = payload.odometer_at_service
      updatedVehicle.last_oil_change_date = payload.service_date
    }

    if (payload.service_type === 'general_maintenance') {
      updatedVehicle.last_general_service_km = payload.odometer_at_service
      updatedVehicle.last_general_service_date = payload.service_date
    }

    allVehicles[vIndex] = updatedVehicle
    try {
      localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(allVehicles))
    } catch {
      // ignore
    }
    await supabase.from('app_settings').upsert({
      key: FLEET_STORAGE_KEY,
      value_json: allVehicles as any,
      description: 'Registro maestro de vehículos y motocicletas de la flota',
      updated_at: now,
    })
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

    if (targetVehicle && finalKm > targetVehicle.current_odometer) {
      await saveVehicle({
        id: targetVehicle.id,
        current_odometer: finalKm,
      })
    }
  } catch (err) {
    console.warn('[Fleet] Could not auto-sync vehicle odometer:', err)
  }
}
