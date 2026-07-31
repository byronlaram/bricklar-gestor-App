import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabaseClient'
import type { UserRole } from '@/shared/types'

// ─── Tipos ──────────────────────────────────────────────────────────────────────

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
  last_sign_in_at: string | null
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  role: UserRole | null
  isGeneralAdmin: boolean
  isJuniorAdmin: boolean
  isCourier: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = async (userId: string): Promise<void> => {
    try {
      // Usa RPC get_my_profile() para evitar el error de FK ambiguo en PostgREST
      // La función corre con SECURITY DEFINER y retorna perfil+rol+sucursales en una sola llamada
      const { data, error } = await supabase.rpc('get_my_profile')

      if (error || !data) {
        console.error('[Auth] Error cargando perfil:', error?.message)
        setProfile(null)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any

      setProfile({
        id: raw.id,
        email: raw.email,
        full_name: raw.full_name,
        display_name: raw.display_name ?? null,
        avatar_url: raw.avatar_url ?? null,
        phone: raw.phone ?? null,
        role: (raw.role as UserRole) ?? 'courier',
        is_active: raw.is_active,
        branch_ids: raw.branch_ids ?? [],
        primary_branch_id: raw.primary_branch_id ?? null,
        last_sign_in_at: raw.last_sign_in_at ?? null,
      })
    } catch (err) {
      console.error('[Auth] Error inesperado:', err)
      setProfile(null)
    }
    // userId es usado por los callers pero la RPC usa auth.uid() internamente
    void userId
  }

  const refreshProfile = async (): Promise<void> => {
    if (user?.id) await loadProfile(user.id)
  }

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s)
        setUser(s?.user ?? null)

        if (event === 'SIGNED_IN' && s?.user) {
          await loadProfile(s.user.id)
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
        } else if (event === 'TOKEN_REFRESHED' && s?.user) {
          // Refrescar perfil en refresh de token por si cambió el rol
          await loadProfile(s.user.id)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Mensaje genérico para no revelar si el email existe
      throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.')
    }
  }

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut()
    setProfile(null)
    setUser(null)
    setSession(null)
  }

  const role = profile?.role ?? null

  const value: AuthContextValue = {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!user && !!profile?.is_active,
    role,
    isGeneralAdmin: role === 'general_admin',
    isJuniorAdmin: role === 'junior_admin',
    isCourier: role === 'courier',
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}
