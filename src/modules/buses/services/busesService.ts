import { supabase } from '@/shared/lib/supabaseClient'
import type { BusRoute, CreateBusRoutePayload, UpdateBusRoutePayload } from '../types/buses.types'

export async function getBusRoutes(): Promise<BusRoute[]> {
  const { data, error } = await supabase
    .from('bus_routes')
    .select('*')
    .order('destination_city', { ascending: true })

  if (error) {
    console.error('[Buses] getBusRoutes error:', error)
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as BusRoute[]
}

export async function createBusRoute(payload: CreateBusRoutePayload): Promise<BusRoute> {
  const { data, error } = await supabase
    .from('bus_routes')
    .insert({
      cooperative_name: payload.cooperative_name,
      origin_terminal: payload.origin_terminal,
      destination_city: payload.destination_city,
      departure_schedules: payload.departure_schedules,
      dispatch_phone: payload.dispatch_phone ?? null,
      notes: payload.notes ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('[Buses] createBusRoute error:', error)
    throw new Error(error.message)
  }

  return data as unknown as BusRoute
}

export async function updateBusRoute(id: string, payload: UpdateBusRoutePayload): Promise<BusRoute> {
  const updateData: Record<string, unknown> = {}
  if (payload.cooperative_name !== undefined) updateData.cooperative_name = payload.cooperative_name
  if (payload.origin_terminal !== undefined) updateData.origin_terminal = payload.origin_terminal
  if (payload.destination_city !== undefined) updateData.destination_city = payload.destination_city
  if (payload.departure_schedules !== undefined) updateData.departure_schedules = payload.departure_schedules
  if (payload.dispatch_phone !== undefined) updateData.dispatch_phone = payload.dispatch_phone
  if (payload.notes !== undefined) updateData.notes = payload.notes
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active

  const { data, error } = await supabase
    .from('bus_routes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[Buses] updateBusRoute error:', error)
    throw new Error(error.message)
  }

  return data as unknown as BusRoute
}

export async function deleteBusRoute(id: string): Promise<void> {
  const { error } = await supabase.from('bus_routes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
