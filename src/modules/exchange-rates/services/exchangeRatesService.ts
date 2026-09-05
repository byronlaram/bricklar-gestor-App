import { supabase } from '@/shared/lib/supabaseClient'
import type { ExchangeRate, SaveExchangeRatePayload, ExchangeRateFilters } from '../types/exchangeRates.types'

/**
 * Obtiene la tasa de cambio más reciente registrada (para una sucursal o global).
 */
export async function getLatestExchangeRate(branchId?: string): Promise<ExchangeRate | null> {
  try {
    let query = supabase
      .from('exchange_rates')
      .select(`
        id,
        branch_id,
        rate_date,
        nio_per_usd,
        source,
        notes,
        created_at,
        created_by,
        branches!exchange_rates_branch_id_fkey (name),
        profiles!exchange_rates_created_by_fkey (full_name)
      `)
      .order('rate_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ExchangeRates] getLatestExchangeRate error:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    const row = data[0] as any
    return {
      id: row.id,
      branch_id: row.branch_id,
      rate_date: row.rate_date,
      nio_per_usd: Number(row.nio_per_usd),
      source: row.source || 'BCN',
      notes: row.notes,
      created_at: row.created_at,
      created_by: row.created_by,
      creator_name: row.profiles?.full_name || 'Sistema',
      branch_name: row.branches?.name || 'Sucursal',
    }
  } catch (err) {
    console.error('[ExchangeRates] getLatestExchangeRate exception:', err)
    return null
  }
}

/**
 * Obtiene el historial de tasas de cambio con filtros opcionales.
 */
export async function getExchangeRates(filters?: ExchangeRateFilters): Promise<ExchangeRate[]> {
  try {
    let query = supabase
      .from('exchange_rates')
      .select(`
        id,
        branch_id,
        rate_date,
        nio_per_usd,
        source,
        notes,
        created_at,
        created_by,
        branches!exchange_rates_branch_id_fkey (name),
        profiles!exchange_rates_created_by_fkey (full_name)
      `)
      .order('rate_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters?.branch_id) {
      query = query.eq('branch_id', filters.branch_id)
    }
    if (filters?.start_date) {
      query = query.gte('rate_date', filters.start_date)
    }
    if (filters?.end_date) {
      query = query.lte('rate_date', filters.end_date)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    } else {
      query = query.limit(50)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ExchangeRates] getExchangeRates error:', error)
      throw new Error(error.message)
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      branch_id: row.branch_id,
      rate_date: row.rate_date,
      nio_per_usd: Number(row.nio_per_usd),
      source: row.source || 'BCN',
      notes: row.notes,
      created_at: row.created_at,
      created_by: row.created_by,
      creator_name: row.profiles?.full_name || 'Sistema',
      branch_name: row.branches?.name || 'Sucursal',
    }))
  } catch (err: any) {
    console.error('[ExchangeRates] getExchangeRates exception:', err)
    throw err
  }
}

/**
 * Guarda o actualiza la tasa de cambio para una fecha y sucursal.
 */
export async function saveExchangeRate(
  payload: SaveExchangeRatePayload,
  userId: string
): Promise<ExchangeRate> {
  const { branch_id, rate_date, nio_per_usd, source = 'BCN', notes = null } = payload

  // 1. Verificar si ya existe un registro para esa fecha y sucursal
  const { data: existing, error: checkError } = await supabase
    .from('exchange_rates')
    .select('id')
    .eq('branch_id', branch_id)
    .eq('rate_date', rate_date)
    .maybeSingle()

  if (checkError) {
    console.warn('[ExchangeRates] check existing warning:', checkError)
  }

  let resultId = ''

  if (existing?.id) {
    // Actualizar registro existente
    const { data, error } = await supabase
      .from('exchange_rates')
      .update({
        nio_per_usd,
        source,
        notes,
        created_by: userId,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('[ExchangeRates] update error:', error)
      throw new Error(error.message)
    }
    resultId = data.id
  } else {
    // Insertar nuevo registro
    const { data, error } = await supabase
      .from('exchange_rates')
      .insert({
        branch_id,
        rate_date,
        nio_per_usd,
        source,
        notes,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('[ExchangeRates] insert error:', error)
      throw new Error(error.message)
    }
    resultId = data.id
  }

  // Cargar registro completo con joins
  const { data: fullRow, error: fetchError } = await supabase
    .from('exchange_rates')
    .select(`
      id,
      branch_id,
      rate_date,
      nio_per_usd,
      source,
      notes,
      created_at,
      created_by,
      branches!exchange_rates_branch_id_fkey (name),
      profiles!exchange_rates_created_by_fkey (full_name)
    `)
    .eq('id', resultId)
    .single()

  if (fetchError || !fullRow) {
    return {
      id: resultId,
      branch_id,
      rate_date,
      nio_per_usd,
      source,
      notes,
      created_at: new Date().toISOString(),
      created_by: userId,
    }
  }

  const row = fullRow as any
  return {
    id: row.id,
    branch_id: row.branch_id,
    rate_date: row.rate_date,
    nio_per_usd: Number(row.nio_per_usd),
    source: row.source || 'BCN',
    notes: row.notes,
    created_at: row.created_at,
    created_by: row.created_by,
    creator_name: row.profiles?.full_name || 'Usuario',
    branch_name: row.branches?.name || 'Sucursal',
  }
}

/**
 * Elimina un registro de tasa de cambio.
 */
export async function deleteExchangeRate(id: string): Promise<void> {
  const { error } = await supabase.from('exchange_rates').delete().eq('id', id)

  if (error) {
    console.error('[ExchangeRates] delete error:', error)
    throw new Error(error.message)
  }
}
