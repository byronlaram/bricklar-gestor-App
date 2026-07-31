export interface BusRoute {
  id: string
  cooperative_name: string
  origin_terminal: string
  destination_city: string
  departure_schedules: string
  dispatch_phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface CreateBusRoutePayload {
  cooperative_name: string
  origin_terminal: string
  destination_city: string
  departure_schedules: string
  dispatch_phone?: string
  notes?: string
}

export type UpdateBusRoutePayload = Partial<CreateBusRoutePayload> & { is_active?: boolean }
