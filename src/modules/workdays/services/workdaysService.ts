import { supabase } from '@/shared/lib/supabaseClient'
import { calculateWorkdayCashSummary } from '../utils/workdayCalculations'
import type {
  Workday,
  StartWorkdayPayload,
  EndWorkdayPayload,
  WorkdayFilters,
} from '../types/workdays.types'

import { getLocalDateString } from '@/shared/utils/date'

const WORKDAY_SELECT = `
  *,
  courier_profile:profiles!workdays_courier_id_fkey (
    id, full_name, display_name, phone, avatar_url
  ),
  branch:branches!workdays_branch_id_fkey (
    id, name, code
  )
`

export async function getWorkdayById(id: string): Promise<Workday | null> {
  const { data, error } = await supabase
    .from('workdays')
    .select(WORKDAY_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) return null

  const wd = data as unknown as Workday

  // Obtener tareas y movimientos
  const { data: tasks } = await supabase
    .from('tasks')
    .select('expected_collection_amount, expected_collection_currency, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
    .eq('assigned_courier_id', wd.courier_id)
    .eq('scheduled_date', wd.work_date)
    .eq('status', 'completed')

  const { data: movements } = await supabase
    .from('cash_movements')
    .select('amount, currency, direction, movement_type')
    .eq('workday_id', wd.id)

  const summary = calculateWorkdayCashSummary(wd.initial_cash || 0, tasks || [], movements || [])

  return {
    ...wd,
    cash_summary: summary,
  }
}

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

  if (!data) return null

  const wd = data as unknown as Workday

  // Si la jornada tiene una liquidación aprobada, ya no debe considerarse un turno abierto/activo
  const { data: settlement } = await supabase
    .from('settlements')
    .select('id, status')
    .eq('workday_id', wd.id)
    .maybeSingle()

  if (settlement && settlement.status === 'approved') {
    // Autocierre defensivo de la jornada en segundo plano si quedó desfasada
    await supabase
      .from('workdays')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', wd.id)
    return null
  }

  return wd
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

  const todayStr = getLocalDateString()

  // Verificar si ya existe un registro de jornada para hoy (ej. fondo asignado previamente por admin)
  const { data: existingRow } = await supabase
    .from('workdays')
    .select('id, initial_cash')
    .eq('courier_id', userId)
    .eq('work_date', todayStr)
    .maybeSingle()

  const finalInitialCash = existingRow && existingRow.initial_cash > 0
    ? existingRow.initial_cash
    : (payload.initial_cash ?? 0)

  let combinedNotes = payload.notes || ''
  if (payload.km_not_available && payload.km_reason) {
    const kmNote = `[Kilometraje No Disponible] Motivo: ${payload.km_reason}`
    combinedNotes = combinedNotes ? `${kmNote} | ${combinedNotes}` : kmNote
  }

  let resultData: Workday

  if (existingRow) {
    const { data, error } = await supabase
      .from('workdays')
      .update({
        status: 'open',
        start_time: new Date().toISOString(),
        initial_km: payload.initial_km ?? undefined,
        initial_cash: finalInitialCash,
        notes: combinedNotes || null,
        opened_by: userId,
      })
      .eq('id', existingRow.id)
      .select(WORKDAY_SELECT)
      .single()

    if (error) {
      console.error('[Workdays] startWorkday update error:', error)
      throw new Error(error.message)
    }
    resultData = data as unknown as Workday
  } else {
    const insertData = {
      courier_id: userId,
      opened_by: userId,
      branch_id: payload.branch_id,
      work_date: todayStr,
      status: 'open',
      start_time: new Date().toISOString(),
      initial_km: payload.initial_km ?? undefined,
      initial_cash: finalInitialCash,
      notes: combinedNotes || null,
    }

    const { data, error } = await supabase
      .from('workdays')
      .insert(insertData)
      .select(WORKDAY_SELECT)
      .single()

    if (error) {
      console.error('[Workdays] startWorkday insert error:', error)
      throw new Error(error.message)
    }
    resultData = data as unknown as Workday
  }

  // Registro de auditoría
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'workday_started',
      p_entity_type: 'workday',
      p_entity_id: resultData.id,
      p_entity_code: todayStr,
      p_branch_id: payload.branch_id,
      p_changes: {
        user_id: userId,
        initial_km: payload.initial_km ?? null,
        km_entered: payload.initial_km !== null && payload.initial_km !== undefined,
        km_not_available: payload.km_not_available || false,
        km_reason: payload.km_reason || null,
        km_observations: payload.km_observations || null,
        initial_cash: finalInitialCash,
        date: todayStr,
        time: new Date().toISOString(),
      },
    })
  } catch (auditErr) {
    console.warn('[Workdays] Audit log warning:', auditErr)
  }

  return resultData
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

  const list = (data ?? []) as unknown as Workday[]
  if (list.length === 0) return []

  const workdayIds = list.map((w) => w.id)
  const courierIds = Array.from(new Set(list.map((w) => w.courier_id)))
  const workDates = Array.from(new Set(list.map((w) => w.work_date)))

  // 1. Carga en lote de tareas completadas
  const { data: batchTasks } = await supabase
    .from('tasks')
    .select('assigned_courier_id, scheduled_date, expected_collection_amount, expected_collection_currency, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
    .in('assigned_courier_id', courierIds)
    .in('scheduled_date', workDates)
    .eq('status', 'completed')

  // 2. Carga en lote de movimientos de caja
  const { data: batchMovements } = await supabase
    .from('cash_movements')
    .select('workday_id, amount, currency, direction, movement_type')
    .in('workday_id', workdayIds)

  return list.map((w) => {
    const wTasks = (batchTasks || []).filter(
      (t) => t.assigned_courier_id === w.courier_id && t.scheduled_date === w.work_date
    )
    const wMovements = (batchMovements || []).filter((m) => m.workday_id === w.id)
    const summary = calculateWorkdayCashSummary(w.initial_cash, wTasks, wMovements)

    return {
      ...w,
      cash_summary: summary,
    }
  })
}
