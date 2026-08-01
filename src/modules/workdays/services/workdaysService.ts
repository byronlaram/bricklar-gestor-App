import { supabase } from '@/shared/lib/supabaseClient'
import type {
  Workday,
  StartWorkdayPayload,
  EndWorkdayPayload,
  WorkdayFilters,
} from '../types/workdays.types'

const WORKDAY_SELECT = `
  *,
  courier_profile:profiles!workdays_courier_id_fkey (
    id, full_name, display_name, phone, avatar_url
  ),
  branch:branches!workdays_branch_id_fkey (
    id, name, code
  )
`

export async function getActiveWorkday(userId: string): Promise<Workday | null> {
  const { data, error } = await supabase
    .from('workdays')
    .select(WORKDAY_SELECT)
    .eq('courier_id', userId)
    .in('status', ['open', 'pending_settlement'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[Workdays] getActiveWorkday error:', error)
    throw new Error(error.message)
  }

  return (data as unknown as Workday) ?? null
}

export async function startWorkday(payload: StartWorkdayPayload): Promise<Workday> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa.')

  // Verificar si ya tiene jornada abierta
  const active = await getActiveWorkday(userId)
  if (active && active.status === 'open') {
    throw new Error('Ya tienes una jornada laboral abierta.')
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const insertData = {
    courier_id: userId,
    opened_by: userId,
    branch_id: payload.branch_id,
    work_date: todayStr,
    status: 'open',
    start_time: new Date().toISOString(),
    initial_km: payload.initial_km,
    initial_cash: payload.initial_cash ?? 0,
    notes: payload.notes ?? null,
  }

  const { data, error } = await supabase
    .from('workdays')
    .insert(insertData)
    .select(WORKDAY_SELECT)
    .single()

  if (error) {
    console.error('[Workdays] startWorkday error:', error)
    throw new Error(error.message)
  }

  return data as unknown as Workday
}

export async function endWorkday(payload: EndWorkdayPayload): Promise<Workday> {
  const { data, error } = await supabase
    .from('workdays')
    .update({
      status: 'pending_settlement',
      end_time: new Date().toISOString(),
      final_km: payload.final_km,
      notes: payload.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.workday_id)
    .select(WORKDAY_SELECT)
    .single()

  if (error) {
    console.error('[Workdays] endWorkday error:', error)
    throw new Error(error.message)
  }

  return data as unknown as Workday
}

export async function getWorkdays(filters: WorkdayFilters = {}): Promise<Workday[]> {
  const { branch_id, courier_id, date, status } = filters

  let query = supabase
    .from('workdays')
    .select(WORKDAY_SELECT)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (branch_id) query = query.eq('branch_id', branch_id)
  if (courier_id) query = query.eq('courier_id', courier_id)
  if (date) query = query.eq('work_date', date)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    console.error('[Workdays] getWorkdays error:', error)
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as Workday[]
}
