import { supabase } from '@/shared/lib/supabaseClient'
import { calculateWorkdayCashSummary } from '@/modules/workdays/utils/workdayCalculations'
import { getLocalDateString } from '@/shared/utils/date'
import { broadcastSyncEvent } from '@/shared/lib/realtimeSync'
import { createNotification } from '@/modules/notifications/services/notificationsService'
import type {
  Settlement,
  CashMovement,
  CreateMovementPayload,
  ApproveSettlementPayload,
  RejectSettlementPayload,
  AdminForceSettlementPayload,
  SettlementFilters,
  DailyClosureSummary,
  DailyClosureRecord,
  ConfirmDailyClosurePayload,
} from '../types/settlements.types'

const SETTLEMENT_SELECT = `
  *,
  courier_profile:profiles!settlements_courier_id_fkey (
    id, full_name, display_name, phone, avatar_url
  ),
  branch:branches!settlements_branch_id_fkey (
    id, name, code
  ),
  reviewer_profile:profiles!settlements_reviewed_by_fkey (
    id, full_name, display_name
  )
`

export async function getSettlements(filters: SettlementFilters = {}): Promise<Settlement[]> {
  const { branch_id, courier_id, date, date_from, date_to, status } = filters

  let query = supabase
    .from('settlements')
    .select(SETTLEMENT_SELECT)
    .order('settlement_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (branch_id) query = query.eq('branch_id', branch_id)
  if (courier_id) query = query.eq('courier_id', courier_id)
  if (date) query = query.eq('settlement_date', date)
  if (date_from) query = query.gte('settlement_date', date_from)
  if (date_to) query = query.lte('settlement_date', date_to)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    console.error('[Settlements] getSettlements error:', error)
    throw new Error(error.message)
  }

  const list = (data ?? []) as unknown as Settlement[]
  if (list.length === 0) return []

  const workdayIds = Array.from(new Set(list.map((s) => s.workday_id).filter(Boolean)))
  const courierIds = Array.from(new Set(list.map((s) => s.courier_id).filter(Boolean)))
  const workDates = Array.from(new Set(list.map((s) => s.settlement_date).filter(Boolean)))

  // 1. Obtener jornadas para fondo inicial
  const { data: workdays } = await supabase
    .from('workdays')
    .select('id, initial_cash')
    .in('id', workdayIds)

  const workdayMap = new Map<string, number>()
  ;(workdays || []).forEach((w) => workdayMap.set(w.id, w.initial_cash || 0))

    // 2. Carga en lote de tareas completadas
  const { data: batchTasks } = await supabase
    .from('tasks')
    .select('assigned_courier_id, scheduled_date, expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
    .in('assigned_courier_id', courierIds)
    .in('scheduled_date', workDates)
    .eq('status', 'completed')

  // 3. Carga en lote de movimientos de caja
  const { data: batchMovements } = await supabase
    .from('cash_movements')
    .select('workday_id, amount, currency, direction, movement_type, description')
    .in('workday_id', workdayIds)

  return list.map((s) => {
    const initialCash = workdayMap.get(s.workday_id) || 0
    const sTasks = (batchTasks || []).filter(
      (t) => t.assigned_courier_id === s.courier_id && t.scheduled_date === s.settlement_date
    )
    const sMovements = (batchMovements || []).filter((m) => m.workday_id === s.workday_id)
    const summary = calculateWorkdayCashSummary(initialCash, sTasks, sMovements)
    const liveExpected = Math.max(0, summary.cashInHandNIO)

    const isPending = s.status === 'pending_review' || s.status === 'draft' || s.status === 'observed'
    const expectedCash = isPending ? liveExpected : s.expected_cash
    const actualCash = isPending
      ? (s.actual_cash === s.expected_cash || !s.actual_cash ? liveExpected : s.actual_cash)
      : s.actual_cash
    const difference = isPending ? actualCash - expectedCash : s.difference

    return {
      ...s,
      expected_cash: expectedCash,
      actual_cash: actualCash,
      difference: difference,
      total_expenses: isPending ? summary.expensesNIO : s.total_expenses,
      cash_summary: summary,
    }
  })
}

export async function getSettlementById(id: string): Promise<Settlement> {
  const { data, error } = await supabase
    .from('settlements')
    .select(SETTLEMENT_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    console.error('[Settlements] getSettlementById error:', error)
    throw new Error(error.message)
  }

  const s = data as unknown as Settlement

  // Obtener jornada, tareas y movimientos
  const { data: workday } = await supabase
    .from('workdays')
    .select('initial_cash')
    .eq('id', s.workday_id)
    .single()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('assigned_courier_id, scheduled_date, expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
    .eq('assigned_courier_id', s.courier_id)
    .eq('scheduled_date', s.settlement_date)
    .eq('status', 'completed')

  const { data: movements } = await supabase
    .from('cash_movements')
    .select('workday_id, amount, currency, direction, movement_type, description')
    .eq('workday_id', s.workday_id)

  const summary = calculateWorkdayCashSummary(workday?.initial_cash || 0, tasks || [], movements || [])
  const isPending = s.status === 'pending_review' || s.status === 'draft' || s.status === 'observed'
  const liveExpected = Math.max(0, summary.cashInHandNIO)
  const expectedCash = isPending ? liveExpected : s.expected_cash
  const actualCash = isPending
    ? (s.actual_cash === s.expected_cash || !s.actual_cash ? liveExpected : s.actual_cash)
    : s.actual_cash
  const difference = isPending ? actualCash - expectedCash : s.difference

  return {
    ...s,
    expected_cash: expectedCash,
    actual_cash: actualCash,
    difference: difference,
    total_expenses: isPending ? summary.expensesNIO : s.total_expenses,
    cash_summary: summary,
  }
}

export async function getSettlementByWorkday(workdayId: string): Promise<Settlement | null> {
  const { data, error } = await supabase
    .from('settlements')
    .select(SETTLEMENT_SELECT)
    .eq('workday_id', workdayId)
    .maybeSingle()

  if (error) {
    console.error('[Settlements] getSettlementByWorkday error:', error)
    throw new Error(error.message)
  }

  if (!data) return null
  const s = data as unknown as Settlement

  const { data: workday } = await supabase
    .from('workdays')
    .select('initial_cash')
    .eq('id', s.workday_id)
    .single()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('assigned_courier_id, scheduled_date, expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
    .eq('assigned_courier_id', s.courier_id)
    .eq('scheduled_date', s.settlement_date)
    .eq('status', 'completed')

  const { data: movements } = await supabase
    .from('cash_movements')
    .select('workday_id, amount, currency, direction, movement_type, description')
    .eq('workday_id', s.workday_id)

  const summary = calculateWorkdayCashSummary(workday?.initial_cash || 0, tasks || [], movements || [])
  const isPending = s.status === 'pending_review' || s.status === 'draft' || s.status === 'observed'
  const liveExpected = Math.max(0, summary.cashInHandNIO)
  const expectedCash = isPending ? liveExpected : s.expected_cash
  const actualCash = isPending
    ? (s.actual_cash === s.expected_cash || !s.actual_cash ? liveExpected : s.actual_cash)
    : s.actual_cash
  const difference = isPending ? actualCash - expectedCash : s.difference

  return {
    ...s,
    expected_cash: expectedCash,
    actual_cash: actualCash,
    difference: difference,
    total_expenses: isPending ? summary.expensesNIO : s.total_expenses,
    cash_summary: summary,
  }
}


export async function submitSettlement(workdayId: string, notes?: string): Promise<Settlement> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa.')

  // Obtener la jornada para branch_id, courier_id y work_date
  const { data: workday, error: workdayErr } = await supabase
    .from('workdays')
    .select('id, branch_id, courier_id, work_date, initial_cash')
    .eq('id', workdayId)
    .single()

  if (workdayErr || !workday) throw new Error('Jornada laboral no encontrada.')

  const targetCourierId = workday.courier_id || userId

  // Calcular cobros y pagos de tareas completadas de esta jornada/motorizado
  const { data: tasks } = await supabase
    .from('tasks')
    .select('expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
    .eq('assigned_courier_id', targetCourierId)
    .eq('scheduled_date', workday.work_date)
    .eq('status', 'completed')

  // Obtener movimientos de caja de esta jornada
  const { data: movements } = await supabase
    .from('cash_movements')
    .select('amount, currency, direction, movement_type, description')
    .eq('workday_id', workdayId)

  const cashSummary = calculateWorkdayCashSummary(
    workday.initial_cash ?? 0,
    tasks || [],
    movements || []
  )

  const expectedCashNet = Math.max(0, cashSummary.cashInHandNIO)
  const totalExpenses = cashSummary.expensesNIO
  const totalExpectedTransfers = (tasks || []).reduce((acc, t) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pb = (t as any).metadata?.payment_breakdown
    if (pb?.transfer_amount && pb.transfer_amount > 0) return acc + pb.transfer_amount
    if (
      t.requires_collection &&
      t.expected_payment_method &&
      t.expected_payment_method !== 'cash' &&
      (!pb || !pb.cash_amount)
    ) {
      return acc + (t.expected_collection_amount || 0)
    }
    return acc
  }, 0)

  const insertData = {
    workday_id: workdayId,
    courier_id: targetCourierId,
    branch_id: workday.branch_id,
    settlement_date: workday.work_date,
    status: 'pending_review',
    expected_cash: expectedCashNet,
    actual_cash: expectedCashNet, // Borrador inicial igual al esperado real
    expected_transfers: totalExpectedTransfers,
    actual_transfers: totalExpectedTransfers,
    total_expenses: totalExpenses,
    difference: 0,
    notes: notes ?? null,
  }

  const { data, error } = await supabase
    .from('settlements')
    .upsert(insertData, { onConflict: 'workday_id' })
    .select(SETTLEMENT_SELECT)
    .single()

  if (error) {
    console.error('[Settlements] submitSettlement error:', error)
    throw new Error(error.message)
  }

  return data as unknown as Settlement
}


export async function approveSettlement(payload: ApproveSettlementPayload): Promise<Settlement> {
  const { data: session } = await supabase.auth.getSession()
  const adminId = session?.session?.user?.id
  if (!adminId) throw new Error('No hay sesión activa.')

  const { data: current, error: getErr } = await supabase
    .from('settlements')
    .select('expected_cash, workday_id, courier_id, settlement_date')
    .eq('id', payload.settlement_id)
    .single()

  if (getErr) throw new Error(getErr.message)

  const currentStl = current as { expected_cash: number; workday_id?: string; courier_id?: string; settlement_date?: string }
  const workdayId = currentStl.workday_id
  const courierId = currentStl.courier_id
  const settlementDate = currentStl.settlement_date

  // Recalcular saldo esperado en tiempo real para asegurar exactitud financiera
  let expectedCash = currentStl.expected_cash
  let totalExpenses = 0
  if (workdayId && courierId && settlementDate) {
    const { data: wd } = await supabase.from('workdays').select('initial_cash').eq('id', workdayId).single()
    const { data: tasks } = await supabase
      .from('tasks')
      .select('expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
      .eq('assigned_courier_id', courierId)
      .eq('scheduled_date', settlementDate)
      .eq('status', 'completed')
    const { data: movements } = await supabase
      .from('cash_movements')
      .select('amount, currency, direction, movement_type, description')
      .eq('workday_id', workdayId)
    const summary = calculateWorkdayCashSummary(wd?.initial_cash || 0, tasks || [], movements || [])
    expectedCash = Math.max(0, summary.cashInHandNIO)
    totalExpenses = summary.expensesNIO
  }

  const difference = payload.actual_cash - expectedCash

  const { data, error } = await supabase
    .from('settlements')
    .update({
      expected_cash: expectedCash,
      total_expenses: totalExpenses > 0 ? totalExpenses : undefined,
      actual_cash: payload.actual_cash,
      actual_transfers: payload.actual_transfers ?? 0,
      difference,
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      notes: payload.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.settlement_id)
    .select(SETTLEMENT_SELECT)
    .single()

  if (error) {
    console.error('[Settlements] approveSettlement error:', error)
    throw new Error(error.message)
  }

  // 1. Cerrar la jornada en workdays
  if (workdayId) {
    const { error: wdErr } = await supabase
      .from('workdays')
      .update({
        status: 'closed',
        closed_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workdayId)

    if (wdErr) {
      console.warn('[Settlements] Warning: could not close workday on settlement approval:', wdErr.message)
    }

    // 2. Registrar en Libro Diario de Movimientos (cash_movements) la entrega final de liquidación
    if (payload.actual_cash > 0) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', adminId)
        .maybeSingle()

      const adminName = adminProfile?.display_name || adminProfile?.full_name || 'Administrador'
      const settlementDesc = `Entrega Final de Cierre (Liquidación aprobada)${payload.notes ? `: ${payload.notes.trim()}` : ''} | Reg. por: ${adminName}`

      // Limpiar movimiento de liquidación previo si existía (en caso de re-aprobación)
      await supabase
        .from('cash_movements')
        .delete()
        .eq('workday_id', workdayId)
        .eq('movement_type', 'settlement_payment')

      const { error: movErr } = await supabase.from('cash_movements').insert({
        workday_id: workdayId,
        courier_id: (data as any).courier_id,
        movement_type: 'settlement_payment',
        direction: 'income',
        amount: payload.actual_cash,
        currency: 'NIO',
        payment_method: 'cash',
        description: settlementDesc,
      })

      if (movErr) {
        console.warn('[Settlements] Warning: could not insert cash_movement for settlement:', movErr.message)
      }
    }
  }

  // Si existe una diferencia contable, registrar formalmente el ajuste en settlement_adjustments
  if (Math.abs(difference) > 0.001) {
    const reasonPrefixMap: Record<string, string> = {
      faltante_descuento_nomina: 'Faltante — A deducir en nómina',
      faltante_reponer_manana: 'Faltante — A reponer por motorizado',
      sobrante_propina: 'Sobrante — Propina / Redondeo a favor',
      redondeo_cambio: 'Diferencia por redondeo / vuelto',
      otro: 'Ajuste operativo',
    }

    const typeTitle = payload.adjustment_reason_type
      ? reasonPrefixMap[payload.adjustment_reason_type] || 'Ajuste de Liquidación'
      : difference > 0
        ? 'Sobrante en Liquidación'
        : 'Faltante en Liquidación'

    const fullReason = payload.adjustment_notes
      ? `[${typeTitle}] ${payload.adjustment_notes}`
      : payload.notes
        ? `[${typeTitle}] ${payload.notes}`
        : typeTitle

    // Limpiar ajustes previos si existían para esta liquidación (en caso de re-aprobación)
    await supabase
      .from('settlement_adjustments')
      .delete()
      .eq('settlement_id', payload.settlement_id)

    const { error: adjError } = await supabase.from('settlement_adjustments').insert({
      settlement_id: payload.settlement_id,
      adjusted_by: adminId,
      adjustment_amount: difference,
      reason: fullReason,
    })

    if (adjError) {
      console.warn('[Settlements] Warning: could not persist settlement_adjustment:', adjError.message)
    }
  }

  // Notificar al motorizado sobre la aprobación de su liquidación
  if ((data as any)?.courier_id && (data as any).courier_id !== adminId) {
    await createNotification({
      userId: (data as any).courier_id,
      title: 'Liquidación Aprobada',
      body: `Tu liquidación del día ${(data as any).settlement_date} ha sido aprobada formalmente por caja.`,
      type: 'settlement',
      workdayId: (data as any).workday_id,
      branchId: (data as any).branch_id,
      createdBy: adminId,
    })
  }

  return data as unknown as Settlement
}

export async function rejectSettlement(payload: RejectSettlementPayload): Promise<Settlement> {
  const { data: session } = await supabase.auth.getSession()
  const adminId = session?.session?.user?.id
  if (!adminId) throw new Error('No hay sesión activa.')

  const { data: current, error: getErr } = await supabase
    .from('settlements')
    .select('workday_id, courier_id, notes, settlement_date, branch_id')
    .eq('id', payload.settlement_id)
    .single()

  if (getErr) throw new Error(getErr.message)

  const workdayId = current?.workday_id
  const reasonText = payload.reason.trim()
  const formattedNotes = `[OBSERVACIÓN / DEVUELTA]: ${reasonText}`

  const { data, error } = await supabase
    .from('settlements')
    .update({
      status: 'observed',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      notes: formattedNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.settlement_id)
    .select(SETTLEMENT_SELECT)
    .single()

  if (error) {
    console.error('[Settlements] rejectSettlement error:', error)
    throw new Error(error.message)
  }

  // Devolver la jornada laboral a estado "open" para que el motorizado pueda corregir y reenviar
  if (workdayId) {
    const { error: wdErr } = await supabase
      .from('workdays')
      .update({
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', workdayId)

    if (wdErr) {
      console.warn('[Settlements] Warning: could not update workday status to open on reject:', wdErr.message)
    }
  }

  // Notificar al motorizado sobre la observación/rechazo de liquidación
  const targetCourierId = current?.courier_id || (data as any)?.courier_id
  if (targetCourierId && targetCourierId !== adminId) {
    await createNotification({
      userId: targetCourierId,
      title: 'Liquidación Observada',
      body: `Tu liquidación del día ${current?.settlement_date || (data as any)?.settlement_date} requiere revisión: ${reasonText}`,
      type: 'warning',
      workdayId: workdayId,
      branchId: current?.branch_id || (data as any)?.branch_id,
      createdBy: adminId,
    })
  }

  return data as unknown as Settlement
}

export async function adminForceSettlement(payload: AdminForceSettlementPayload): Promise<Settlement> {
  const { data: session } = await supabase.auth.getSession()
  const adminId = session?.session?.user?.id
  if (!adminId) throw new Error('No hay sesión activa.')

  // 1. Obtener la jornada
  const { data: workday, error: wdErr } = await supabase
    .from('workdays')
    .select('id, branch_id, courier_id, work_date, initial_cash, notes')
    .eq('id', payload.workday_id)
    .single()

  if (wdErr || !workday) throw new Error('Jornada no encontrada.')

  // 2. Obtener tareas y movimientos en tiempo real
  const { data: tasks } = await supabase
    .from('tasks')
    .select('expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
    .eq('assigned_courier_id', workday.courier_id)
    .eq('scheduled_date', workday.work_date)
    .eq('status', 'completed')

  const { data: movements } = await supabase
    .from('cash_movements')
    .select('amount, currency, direction, movement_type, description')
    .eq('workday_id', workday.id)

  const cashSummary = calculateWorkdayCashSummary(
    workday.initial_cash ?? 0,
    tasks || [],
    movements || []
  )

  const expectedCashNet = Math.max(0, cashSummary.cashInHandNIO)
  const totalExpenses = cashSummary.expensesNIO
  const totalExpectedTransfers = (tasks || []).reduce((acc, t) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pb = (t as any).metadata?.payment_breakdown
    if (pb?.transfer_amount && pb.transfer_amount > 0) return acc + pb.transfer_amount
    if (
      t.requires_collection &&
      t.expected_payment_method &&
      t.expected_payment_method !== 'cash' &&
      (!pb || !pb.cash_amount)
    ) {
      return acc + (t.expected_collection_amount || 0)
    }
    return acc
  }, 0)

  const difference = payload.actual_cash - expectedCashNet

  const contingencyLabelMap: Record<string, string> = {
    telefono_danado_apagado: 'Celular de motorizado dañado o sin batería',
    sin_senal_datos: 'Sin cobertura de datos móviles',
    extravio_robo: 'Extravío o robo de equipo celular',
    entrega_directa_oficina: 'Entrega física directa de valores en oficina',
    otro: 'Contingencia operativa',
  }

  const reasonLabel = contingencyLabelMap[payload.contingency_reason] || payload.contingency_reason
  const adminAuditNote = `[Liquidación Administrativa por Contingencia: ${reasonLabel}]${payload.contingency_notes ? ` - ${payload.contingency_notes}` : ''}`

  // 3. Upsert settlement en estado 'approved'
  const settlementData = {
    workday_id: workday.id,
    courier_id: workday.courier_id,
    branch_id: workday.branch_id,
    settlement_date: workday.work_date,
    status: 'approved',
    expected_cash: expectedCashNet,
    actual_cash: payload.actual_cash,
    expected_transfers: totalExpectedTransfers,
    actual_transfers: payload.actual_transfers ?? totalExpectedTransfers,
    total_expenses: totalExpenses,
    difference,
    notes: adminAuditNote,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: settlement, error: stlErr } = await supabase
    .from('settlements')
    .upsert(settlementData, { onConflict: 'workday_id' })
    .select(SETTLEMENT_SELECT)
    .single()

  if (stlErr) {
    console.error('[Settlements] adminForceSettlement error:', stlErr)
    throw new Error(stlErr.message)
  }

  // 4. Si hay diferencia, registrar el ajuste en settlement_adjustments
  if (Math.abs(difference) > 0.001) {
    const reasonPrefixMap: Record<string, string> = {
      faltante_descuento_nomina: 'Faltante — A deducir en nómina',
      faltante_reponer_manana: 'Faltante — A reponer por motorizado',
      sobrante_propina: 'Sobrante — Propina / Redondeo a favor',
      redondeo_cambio: 'Diferencia por redondeo / vuelto',
      otro: 'Ajuste operativo',
    }

    const typeTitle = payload.adjustment_reason_type
      ? reasonPrefixMap[payload.adjustment_reason_type] || 'Ajuste de Liquidación'
      : difference > 0
        ? 'Sobrante en Liquidación'
        : 'Faltante en Liquidación'

    const fullReason = payload.adjustment_notes
      ? `[${typeTitle}] ${payload.adjustment_notes} (${adminAuditNote})`
      : `[${typeTitle}] ${adminAuditNote}`

    await supabase
      .from('settlement_adjustments')
      .delete()
      .eq('settlement_id', (settlement as any).id)

    await supabase.from('settlement_adjustments').insert({
      settlement_id: (settlement as any).id,
      adjusted_by: adminId,
      adjustment_amount: difference,
      reason: fullReason,
    })
  }

  // 5. Cerrar la jornada en workdays
  const existingNotes = workday.notes ? `${workday.notes} | ` : ''
  await supabase
    .from('workdays')
    .update({
      status: 'closed',
      notes: `${existingNotes}${adminAuditNote}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workday.id)

  // 6. Registrar en Libro Diario de Movimientos (cash_movements)
  if (payload.actual_cash > 0) {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', adminId)
      .maybeSingle()

    const adminName = adminProfile?.display_name || adminProfile?.full_name || 'Administrador'
    const contingencyDesc = `Entrega Final de Cierre (Liquidación Contingencia: ${reasonLabel})${payload.contingency_notes ? `: ${payload.contingency_notes.trim()}` : ''} | Reg. por: ${adminName}`

    await supabase
      .from('cash_movements')
      .delete()
      .eq('workday_id', workday.id)
      .eq('movement_type', 'settlement_payment')

    const { error: movErr } = await supabase.from('cash_movements').insert({
      workday_id: workday.id,
      courier_id: workday.courier_id,
      movement_type: 'settlement_payment',
      direction: 'income',
      amount: payload.actual_cash,
      currency: 'NIO',
      payment_method: 'cash',
      description: contingencyDesc,
    })

    if (movErr) {
      console.warn('[Settlements] Warning: could not insert cash_movement for force settlement:', movErr.message)
    }
  }

  return settlement as unknown as Settlement
}

export async function getSettlementAdjustments(params: {

  branchIds?: string[]
  from?: string
  to?: string
  courierId?: string
}) {
  let query = supabase
    .from('settlement_adjustments')
    .select(`
      id,
      settlement_id,
      adjusted_by,
      adjustment_amount,
      reason,
      created_at,
      settlement:settlements!settlement_adjustments_settlement_id_fkey (
        id,
        settlement_date,
        expected_cash,
        actual_cash,
        branch_id,
        courier_id,
        courier:profiles!settlements_courier_id_fkey (
          id,
          full_name,
          display_name
        ),
        branch:branches!settlements_branch_id_fkey (
          id,
          name
        )
      ),
      adjuster:profiles!settlement_adjustments_adjusted_by_fkey (
        id,
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (params.from) {
    query = query.gte('created_at', `${params.from}T00:00:00`)
  }
  if (params.to) {
    query = query.lte('created_at', `${params.to}T23:59:59`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Settlements] getSettlementAdjustments error:', error)
    throw new Error(error.message)
  }

  let results = data ?? []

  if (params.branchIds && params.branchIds.length > 0) {
    results = results.filter((item: any) =>
      params.branchIds!.includes(item.settlement?.branch_id)
    )
  }

  if (params.courierId) {
    results = results.filter((item: any) =>
      item.settlement?.courier_id === params.courierId
    )
  }

  return results
}


export async function getCashMovements(workdayId: string): Promise<CashMovement[]> {
  const { data, error } = await supabase
    .from('cash_movements')
    .select(`
      *,
      courier_profile:profiles!cash_movements_courier_id_fkey (full_name)
    `)
    .eq('workday_id', workdayId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Settlements] getCashMovements error:', error)
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as CashMovement[]
}

export async function createCashMovement(payload: CreateMovementPayload): Promise<CashMovement> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa.')

  const insertData = {
    workday_id: payload.workday_id,
    courier_id: userId,
    movement_type: payload.movement_type,
    direction: payload.direction,
    amount: payload.amount,
    currency: payload.currency ?? 'NIO',
    payment_method: payload.payment_method ?? 'cash',
    description: payload.description,
    receipt_url: payload.receipt_url ?? null,
  }

  const { data, error } = await supabase
    .from('cash_movements')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('[Settlements] createCashMovement error:', error)
    throw new Error(error.message)
  }

  return data as unknown as CashMovement
}

export async function getDailyClosure(
  branchId: string | undefined,
  date: string
): Promise<DailyClosureSummary> {
  const { data: session } = await supabase.auth.getSession()
  if (!session?.session?.user?.id) throw new Error('No hay sesión activa.')

  // 1. Consultar si ya existe un registro congelado en daily_closures
  let closureRecordQuery = supabase
    .from('daily_closures')
    .select(`
      *,
      branch:branches!daily_closures_branch_id_fkey (id, name),
      closed_by_profile:profiles!daily_closures_closed_by_fkey (id, full_name, display_name)
    `)
    .eq('closure_date', date)

  if (branchId) {
    closureRecordQuery = closureRecordQuery.eq('branch_id', branchId)
  }

  const { data: rawClosureRecords } = await closureRecordQuery.limit(1)
  const savedClosure = (rawClosureRecords?.[0] as unknown as DailyClosureRecord) || null

  // 2. Obtener todas las jornadas del día
  let query = supabase
    .from('workdays')
    .select(`
      *,
      courier_profile:profiles!workdays_courier_id_fkey (
        id, full_name, display_name, phone, avatar_url
      ),
      branch:branches!workdays_branch_id_fkey (
        id, name, code
      )
    `)
    .eq('work_date', date)

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data: rawWorkdays } = await query
  const workdaysList = (rawWorkdays || []) as any[]

  // 3. Carga en lote de tareas y movimientos de caja
  const workdayIds = workdaysList.map((w) => w.id)
  const courierIds = Array.from(new Set(workdaysList.map((w) => w.courier_id)))

  const { data: batchTasks } = await supabase
    .from('tasks')
    .select('assigned_courier_id, scheduled_date, expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
    .in('assigned_courier_id', courierIds.length > 0 ? courierIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('scheduled_date', date)
    .eq('status', 'completed')

  // Conteo total y estados de todas las tareas del día
  let allDayTasksQuery = supabase
    .from('tasks')
    .select('id, status, expected_collection_amount, expected_collection_currency, requires_collection')
    .eq('scheduled_date', date)

  if (branchId) {
    allDayTasksQuery = allDayTasksQuery.eq('branch_id', branchId)
  }

  const { data: allDayTasks } = await allDayTasksQuery
  const tasksSummary = {
    total: allDayTasks?.length || 0,
    completed: allDayTasks?.filter((t) => t.status === 'completed').length || 0,
    cancelled: allDayTasks?.filter((t) => t.status === 'cancelled').length || 0,
    not_completed: allDayTasks?.filter((t) => t.status === 'not_completed' || t.status === 'pending' || t.status === 'assigned' || t.status === 'en_route' || t.status === 'in_progress').length || 0,
    expected_nio: (allDayTasks || [])
      .filter((t) => t.requires_collection && (t.expected_collection_currency === 'NIO' || !t.expected_collection_currency))
      .reduce((acc, t) => acc + (t.expected_collection_amount || 0), 0),
    expected_usd: (allDayTasks || [])
      .filter((t) => t.requires_collection && t.expected_collection_currency === 'USD')
      .reduce((acc, t) => acc + (t.expected_collection_amount || 0), 0),
  }

  const { data: batchMovements } = await supabase
    .from('cash_movements')
    .select('workday_id, amount, currency, direction, movement_type, description')
    .in('workday_id', workdayIds.length > 0 ? workdayIds : ['00000000-0000-0000-0000-000000000000'])

  // 4. Liquidaciones registradas para este día
  let settlementsQuery = supabase
    .from('settlements')
    .select(SETTLEMENT_SELECT)
    .eq('settlement_date', date)

  if (branchId) {
    settlementsQuery = settlementsQuery.eq('branch_id', branchId)
  }

  const { data: rawSettlements } = await settlementsQuery
  const settlements = (rawSettlements || []) as Settlement[]

  const settlementMap = new Map<string, Settlement>()
  settlements.forEach((s) => settlementMap.set(s.workday_id, s))

  const enrichedWorkdays = workdaysList.map((w) => {
    const wTasks = (batchTasks || []).filter((t) => t.assigned_courier_id === w.courier_id)
    const wMovements = (batchMovements || []).filter((m) => m.workday_id === w.id)
    const summary = calculateWorkdayCashSummary(w.initial_cash || 0, wTasks, wMovements)
    return {
      ...w,
      cash_summary: summary,
    }
  })

  const totalWorkdays = enrichedWorkdays.length
  const totalInitialCash = enrichedWorkdays.reduce(
    (acc, w) => acc + (w.initial_cash || 0) + (w.cash_summary?.advancesNIO || 0),
    0
  )
  const totalCollectionsCash = enrichedWorkdays.reduce(
    (acc, w) => acc + (w.cash_summary?.collectionsNIO ?? 0),
    0
  )
  const totalCollectionsTransfer = (batchTasks || []).reduce((acc, t) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pb = (t as any).metadata?.payment_breakdown
    if (pb?.transfer_amount && pb.transfer_amount > 0) return acc + pb.transfer_amount
    if (
      t.requires_collection &&
      t.expected_payment_method &&
      t.expected_payment_method !== 'cash' &&
      (!pb || !pb.cash_amount)
    ) {
      return acc + (t.expected_collection_amount || 0)
    }
    return acc
  }, 0)
  const totalExpenses = enrichedWorkdays.reduce(
    (acc, w) => acc + (w.cash_summary?.expensesNIO ?? 0),
    0
  )
  const totalAlreadyReceived = enrichedWorkdays.reduce(
    (acc, w) => acc + (w.cash_summary?.alreadyReceivedNIO ?? 0),
    0
  )

  // Total físico en caja: Entregas parciales en ventanilla + Liquidaciones aprobadas
  const netReceivedInCash = enrichedWorkdays.reduce((acc, w) => {
    const s = settlementMap.get(w.id)
    const priorReceived = w.cash_summary?.alreadyReceivedNIO ?? 0
    const finalSettlementReceived = s && s.status === 'approved' ? s.actual_cash : 0
    return acc + priorReceived + finalSettlementReceived
  }, 0)

  const workdaysDetail = enrichedWorkdays.map((w) => {
    const s = settlementMap.get(w.id)
    return {
      workdayId: w.id,
      courierName: w.courier_profile?.display_name || w.courier_profile?.full_name || 'Motorizado',
      branchName: w.branch?.name || 'Sucursal',
      status: w.status,
      settlementStatus: s?.status || null,
      initialCash: (w.initial_cash || 0) + (w.cash_summary?.advancesNIO || 0),
      collections: w.cash_summary?.collectionsNIO || 0,
      expenses: w.cash_summary?.expensesNIO || 0,
      alreadyReceived: w.cash_summary?.alreadyReceivedNIO || 0,
      pendingCash: w.cash_summary?.cashInHandNIO || 0,
      deliveredCash: s?.actual_cash ?? null,
    }
  })

  return {
    branch_id: branchId || '',
    date,
    total_workdays: totalWorkdays,
    total_initial_cash: totalInitialCash,
    total_collections_cash: totalCollectionsCash,
    total_collections_transfer: totalCollectionsTransfer,
    total_expenses: totalExpenses,
    total_already_received: totalAlreadyReceived,
    net_cash_in_hand: savedClosure?.total_delivered_nio ?? netReceivedInCash,
    tasks_summary: tasksSummary,
    saved_closure: savedClosure,
    workdays_detail: workdaysDetail,
  }
}

export async function confirmDailyClosure(
  params: ConfirmDailyClosurePayload
): Promise<DailyClosureRecord | null> {
  const { data: session } = await supabase.auth.getSession()
  const adminId = session?.session?.user?.id
  if (!adminId) throw new Error('No hay sesión activa.')

  // Resolver branch_id si no fue especificado
  let targetBranchId = params.branchId
  if (!targetBranchId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('primary_branch_id')
      .eq('id', adminId)
      .single()
    targetBranchId = profile?.primary_branch_id || undefined
  }

  if (!targetBranchId) {
    const { data: firstBranch } = await supabase
      .from('branches')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()
    targetBranchId = firstBranch?.id
  }

  if (!targetBranchId) {
    throw new Error('No se pudo determinar la sucursal para el cierre diario.')
  }

  // 1. Obtener cálculo consolidado previo del día
  const summary = await getDailyClosure(targetBranchId, params.date)

  // 2. Cerrar formalmente todas las jornadas del día
  let workdaysUpdate = supabase
    .from('workdays')
    .update({
      status: 'closed',
      closed_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('work_date', params.date)
    .in('status', ['open', 'pending_settlement', 'reviewed'])

  if (targetBranchId) {
    workdaysUpdate = workdaysUpdate.eq('branch_id', targetBranchId)
  }

  const { error: workdaysErr } = await workdaysUpdate
  if (workdaysErr) {
    console.error('[Settlements] confirmDailyClosure workdays error:', workdaysErr)
    throw new Error(workdaysErr.message)
  }

  // 3. Persistir en la tabla daily_closures
  const now = new Date().toISOString()
  const closurePayload = {
    branch_id: targetBranchId,
    closure_date: params.date,
    status: 'closed',
    closed_at: now,
    closed_by: adminId,
    created_by: adminId,
    notes: params.notes || null,
    tasks_total: summary.tasks_summary?.total || 0,
    tasks_completed: summary.tasks_summary?.completed || 0,
    tasks_cancelled: summary.tasks_summary?.cancelled || 0,
    tasks_not_completed: summary.tasks_summary?.not_completed || 0,
    total_expected_nio: summary.tasks_summary?.expected_nio || 0,
    total_expected_usd: summary.tasks_summary?.expected_usd || 0,
    total_collections_nio: summary.total_collections_cash + summary.total_collections_transfer,
    total_collections_usd: 0,
    total_payments_nio: summary.total_expenses,
    total_payments_usd: 0,
    total_delivered_nio: params.deliveredNio ?? summary.net_cash_in_hand,
    total_delivered_usd: params.deliveredUsd ?? 0,
    total_difference_nio: 0,
    total_difference_usd: 0,
    workdays_count: summary.total_workdays,
    updated_at: now,
    updated_by: adminId,
  }

  let savedRecord: DailyClosureRecord | null = null

  // Verificar si ya existía para hacer update o insert
  const { data: existingClosure } = await supabase
    .from('daily_closures')
    .select('id')
    .eq('closure_date', params.date)
    .eq('branch_id', targetBranchId)
    .maybeSingle()

  if (existingClosure?.id) {
    const { data: updated, error: updateErr } = await supabase
      .from('daily_closures')
      .update(closurePayload)
      .eq('id', existingClosure.id)
      .select(`
        *,
        branch:branches!daily_closures_branch_id_fkey (id, name),
        closed_by_profile:profiles!daily_closures_closed_by_fkey (id, full_name, display_name)
      `)
      .single()

    if (updateErr) {
      console.error('[Settlements] Error updating daily_closures:', updateErr)
      throw new Error(updateErr.message)
    }
    savedRecord = updated as unknown as DailyClosureRecord
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('daily_closures')
      .insert(closurePayload)
      .select(`
        *,
        branch:branches!daily_closures_branch_id_fkey (id, name),
        closed_by_profile:profiles!daily_closures_closed_by_fkey (id, full_name, display_name)
      `)
      .single()

    if (insertErr) {
      console.error('[Settlements] Error inserting daily_closures:', insertErr)
      throw new Error(insertErr.message)
    }
    savedRecord = inserted as unknown as DailyClosureRecord
  }

  // 4. Registrar en auditoría
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'daily_closure_confirmed',
      p_entity_type: 'daily_closure',
      p_entity_id: savedRecord?.id || params.date,
      p_entity_code: params.date,
      p_branch_id: targetBranchId,
      p_changes: {
        admin_id: adminId,
        date: params.date,
        branch_id: targetBranchId,
        notes: params.notes || null,
        net_cash_in_hand: summary.net_cash_in_hand,
        workdays_count: summary.total_workdays,
        tasks_total: summary.tasks_summary?.total || 0,
        timestamp: now,
      },
    })
  } catch (auditErr) {
    console.warn('[Settlements] Daily closure audit log warning:', auditErr)
  }

  // 5. Broadcast en tiempo real para actualizar todos los paneles
  broadcastSyncEvent('settlements', 'update', {
    entityId: savedRecord?.id || params.date,
  })

  return savedRecord
}



export interface PendingBalanceBreakdown {
  workdayId?: string
  workDate: string
  amount: number
  status: 'unclosed_workday' | 'pending_settlement' | 'unapproved_settlement'
  reason: string
}

export interface CourierPendingBalancesSummary {
  courierId: string
  courierName?: string
  totalPendingCash: number
  hasPendingBalances: boolean
  unclosedWorkdaysCount: number
  breakdown: PendingBalanceBreakdown[]
}

export async function getCourierPendingBalances(
  courierId: string,
  beforeDate?: string
): Promise<CourierPendingBalancesSummary> {
  const currentDate = beforeDate || getLocalDateString()

  // 1. Obtener jornadas pasadas del motorizado
  const { data: pastWorkdays, error: workdaysErr } = await supabase
    .from('workdays')
    .select('id, work_date, status, initial_cash, branch_id')
    .eq('courier_id', courierId)
    .lt('work_date', currentDate)
    .order('work_date', { ascending: true })

  if (workdaysErr) {
    console.error('[Settlements] Error fetching past workdays:', workdaysErr)
    return {
      courierId,
      totalPendingCash: 0,
      hasPendingBalances: false,
      unclosedWorkdaysCount: 0,
      breakdown: [],
    }
  }

  // 2. Obtener liquidaciones pasadas
  const { data: settlements, error: settlementsErr } = await supabase
    .from('settlements')
    .select('id, workday_id, settlement_date, status, expected_cash, actual_cash, difference')
    .eq('courier_id', courierId)
    .lt('settlement_date', currentDate)

  if (settlementsErr) {
    console.error('[Settlements] Error fetching past settlements:', settlementsErr)
  }

  const settlementsByWorkday = new Map<string, any>()
  const settlementsByDate = new Map<string, any>()
  ;(settlements || []).forEach((s) => {
    if (s.workday_id) settlementsByWorkday.set(s.workday_id, s)
    if (s.settlement_date) settlementsByDate.set(s.settlement_date, s)
  })

  const breakdown: PendingBalanceBreakdown[] = []
  let totalPendingCash = 0
  let unclosedWorkdaysCount = 0

  for (const wd of pastWorkdays || []) {
    const settlement = settlementsByWorkday.get(wd.id) || settlementsByDate.get(wd.work_date)
    const isApproved = settlement && settlement.status === 'approved'

    // Si ya está aprobada por el administrador, este día quedó formalmente liquidado en caja
    if (isApproved) continue

    // Si la jornada nunca se cerró
    if (wd.status === 'open') {
      unclosedWorkdaysCount++
    }

    // Calcular tareas y movimientos en tiempo real para este día
    const { data: dayTasks } = await supabase
      .from('tasks')
      .select('expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status, metadata')
      .eq('assigned_courier_id', courierId)
      .eq('scheduled_date', wd.work_date)
      .eq('status', 'completed')

    const { data: dayMovements } = await supabase
      .from('cash_movements')
      .select('amount, currency, direction, movement_type, description')
      .eq('workday_id', wd.id)

    // Usar la función centralizada de cálculo en tiempo real
    const cashSummary = calculateWorkdayCashSummary(
      wd.initial_cash || 0,
      dayTasks || [],
      dayMovements || []
    )

    const dayPendingAmount = Math.max(0, cashSummary.cashInHandNIO)

    let statusType: PendingBalanceBreakdown['status'] = 'unclosed_workday'
    let reason = 'Jornada no cerrada ni liquidada al finalizar el día'

    if (settlement && settlement.status === 'pending_review') {
      statusType = 'pending_settlement'
      reason = 'Liquidación enviada pero aún pendiente de aprobación en caja'
    } else if (wd.status !== 'open') {
      statusType = 'unapproved_settlement'
      reason = 'Cierre ejecutado sin liquidación entregada a caja'
    }

    if (dayPendingAmount > 0 || wd.status === 'open') {
      breakdown.push({
        workdayId: wd.id,
        workDate: wd.work_date,
        amount: dayPendingAmount,
        status: statusType,
        reason,
      })
      totalPendingCash += dayPendingAmount
    }
  }

  return {
    courierId,
    totalPendingCash,
    hasPendingBalances: totalPendingCash > 0 || breakdown.length > 0,
    unclosedWorkdaysCount,
    breakdown,
  }
}

export async function getAllCouriersPendingBalances(
  branchId?: string,
  beforeDate?: string
): Promise<CourierPendingBalancesSummary[]> {
  const cutoffDate = beforeDate || getLocalDateString()

  // Obtener todos los perfiles de motorizados
  let query = supabase
    .from('profiles')
    .select('id, full_name, display_name, primary_branch_id')
    .eq('role', 'courier')
    .eq('is_active', true)

  if (branchId) {
    query = query.eq('primary_branch_id', branchId)
  }

  const { data: couriers, error } = await query
  if (error || !couriers) return []

  const results: CourierPendingBalancesSummary[] = []
  for (const c of couriers) {
    const summary = await getCourierPendingBalances(c.id, cutoffDate)
    if (summary.hasPendingBalances) {
      summary.courierName = c.display_name || c.full_name
      results.push(summary)
    }
  }

  return results
}

