import { supabase } from '@/shared/lib/supabaseClient'
import type {
  UserProfileExtended,
  CreateUserPayload,
  UpdateUserPayload,
  UserFilters,
} from '../types/users.types'

export async function getUsers(filters: UserFilters = {}): Promise<UserProfileExtended[]> {
  const { search, role, is_active } = filters

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })

  if (role) query = query.eq('role', role)
  if (typeof is_active === 'boolean') query = query.eq('is_active', is_active)
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  const { data: profiles, error } = await query

  if (error) {
    console.error('[Users] getUsers error:', error)
    throw new Error(error.message)
  }

  // Obtener las sucursales asignadas por usuario desde user_branches
  const { data: userBranches } = await supabase.from('user_branches').select('user_id, branch_id')

  const branchesMap: Record<string, string[]> = {}
  ;(userBranches ?? []).forEach((ub: { user_id: string; branch_id: string }) => {
    if (!branchesMap[ub.user_id]) branchesMap[ub.user_id] = []
    branchesMap[ub.user_id].push(ub.branch_id)
  })

  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    display_name: p.display_name ?? null,
    avatar_url: p.avatar_url ?? null,
    phone: p.phone ?? null,
    role: p.role,
    is_active: p.is_active,
    branch_ids: branchesMap[p.id] ?? [],
    primary_branch_id: p.primary_branch_id ?? (branchesMap[p.id]?.[0] || null),
    last_sign_in_at: p.last_sign_in_at ?? null,
    created_at: p.created_at,
  }))
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  // Crear usuario usando signUp en Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.full_name,
        role: payload.role,
      },
    },
  })

  if (authError || !authData.user) {
    console.error('[Users] createUser auth error:', authError)
    throw new Error(authError?.message || 'No se pudo registrar el usuario.')
  }

  const userId = authData.user.id

  // Actualizar perfil con información adicional
  await supabase
    .from('profiles')
    .update({
      full_name: payload.full_name,
      display_name: payload.display_name ?? payload.full_name,
      phone: payload.phone ?? null,
      role: payload.role,
      is_active: true,
    })
    .eq('id', userId)

  // Asignar sucursales
  if (payload.branch_ids.length > 0) {
    const branchInserts = payload.branch_ids.map((branch_id) => ({
      user_id: userId,
      branch_id,
    }))
    await supabase.from('user_branches').insert(branchInserts)
  }
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<void> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.full_name !== undefined) updateData.full_name = payload.full_name
  if (payload.display_name !== undefined) updateData.display_name = payload.display_name
  if (payload.phone !== undefined) updateData.phone = payload.phone
  if (payload.role !== undefined) updateData.role = payload.role
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active

  const { error } = await supabase.from('profiles').update(updateData).eq('id', id)

  if (error) {
    console.error('[Users] updateUser error:', error)
    throw new Error(error.message)
  }

  // Actualizar relaciones de sucursales si fueron provistas
  if (payload.branch_ids) {
    await supabase.from('user_branches').delete().eq('user_id', id)
    if (payload.branch_ids.length > 0) {
      const branchInserts = payload.branch_ids.map((branch_id) => ({
        user_id: id,
        branch_id,
      }))
      await supabase.from('user_branches').insert(branchInserts)
    }
  }
}

export async function toggleUserStatus(id: string, is_active: boolean): Promise<void> {
  await updateUser(id, { is_active })
}
