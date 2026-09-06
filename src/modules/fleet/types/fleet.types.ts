export type VehicleStatus = 'active' | 'in_maintenance' | 'inactive'

export type MaintenanceServiceType =
  | 'general_maintenance'
  | 'oil_change'
  | 'minor_repair'
  | 'spare_parts'
  | 'tires'
  | 'brakes'
  | 'electrical'
  | 'transmission'
  | 'other'

export interface Vehicle {
  id: string
  plate: string // ej: M 123456
  brand: string // ej: Yamaha, Bajaj, Honda, Suzuki, Genesis
  model: string // ej: YBR 125, Pulsar 150, Boxer 150
  year?: number | null
  color?: string | null
  assigned_courier_id?: string | null
  assigned_courier_name?: string | null
  branch_id: string
  // Control de Odómetro
  has_working_odometer: boolean // true si funciona normal, false si está dañado o descompuesto
  current_odometer: number // en km
  oil_change_interval_km: number // por defecto 2,500 km
  last_oil_change_km: number // en km
  last_oil_change_date: string // YYYY-MM-DD
  general_service_interval_km: number // por defecto 5,000 km
  last_general_service_km: number // en km
  last_general_service_date: string // YYYY-MM-DD
  // Control por Calendario / Tiempo (Mensual)
  maintenance_interval_days: number // por defecto 30 días (1 mes)
  last_maintenance_date: string // YYYY-MM-DD
  last_maintenance_type?: MaintenanceServiceType | null
  status: VehicleStatus
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface MaintenanceRecord {
  id: string
  vehicle_id: string
  vehicle_plate: string
  service_type: MaintenanceServiceType
  odometer_at_service: number
  cost: number
  currency: 'NIO' | 'USD'
  service_date: string // YYYY-MM-DD
  mechanic_or_workshop?: string | null
  parts_replaced?: string | null
  notes?: string | null
  performed_by_name?: string | null
  created_at: string
}

export interface VehicleHealthStatus {
  // Odómetro / Kilometraje
  has_working_odometer: boolean
  oil_km_remaining: number
  oil_percentage: number // 0 a 100% de vida restante
  oil_status: 'ok' | 'warning' | 'urgent'
  service_km_remaining: number
  service_percentage: number
  service_status: 'ok' | 'warning' | 'urgent'
  // Control de Tiempo / Mensual
  days_since_last_maintenance: number
  maintenance_interval_days: number
  days_remaining: number
  time_percentage: number // 0 a 100% (100% recién hecho, 0% vencido)
  time_status: 'ok' | 'warning' | 'urgent'
  next_maintenance_date: string // YYYY-MM-DD
  last_maintenance_date: string // YYYY-MM-DD
  // Estado General
  overall_status: 'ok' | 'warning' | 'urgent'
  primary_alert_reason: string
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceServiceType, string> = {
  general_maintenance: 'Mantenimiento General Preventivo',
  oil_change: 'Cambio de Aceite & Filtro',
  spare_parts: 'Compra / Reemplazo de Repuestos',
  minor_repair: 'Reparación Pequeña / Ajuste Menor',
  tires: 'Llantas / Neumáticos',
  brakes: 'Frenos (Pastillas / Bandas)',
  electrical: 'Sistema Eléctrico / Luces / Batería',
  transmission: 'Transmisión / Cadena / Sprocket',
  other: 'Otro Servicio Mecánico',
}

