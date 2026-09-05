export type VehicleStatus = 'active' | 'in_maintenance' | 'inactive'

export type MaintenanceServiceType =
  | 'oil_change'
  | 'general_maintenance'
  | 'tires'
  | 'brakes'
  | 'electrical'
  | 'transmission'
  | 'other'

export interface Vehicle {
  id: string
  plate: string // ej: M 123456
  brand: string // ej: Yamaha, Bajaj, Honda, Suzuki, Genesis
  model: string // ej: YBR 125, Pulsar 150, Box 150
  year?: number | null
  color?: string | null
  assigned_courier_id?: string | null
  assigned_courier_name?: string | null
  branch_id: string
  current_odometer: number // en km
  oil_change_interval_km: number // por defecto 2,500 km
  last_oil_change_km: number // en km
  last_oil_change_date: string // YYYY-MM-DD
  general_service_interval_km: number // por defecto 5,000 km
  last_general_service_km: number // en km
  last_general_service_date: string // YYYY-MM-DD
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
  oil_km_remaining: number
  oil_percentage: number // 0 a 100% de vida restante
  oil_status: 'ok' | 'warning' | 'urgent'
  service_km_remaining: number
  service_percentage: number
  service_status: 'ok' | 'warning' | 'urgent'
  overall_status: 'ok' | 'warning' | 'urgent'
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceServiceType, string> = {
  oil_change: 'Cambio de Aceite & Filtro',
  general_maintenance: 'Mantenimiento General / Afinamiento',
  tires: 'Cambio de Llantas / Neumáticos',
  brakes: 'Frenos (Pastillas / Bandas)',
  electrical: 'Sistema Eléctrico / Luces / Batería',
  transmission: 'Transmisión / Cadena / Sprocket',
  other: 'Otro Servicio Mecánico',
}
