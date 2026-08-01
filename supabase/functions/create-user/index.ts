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

    // 2. Validar autenticación del solicitante
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
      throw new Error('Variables de entorno del servidor de Supabase no configuradas.')
    }

    // Cliente para verificar la sesión y permisos del usuario cliente
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser }, error: callerError } = await userClient.auth.getUser()
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Sesión inválida o expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Validar que únicamente el Administrador General pueda crear usuarios
    const { data: callerProfile, error: profileErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (profileErr || callerProfile?.role !== 'general_admin') {
      return new Response(
        JSON.stringify({ error: 'Acceso denegado. Únicamente el Administrador General puede crear usuarios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Leer payload de la solicitud
    const { email, password, full_name, display_name, phone, role, branch_ids = [] } = await req.json()

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Correo, contraseña, nombre completo y rol son obligatorios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Instanciar cliente Administrador seguro con Service Role Key (100% en servidor)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 6. Crear usuario en auth.users
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })

    if (createAuthError || !authData.user) {
      return new Response(
        JSON.stringify({ error: createAuthError?.message || 'Error al crear usuario en Auth.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = authData.user.id

    // 7. Completar profiles, user_roles y user_branches con ROLLBACK automático si falla
    try {
      // Profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUserId,
          email,
          full_name,
          display_name: display_name || full_name,
          phone: phone || null,
          role,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

      if (profileError) throw new Error(`Error en perfil: ${profileError.message}`)

      // User Roles
      const { data: roleData } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('name', role)
        .maybeSingle()

      if (roleData?.id) {
        const { error: roleErr } = await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: newUserId,
            role_id: roleData.id,
            granted_by: callerUser.id,
          }, { onConflict: 'user_id,role_id' })

        if (roleErr) console.warn('[create-user] Warning en user_roles:', roleErr.message)
      }

      // User Branches
      if (Array.isArray(branch_ids) && branch_ids.length > 0) {
        const branchInserts = branch_ids.map((branch_id: string) => ({
          user_id: newUserId,
          branch_id,
        }))
        const { error: branchError } = await supabaseAdmin
          .from('user_branches')
          .insert(branchInserts)

        if (branchError) throw new Error(`Error asignando sucursales: ${branchError.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: { id: newUserId, email, full_name, role, branch_ids },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (err: unknown) {
      // ROLLBACK CONTROLADO: Si falla la creación del perfil o sucursales, eliminar el usuario de auth.users
      const rollbackMsg = (err as Error)?.message || 'Error al completar el perfil del usuario'
      console.error('[create-user] Rollback activado:', rollbackMsg)
      await supabaseAdmin.auth.admin.deleteUser(newUserId)

      return new Response(
        JSON.stringify({ error: `Error en aprovisionamiento. Rollback ejecutado: ${rollbackMsg}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: (err as Error)?.message || 'Error interno del servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
