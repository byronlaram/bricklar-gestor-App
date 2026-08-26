import type {
  SettlementStatus,
  MovementType,
  MovementDirection,
  PaymentMethod,
  Currency,
} from '@/shared/types'
import type { WorkdayCashSummary } from '@/modules/workdays/utils/workdayCalculations'

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
  reviewer_profile?: {
    id: string
    full_name: string
    display_name: string | null
  } | null
  cash_summary?: WorkdayCashSummary
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
  adjustment_reason_type?: string
  adjustment_notes?: string
}

export interface AdminForceSettlementPayload {
  workday_id: string
  actual_cash: number
  actual_transfers?: number
  contingency_reason: string
  contingency_notes?: string
  adjustment_reason_type?: string
  adjustment_notes?: string
}


export interface SettlementAdjustmentRecord {
  id: string
  settlement_id: string
  adjusted_by: string
  adjustment_amount: number
  reason: string
  created_at: string
  settlement?: {
    id: string
    settlement_date: string
    expected_cash: number
    actual_cash: number
    branch_id: string
    courier_id: string
    courier?: {
      id: string
      full_name: string
      display_name: string | null
    } | null
    branch?: {
      id: string
      name: string
    } | null
  } | null
  adjuster?: {
    id: string
    full_name: string
  } | null
}

export interface SettlementFilters {
  branch_id?: string
  courier_id?: string
  date?: string // YYYY-MM-DD
  date_from?: string
  date_to?: string
  status?: SettlementStatus
}

export interface DailyClosureSummary {
  branch_id: string
  date: string
  total_workdays: number
  total_collections_cash: number
  total_collections_transfer: number
  total_expenses: number
  total_already_received: number
  net_cash_in_hand: number
}
