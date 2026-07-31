import type { WorkdayStatus } from '@/shared/types'

export interface Workday {
  id: string
  courier_id: string
  branch_id: string
  work_date: string // YYYY-MM-DD
  status: WorkdayStatus
  start_time: string
  end_time: string | null
  initial_km: number
  final_km: number | null
  initial_cash: number
  notes: string | null
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

export interface StartWorkdayPayload {
  branch_id: string
  initial_km: number
  initial_cash?: number
  notes?: string
}

export interface EndWorkdayPayload {
  workday_id: string
  final_km: number
  notes?: string
}

export interface WorkdayFilters {
  branch_id?: string
  courier_id?: string
  date?: string
  status?: WorkdayStatus | ''
  page?: number
  page_size?: number
}
