import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-name, x-app-env',
}

serve(async (req) => {
  // 1. Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado. Token de sesión requerido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Variables de entorno de Supabase no configuradas.')
    }

    // 2. Validar autenticación y rol del solicitante
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser }, error: callerErr } = await userClient.auth.getUser()
    if (callerErr || !callerUser) {
      return new Response(JSON.stringify({ error: 'Sesión inválida o expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await userClient
      .from('profiles')
      .select('id, email, role')
      .eq('id', callerUser.id)
      .single()

    if (callerProfile?.role !== 'general_admin') {
      return new Response(
        JSON.stringify({ error: 'Acceso denegado. Únicamente el Administrador General puede eliminar usuarios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId: targetUserId } = await req.json()
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'ID de usuario no proporcionado.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Instanciar cliente Administrador seguro con Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Función auxiliar para registrar auditoría
    const logAudit = async (action: string, result: string, reason: string, details: any = {}) => {
      try {
        await supabaseAdmin.from('audit_logs').insert({
          actor_user_id: callerUser.id,
          actor_email: callerProfile.email || callerUser.email || null,
          actor_role: callerProfile.role || 'general_admin',
          action,
          entity_type: 'user',
          entity_id: targetUserId,
          entity_code: details.target_email || null,
          changes: { result, reason, ...details },
          created_at: new Date().toISOString(),
        })
      } catch (auditErr) {
        console.warn('[delete-user] Audit log error:', auditErr)
      }
    }

    // 3. Buscar perfil del usuario objetivo
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', targetUserId)
      .maybeSingle()

    if (!targetProfile) {
      await logAudit('USER_DELETE_REJECTED', 'FAILED', 'El usuario objetivo no existe.')
      return new Response(JSON.stringify({ error: 'El usuario especificado no existe.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Validación: Autoeliminación bloqueada
    if (targetUserId === callerUser.id) {
      await logAudit('USER_DELETE_BLOCKED', 'BLOCKED_SELF_DELETE', 'Intento de autoeliminación de Administrador General.', {
        target_email: targetProfile.email,
        target_full_name: targetProfile.full_name,
      })
      return new Response(
        JSON.stringify({ error: 'No puedes eliminar tu propia cuenta de Administrador General.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Validación: Último Administrador General activo
    if (targetProfile.role === 'general_admin') {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'general_admin')

      if ((count ?? 0) <= 1) {
        await logAudit('USER_DELETE_BLOCKED', 'BLOCKED_LAST_ADMIN', 'Intento de eliminar el único Administrador General del sistema.', {
          target_email: targetProfile.email,
          target_full_name: targetProfile.full_name,
        })
        return new Response(
          JSON.stringify({ error: 'No se puede eliminar el único Administrador General registrado en el sistema.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 6. Validación de Dependencias Históricas en tablas reales del sistema
    const dependencyChecks = [
      { table: 'tasks', columns: ['assigned_courier_id', 'created_by', 'updated_by', 'deleted_by'], name: 'Tareas' },
      { table: 'workdays', columns: ['courier_id', 'opened_by', 'closed_by'], name: 'Jornadas' },
      { table: 'settlements', columns: ['courier_id', 'reviewed_by'], name: 'Liquidaciones' },
      { table: 'cash_transfers', columns: ['courier_id', 'delivered_by', 'confirmed_by', 'voided_by'], name: 'Transferencias de caja' },
      { table: 'financial_movements', columns: ['courier_id', 'created_by', 'updated_by', 'deleted_by'], name: 'Movimientos financieros' },
      { table: 'cash_movements', columns: ['courier_id'], name: 'Movimientos de caja' },
      { table: 'daily_closures', columns: ['closed_by', 'created_by', 'updated_by'], name: 'Cierres diarios' },
      { table: 'audit_logs', columns: ['actor_user_id'], name: 'Registros de auditoría' },
      { table: 'task_status_history', columns: ['changed_by'], name: 'Historial de tareas' },
      { table: 'task_assignments', columns: ['courier_id', 'assigned_by', 'unassigned_by'], name: 'Asignaciones de tareas' },
      { table: 'settlement_adjustments', columns: ['adjusted_by'], name: 'Ajustes de liquidaciones' },
    ]

    const foundDependencies: string[] = []

    for (const check of dependencyChecks) {
      for (const col of check.columns) {
        const { count } = await supabaseAdmin
          .from(check.table)
          .select('id', { count: 'exact', head: true })
          .eq(col, targetUserId)

        if (count && count > 0) {
          if (!foundDependencies.includes(check.name)) {
            foundDependencies.push(check.name)
          }
          break
        }
      }
    }

    if (foundDependencies.length > 0) {
      const depMsg = foundDependencies.join(', ')
      await logAudit('USER_DELETE_BLOCKED', 'BLOCKED_DEPENDENCIES', `El usuario tiene historial en: ${depMsg}`, {
        target_email: targetProfile.email,
        target_full_name: targetProfile.full_name,
        dependencies: foundDependencies,
      })

      return new Response(
        JSON.stringify({
          error: `El usuario "${targetProfile.full_name}" tiene registros asociados en: ${depMsg}. No puede ser eliminado físicamente. Te sugerimos inactivar su cuenta.`,
          has_dependencies: true,
          dependencies: foundDependencies,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Eliminación limpia de relaciones auxiliares y cuenta Auth
    try {
      await supabaseAdmin.from('user_branches').delete().or(`user_id.eq.${targetUserId},assigned_by.eq.${targetUserId}`)
      await supabaseAdmin.from('user_roles').delete().or(`user_id.eq.${targetUserId},granted_by.eq.${targetUserId}`)
      await supabaseAdmin.from('courier_branch_assignments').delete().or(`courier_id.eq.${targetUserId},assigned_by.eq.${targetUserId}`)
      await supabaseAdmin.from('notification_preferences').delete().eq('user_id', targetUserId)
      await supabaseAdmin.from('notifications').delete().or(`user_id.eq.${targetUserId},created_by.eq.${targetUserId}`)

      const { error: deleteProfileErr } = await supabaseAdmin.from('profiles').delete().eq('id', targetUserId)
      if (deleteProfileErr) {
        throw new Error(`Error eliminando perfil: ${deleteProfileErr.message}`)
      }

      const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
      if (deleteAuthErr) {
        throw new Error(`Error eliminando usuario en Auth: ${deleteAuthErr.message}`)
      }

      await logAudit('USER_DELETED', 'SUCCESS', 'Usuario eliminado exitosamente.', {
        target_email: targetProfile.email,
        target_full_name: targetProfile.full_name,
      })

      return new Response(
        JSON.stringify({
          success: true,
          message: `El usuario "${targetProfile.full_name}" fue eliminado exitosamente.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (err: any) {
      await logAudit('USER_DELETE_ERROR', 'ERROR', err?.message || 'Error en proceso de eliminación.')
      return new Response(
        JSON.stringify({ error: err?.message || 'Error interno al eliminar usuario.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Error interno del servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
