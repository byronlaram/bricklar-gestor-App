import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-name, x-app-env',
}

serve(async (req) => {
  // 1. Preflight CORS
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

    // Cliente para verificar sesión del usuario que realiza la acción
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

    // 3. Validar que únicamente el Administrador General pueda gestionar contraseñas
    const { data: callerProfile, error: profileErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (profileErr || callerProfile?.role !== 'general_admin') {
      return new Response(
        JSON.stringify({ error: 'Acceso denegado. Únicamente el Administrador General puede gestionar contraseñas.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Leer payload de la solicitud
    const { userId, password, action } = await req.json()

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'ID de usuario y acción son requeridos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    if (action === 'set_temp_password') {
      if (!password || password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'La contraseña temporal debe tener al menos 6 caracteres.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Actualizar contraseña en Auth.users e indicar que debe cambiar clave
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { must_change_password: true },
      })

      if (updateAuthError) {
        return new Response(
          JSON.stringify({ error: updateAuthError.message || 'Error al actualizar contraseña en Supabase Auth.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Actualizar profile
      await supabaseAdmin
        .from('profiles')
        .update({
          must_change_password: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      // Registrar en auditoría (SIN almacenar ni revelar la contraseña)
      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: callerUser.id,
        action: 'temp_password_generated',
        entity_type: 'user',
        entity_id: userId,
        changes: { result: 'success', forced_change: true },
      })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Contraseña temporal creada correctamente.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Acción no reconocida.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: (err as Error)?.message || 'Error interno del servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
