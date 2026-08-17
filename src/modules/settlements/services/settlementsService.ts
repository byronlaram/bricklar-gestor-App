import { supabase } from '@/shared/lib/supabaseClient'
import { calculateWorkdayCashSummary } from '@/modules/workdays/utils/workdayCalculations'
import type {
  Settlement,
  CashMovement,
  CreateMovementPayload,
  ApproveSettlementPayload,
  SettlementFilters,
  DailyClosureSummary,
} from '../types/settlements.types'

const SETTLEMENT_SELECT = `
  *,
  courier_profile:profiles!settlements_courier_id_fkey (
    id, full_name, display_name, phone, avatar_url
  ),
  branch:branches!settlements_branch_id_fkey (
    id, name, code
  )
`

export async function getSettlements(filters: SettlementFilters = {}): Promise<Settlement[]> {
  const { branch_id, courier_id, date, status } = filters

  let query = supabase
    .from('settlements')
    .select(SETTLEMENT_SELECT)
    .order('settlement_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (branch_id) query = query.eq('branch_id', branch_id)
  if (courier_id) query = query.eq('courier_id', courier_id)
  if (date) query = query.eq('settlement_date', date)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    console.error('[Settlements] getSettlements error:', error)
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as Settlement[]
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

  return data as unknown as Settlement
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

  return (data as unknown as Settlement) ?? null
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
    .select('expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status')
    .eq('assigned_courier_id', targetCourierId)
    .eq('scheduled_date', workday.work_date)
    .eq('status', 'completed')

  // Obtener movimientos de caja de esta jornada
  const { data: movements } = await supabase
    .from('cash_movements')
    .select('amount, currency, direction, movement_type')
    .eq('workday_id', workdayId)

  const cashSummary = calculateWorkdayCashSummary(
    workday.initial_cash ?? 0,
    tasks || [],
    movements || []
  )

  const expectedCashNet = Math.max(0, cashSummary.cashInHandNIO)
  const totalExpenses = cashSummary.expensesNIO
  const totalExpectedTransfers = (tasks || [])
    .filter((t) => t.requires_collection && t.expected_payment_method && t.expected_payment_method !== 'cash')
    .reduce((acc, t) => acc + (t.expected_collection_amount || 0), 0)

  const insertData = {
    workday_id: workdayId,
    courier_id: targetCourierId,
    branch_id: workday.branch_id,
    settlement_date: workday.work_date,
    status: 'pending_review',
    expected_cash: expectedCashNet,
    actual_cash: expectedCashNet, // Borrador inicial igual al esperado
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
    .select('expected_cash')
    .eq('id', payload.settlement_id)
    .single()

  if (getErr) throw new Error(getErr.message)

  const expectedCash = (current as { expected_cash: number }).expected_cash
  const difference = payload.actual_cash - expectedCash

  const { data, error } = await supabase
    .from('settlements')
    .update({
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

  return data as unknown as Settlement
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

export async function getDailyClosure(branchId: string, date: string): Promise<DailyClosureSummary> {
  const settlements = await getSettlements({ branch_id: branchId, date })

  const totalWorkdays = settlements.length
  const totalCollectionsCash = settlements.reduce((acc, s) => acc + s.actual_cash, 0)
  const totalCollectionsTransfer = settlements.reduce((acc, s) => acc + s.actual_transfers, 0)
  const totalExpenses = settlements.reduce((acc, s) => acc + s.total_expenses, 0)
  const netCashInHand = totalCollectionsCash - totalExpenses

  return {
    branch_id: branchId,
    date,
    total_workdays: totalWorkdays,
    total_collections_cash: totalCollectionsCash,
    total_collections_transfer: totalCollectionsTransfer,
    total_expenses: totalExpenses,
    net_cash_in_hand: netCashInHand,
  }
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
  const currentDate = beforeDate || new Date().toISOString().split('T')[0]

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
      .select('expected_collection_amount, expected_collection_currency, expected_payment_method, requires_collection, requires_payment, expected_payment_amount, expected_payment_currency, status')
      .eq('assigned_courier_id', courierId)
      .eq('scheduled_date', wd.work_date)
      .eq('status', 'completed')

    const { data: dayMovements } = await supabase
      .from('cash_movements')
      .select('amount, currency, direction, movement_type')
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
  branchId?: string
): Promise<CourierPendingBalancesSummary[]> {
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
    const summary = await getCourierPendingBalances(c.id)
    if (summary.hasPendingBalances) {
      summary.courierName = c.display_name || c.full_name
      results.push(summary)
    }
  }

  return results
}

