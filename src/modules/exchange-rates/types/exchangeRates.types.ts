export interface ExchangeRate {
  id: string
  branch_id: string
  rate_date: string // YYYY-MM-DD
  nio_per_usd: number
  source: string
  notes: string | null
  created_at: string
  created_by: string
  creator_name?: string
  branch_name?: string
}

export interface SaveExchangeRatePayload {
  branch_id: string
  rate_date: string // YYYY-MM-DD
  nio_per_usd: number
  source?: string
  notes?: string | null
}

export interface ExchangeRateFilters {
  branch_id?: string
  start_date?: string
  end_date?: string
  limit?: number
}
