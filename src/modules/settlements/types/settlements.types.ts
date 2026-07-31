import type {
  SettlementStatus,
  MovementType,
  MovementDirection,
  PaymentMethod,
  Currency,
} from '@/shared/types'

export interface Settlement {
  id: string
  workday_id: string
  courier_id: string
  branch_id: string
  settlement_date: string // YYYY-MM-DD
  status: SettlementStatus
  expected_cash: number
  actual_cash: number
  expected_transfers: number
  actual_transfers: number
  total_expenses: number
  difference: number
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  courier_profile?: {
    id: string
    full_name: string
    display_name: string | null
    phone: string | null
    avatar_url: string | null
  } | null
  branch?: {
    id: string
    name: string
    code: string
  } | null
}

export interface CashMovement {
  id: string
  workday_id: string
  courier_id: string
  task_id: string | null
  movement_type: MovementType
  direction: MovementDirection
  amount: number
  currency: Currency
  payment_method: PaymentMethod
  description: string
  receipt_url: string | null
  created_at: string
  courier_profile?: {
    full_name: string
  } | null
}

export interface CreateMovementPayload {
  workday_id: string
  movement_type: MovementType
  direction: MovementDirection
  amount: number
  currency?: Currency
  payment_method?: PaymentMethod
  description: string
  receipt_url?: string
}

export interface ApproveSettlementPayload {
  settlement_id: string
  actual_cash: number
  actual_transfers?: number
  notes?: string
}

export interface SettlementFilters {
  branch_id?: string
  courier_id?: string
  date?: string
  status?: SettlementStatus | ''
}

export interface DailyClosureSummary {
  branch_id: string
  date: string
  total_workdays: number
  total_collections_cash: number
  total_collections_transfer: number
  total_expenses: number
  net_cash_in_hand: number
}
