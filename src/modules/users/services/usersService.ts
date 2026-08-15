import { supabase } from '@/shared/lib/supabaseClient'
import type { Database } from '@/shared/lib/database.types'
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
    must_change_password: p.must_change_password ?? false,
    branch_ids: branchesMap[p.id] ?? [],
    primary_branch_id: p.primary_branch_id ?? (branchesMap[p.id]?.[0] || null),
    last_sign_in_at: p.last_sign_in_at ?? null,
    created_at: p.created_at,
  }))
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: {
      email: payload.email,
      password: payload.password,
      full_name: payload.full_name,
      display_name: payload.display_name ?? payload.full_name,
      phone: payload.phone ?? null,
      role: payload.role,
      branch_ids: payload.branch_ids ?? [],
    },
  })

  if (error) {
    console.error('[Users] createUser Edge Function error:', error)
    throw new Error(error.message || 'Error al invocar Edge Function de creación de usuario.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<void> {
  const updateData: Database['public']['Tables']['profiles']['Update'] = {
    updated_at: new Date().toISOString(),
  }

  if (payload.full_name !== undefined) updateData.full_name = payload.full_name
  if (payload.display_name !== undefined) updateData.display_name = payload.display_name
  if (payload.phone !== undefined) updateData.phone = payload.phone
  if (payload.role !== undefined) updateData.role = payload.role
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .select()

  if (error) {
    console.error('[Users] updateUser error:', error)
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    throw new Error('No se pudo actualizar el estado del usuario. Permisos insuficientes o usuario no encontrado.')
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

export async function deleteUser(id: string): Promise<void> {
  let edgeFunctionError: string | null = null

  // 1. Intentar eliminar vía Edge Function (maneja borrado de auth.users y auditoría)
  try {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId: id },
    })

    if (!error && !data?.error) {
      return
    }

    if (data?.error) {
      edgeFunctionError = data.error
    } else if (error) {
      if ('context' in error && (error as any).context) {
        try {
          const res = (error as any).context as Response
          const json = await res.json()
          if (json?.error) edgeFunctionError = json.error
        } catch { }
      }
      if (!edgeFunctionError) {
        edgeFunctionError = error.message
      }
    }
  } catch (err: any) {
    console.warn('[Users] deleteUser Edge Function invocation exception:', err)
  }

  // Si la Edge Function devolvió un mensaje claro de negocio (ej. dependencias/autoeliminación/administrador único)
  if (edgeFunctionError && (
    edgeFunctionError.includes('registros asociados') ||
    edgeFunctionError.includes('único Administrador') ||
    edgeFunctionError.includes('propia cuenta') ||
    edgeFunctionError.includes('no se puede eliminar')
  )) {
    throw new Error(edgeFunctionError)
  }

  // 2. Fallback: Intentar eliminación directa en tablas de la BD si la Edge Function no está desplegada o falla por red
  try {
    await supabase.from('user_branches').delete().eq('user_id', id)
    await supabase.from('user_roles').delete().eq('user_id', id)

    const { error: profileDeleteErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileDeleteErr) {
      console.error('[Users] Direct profile delete error:', profileDeleteErr)
      if (profileDeleteErr.code === '23503' || profileDeleteErr.message.includes('foreign key')) {
        throw new Error(
          'Este usuario no se puede eliminar permanentemente porque tiene tareas, jornadas u otros registros asociados. Te sugerimos cambiar su estado a Inactivo.'
        )
      }
      throw new Error(edgeFunctionError || profileDeleteErr.message || 'Error al eliminar usuario.')
    }
  } catch (directErr: any) {
    throw new Error(
      edgeFunctionError || directErr.message || 'No se pudo eliminar el usuario de la base de datos.'
    )
  }
}

// ─── Enviar Enlace de Recuperación de Contraseña ────────────────────────────────
export async function sendPasswordResetLink(email: string, targetUserId: string): Promise<void> {
  const redirectUrl = `${window.location.origin}/restablecer-contrasena`
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  })

  if (error) {
    console.error('[Users] resetPasswordForEmail error:', error)
    throw new Error(error.message || 'Error al enviar enlace de recuperación de contraseña.')
  }

  // Registrar evento de auditoría
  const { data: session } = await supabase.auth.getSession()
  const callerUserId = session?.session?.user?.id
  if (callerUserId) {
    await supabase.rpc('log_audit_event', {
      p_action: 'password_reset_link_sent',
      p_entity_type: 'user',
      p_entity_id: targetUserId,
      p_changes: { result: 'success', email_sent_to: email },
    })
  }
}

// ─── Generar / Establecer Contraseña Temporal Segura ────────────────────────────
export async function generateTempPassword(targetUserId: string, password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('manage-user-password', {
    body: {
      userId: targetUserId,
      action: 'set_temp_password',
      password,
    },
  })

  if (error) {
    console.error('[Users] generateTempPassword Edge Function error:', error)
    throw new Error(error.message || 'Error al invocar Edge Function de contraseña temporal.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }
}
