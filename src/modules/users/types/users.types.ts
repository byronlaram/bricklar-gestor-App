import type { UserRole } from '@/shared/types'

export interface UserProfileExtended {
  id: string
  email: string
  full_name: string
  display_name: string | null
  avatar_url: string | null
  phone: string | null
  role: UserRole
  is_active: boolean
  branch_ids: string[]
  primary_branch_id: string | null
  must_change_password?: boolean | null
  last_sign_in_at: string | null
  created_at: string
}

export interface CreateUserPayload {
  email: string
  password: string
  full_name: string
  display_name?: string
  avatar_url?: string | null
  phone?: string
  role: UserRole
  branch_ids: string[]
}

export interface UpdateUserPayload {
  full_name?: string
  display_name?: string
  avatar_url?: string | null
  phone?: string
  role?: UserRole
  is_active?: boolean
  branch_ids?: string[]
}

export interface UserFilters {
  search?: string
  role?: UserRole | ''
  branch_id?: string
  is_active?: boolean | ''
}
