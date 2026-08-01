import { supabase } from '@/shared/lib/supabaseClient'
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

  // Obtener la jornada para branch_id y work_date
  const { data: workday, error: workdayErr } = await supabase
    .from('workdays')
    .select('branch_id, work_date, initial_cash')
    .eq('id', workdayId)
    .single()

  if (workdayErr || !workday) throw new Error('Jornada laboral no encontrada.')

  // Calcular cobros de tareas completadas de esta jornada/motorizado
  const { data: tasks } = await supabase
    .from('tasks')
    .select('expected_collection_amount, expected_payment_method')
    .eq('assigned_courier_id', userId)
    .eq('scheduled_date', workday.work_date)
    .eq('status', 'completed')
    .eq('requires_collection', true)

  const totalExpectedCash = (tasks || [])
    .filter((t) => (t.expected_payment_method || 'cash') === 'cash')
    .reduce((acc, t) => acc + (t.expected_collection_amount || 0), 0)

  const totalExpectedTransfers = (tasks || [])
    .filter((t) => t.expected_payment_method && t.expected_payment_method !== 'cash')
    .reduce((acc, t) => acc + (t.expected_collection_amount || 0), 0)

  // Obtener movimientos de caja de esta jornada (gastos e ingresos por adelantos de efectivo)
  const { data: movements } = await supabase
    .from('cash_movements')
    .select('amount, direction, movement_type')
    .eq('workday_id', workdayId)

  const totalExpenses = (movements || [])
    .filter((m) => m.direction === 'expense')
    .reduce((acc, m) => acc + m.amount, 0)

  const totalCashAdvances = (movements || [])
    .filter((m) => m.direction === 'income' && m.movement_type === 'cash_advance')
    .reduce((acc, m) => acc + m.amount, 0)

  const initialCash = workday.initial_cash ?? 0
  const expectedCashNet = Math.max(0, initialCash + totalCashAdvances + totalExpectedCash - totalExpenses)

  const insertData = {
    workday_id: workdayId,
    courier_id: userId,
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

  return data as unknown as Settlement
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
