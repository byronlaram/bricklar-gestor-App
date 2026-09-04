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
    .select('amount, currency, direction, movement_type, description')
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

  // Verificar si ya existen registros de jornada para hoy
  const { data: existingRows } = await supabase
    .from('workdays')
    .select('id, initial_cash, status')
    .eq('courier_id', userId)
    .eq('work_date', todayStr)
    .order('created_at', { ascending: false })

  // Solo reutilizamos una fila existente si está pendiente de apertura (ej. fondo precargado por admin)
  const pendingRow = (existingRows || []).find((r) => r.status === 'pending' || (!r.status && (r.initial_cash || 0) > 0))

  const finalInitialCash = pendingRow && pendingRow.initial_cash > 0
    ? pendingRow.initial_cash
    : (payload.initial_cash ?? 0)

  let combinedNotes = payload.notes || ''
  if (payload.km_not_available && payload.km_reason) {
    const kmNote = `[Kilometraje No Disponible] Motivo: ${payload.km_reason}`
    combinedNotes = combinedNotes ? `${kmNote} | ${combinedNotes}` : kmNote
  }

  // Detectar si es una 2da jornada extraordinaria (si ya existen jornadas cerradas o liquidadas hoy)
  const previousCompletedCount = (existingRows || []).filter(
    (r) => r.status === 'closed' || r.status === 'pending_settlement'
  ).length

  if (previousCompletedCount > 0) {
    const shiftTag = `[Turno Extraordinario #${previousCompletedCount + 1}]`
    combinedNotes = combinedNotes ? `${shiftTag} ${combinedNotes}` : shiftTag
  }

  let resultData: Workday

  if (pendingRow) {
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
      .eq('id', pendingRow.id)
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
  const { branch_id, courier_id, date, date_from, date_to, status } = filters

  let query = supabase
    .from('workdays')
    .select(WORKDAY_SELECT)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (branch_id) query = query.eq('branch_id', branch_id)
  if (courier_id) query = query.eq('courier_id', courier_id)
  if (date) query = query.eq('work_date', date)
  if (date_from) query = query.gte('work_date', date_from)
  if (date_to) query = query.lte('work_date', date_to)
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
    .select('workday_id, amount, currency, direction, movement_type, description')
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

// ─── getCashMovements (Kardex / Flujo de Movimientos de Caja) ─────────────────

export interface DetailedCashMovement {
  id: string
  created_at: string
  workday_id: string
  courier_id: string
  movement_type: string
  direction: 'income' | 'expense'
  amount: number
  currency: string
  payment_method: string
  description: string
  receipt_url: string | null
  task_id: string | null
  courier_profile?: {
    id: string
    full_name: string
    display_name: string | null
    avatar_url: string | null
    phone: string | null
  } | null
  workday?: {
    id: string
    work_date: string
    branch_id: string
    branch?: {
      id: string
      name: string
      code: string
    } | null
  } | null
  task?: {
    id: string
    code: string
    title: string
  } | null
}

export async function getCashMovements(filters: {
  branch_id?: string
  date?: string
  workday_id?: string
  courier_id?: string
} = {}): Promise<DetailedCashMovement[]> {
  let query = supabase
    .from('cash_movements')
    .select(`
      id, created_at, workday_id, courier_id, movement_type, direction, amount, currency, payment_method, description, receipt_url, task_id,
      courier_profile:profiles!cash_movements_courier_id_fkey (id, full_name, display_name, avatar_url, phone),
      workday:workdays!cash_movements_workday_id_fkey (
        id, work_date, branch_id,
        branch:branches!workdays_branch_id_fkey (id, name, code)
      ),
      task:tasks!cash_movements_task_id_fkey (id, code, title)
    `)
    .order('created_at', { ascending: false })

  if (filters.workday_id) {
    query = query.eq('workday_id', filters.workday_id)
  }
  if (filters.courier_id) {
    query = query.eq('courier_id', filters.courier_id)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Workdays] getCashMovements error:', error)
    return []
  }

  let list = (data || []) as unknown as DetailedCashMovement[]

  // Filtrado en memoria por fecha y sucursal
  if (filters.date) {
    list = list.filter((m) => {
      const createdLocalDate = new Date(m.created_at).toLocaleDateString('en-CA')
      const wDate = m.workday?.work_date || createdLocalDate
      return wDate === filters.date || createdLocalDate === filters.date
    })
  }

  if (filters.branch_id && filters.branch_id !== 'all') {
    list = list.filter((m) => m.workday?.branch_id === filters.branch_id)
  }

  return list
}

// ─── voidCashMovement (Anulación / Reverso de Movimientos de Caja) ───────────

export interface VoidCashMovementPayload {
  movementId: string
  reason: string
  adminId: string
  adminName: string
}

