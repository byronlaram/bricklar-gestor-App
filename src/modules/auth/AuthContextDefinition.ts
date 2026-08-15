import { createContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import type { UserRole } from '@/shared/types'

export interface UserProfile {
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
}

export interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  mustChangePassword: boolean
  role: UserRole | null
  isGeneralAdmin: boolean
  isJuniorAdmin: boolean
  isCourier: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