export async function voidCashMovement(payload: VoidCashMovementPayload): Promise<void> {
  if (!payload.reason.trim()) {
    throw new Error('Debes ingresar un motivo para anular el movimiento.')
  }

  // 1. Obtener el movimiento original
  const { data: movement, error: movErr } = await supabase
    .from('cash_movements')
    .select('*, workday:workdays!cash_movements_workday_id_fkey(id, initial_cash, status, branch_id)')
    .eq('id', payload.movementId)
    .single()

  if (movErr || !movement) {
    throw new Error(movErr?.message || 'No se encontró el movimiento de caja.')
  }

  if (movement.description?.includes('[ANULADO]')) {
    throw new Error('Este movimiento ya ha sido anulado previamente.')
  }

  const workday = movement.workday as any
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const updatedDesc = `[ANULADO ${nowStr}] ${movement.description || movement.movement_type} (Motivo: ${payload.reason.trim()} | Anulado por: ${payload.adminName})`

  // 2. Marcar el movimiento original como [ANULADO]
  const { error: updateErr } = await supabase
    .from('cash_movements')
    .update({ description: updatedDesc })
    .eq('id', payload.movementId)

  if (updateErr) {
    throw new Error(updateErr.message || 'Error al anular el movimiento.')
  }

  // 3. Si era un fondo inicial reflejado en la tabla workdays, ajustar workdays.initial_cash
  const isInitialCash =
    movement.movement_type === 'initial_cash' ||
    (movement.description && movement.description.toLowerCase().includes('fondo inicial'))

  if (isInitialCash && workday && workday.initial_cash > 0) {
    const newInitialCash = Math.max(0, workday.initial_cash - movement.amount)
    await supabase
      .from('workdays')
      .update({ initial_cash: newInitialCash })
      .eq('id', workday.id)
  }

  // 4. Registrar evento en log_audit_event
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'cash_movement_voided',
      p_entity_type: 'cash_movement',
      p_entity_id: payload.movementId,
      p_entity_code: workday?.id || payload.movementId,
      p_branch_id: workday?.branch_id || undefined,
      p_changes: {
        reason: payload.reason.trim(),
        voided_by: payload.adminName,
        admin_id: payload.adminId,
        original_amount: movement.amount,
        original_type: movement.movement_type,
        original_description: movement.description,
      },
    })
  } catch (auditErr) {
    console.warn('[Audit] Error logging void event:', auditErr)
  }
}

// ─── checkCourierShiftStatus ──────────────────────────────────────────────────
// Evalúa el estado del turno y liquidación de un motorizado para una fecha específica.
// Si la fecha es futura, se permite asignar libremente sin restricciones.

export interface CourierDailyShiftStatus {
  courier_id: string
  date: string
  has_open_workday: boolean
  has_pending_settlement: boolean
  has_closed_workday: boolean
  workdays_count: number
  can_assign_safely: boolean
  warning_message?: string
}

export async function checkCourierShiftStatus(courierId: string, date: string): Promise<CourierDailyShiftStatus> {
  const todayStr = getLocalDateString()

  // 1. Fechas futuras: Total libertad de asignación previa
  if (date > todayStr) {
    return {
      courier_id: courierId,
      date,
      has_open_workday: false,
      has_pending_settlement: false,
      has_closed_workday: false,
      workdays_count: 0,
      can_assign_safely: true,
    }
  }

  // 2. Fecha de hoy o pasada: Consultar jornadas del motorizado
  const { data: workdays, error } = await supabase
    .from('workdays')
    .select('id, status, work_date, created_at')
    .eq('courier_id', courierId)
    .eq('work_date', date)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[Workdays] Error in checkCourierShiftStatus:', error)
    return {
      courier_id: courierId,
      date,
      has_open_workday: false,
      has_pending_settlement: false,
      has_closed_workday: false,
      workdays_count: 0,
      can_assign_safely: true,
    }
  }

  const list = workdays || []
  const hasOpen = list.some((w) => w.status === 'open')
  const hasPendingSettlement = list.some((w) => w.status === 'pending_settlement')
  const hasClosed = list.some((w) => w.status === 'closed')

  let warningMessage: string | undefined
  if (!hasOpen) {
    if (hasPendingSettlement) {
      warningMessage = 'Este motorizado ya envió su liquidación a revisión para hoy. Si le asignas una tarea extraordinaria, se requerirá rechazar la liquidación o abrir una 2da jornada (turno extra).'
    } else if (hasClosed) {
      warningMessage = 'Este motorizado ya cerró y liquidó su jornada de hoy. Si sale a realizar esta tarea, deberá iniciar una 2da jornada extraordinaria en su app.'
    }
  }

  return {
    courier_id: courierId,
    date,
    has_open_workday: hasOpen,
    has_pending_settlement: hasPendingSettlement,
    has_closed_workday: hasClosed,
    workdays_count: list.length,
    can_assign_safely: hasOpen || (!hasPendingSettlement && !hasClosed),
    warning_message: warningMessage,
  }
}

