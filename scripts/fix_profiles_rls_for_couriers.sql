-- ==============================================================================
-- FIX RLS & RPC: Ejecutar en el SQL Editor de Supabase
-- Asegura acceso irrestricto de lectura a perfiles y asignaciones de sucursal,
-- además de proveer las funciones RPC para listar motorizados y eliminar tareas.
-- ==============================================================================

-- 1. Políticas RLS para lectura en PROFILES y USER_BRANCHES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_branches_select_authenticated" ON public.user_branches;
DROP POLICY IF EXISTS "user_branches_select_policy" ON public.user_branches;
DROP POLICY IF EXISTS "user_branches_read_policy" ON public.user_branches;

CREATE POLICY "user_branches_select_authenticated" ON public.user_branches
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Políticas RLS para TASKS (Permite a Junior Admin y General Admin actualizar y borrar)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- 3. Función RPC get_couriers_for_branch (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_couriers_for_branch(p_branch_id text DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(JSONB_AGG(sub.courier_data), '[]'::jsonb) INTO v_result
  FROM (
    SELECT 
      JSONB_BUILD_OBJECT(
        'id', p.id,
        'full_name', COALESCE(p.full_name, p.display_name, 'Motorizado'),
        'display_name', p.display_name,
        'phone', p.phone,
        'avatar_url', p.avatar_url,
        'role', p.role,
        'is_active', COALESCE(p.is_active, true),
        'primary_branch_id', p.primary_branch_id,
        'branch_name', b.name,
        'branch_ids', COALESCE(
          (
            SELECT JSONB_AGG(ub.branch_id::text)
            FROM public.user_branches ub
            WHERE ub.user_id = p.id
          ),
          CASE WHEN p.primary_branch_id IS NOT NULL THEN JSONB_BUILD_ARRAY(p.primary_branch_id::text) ELSE '[]'::jsonb END
        )
      ) AS courier_data
    FROM public.profiles p
    LEFT JOIN public.branches b ON b.id = p.primary_branch_id
    WHERE (p.is_active IS NULL OR p.is_active = true)
      AND (
        LOWER(COALESCE(p.role, '')) IN ('courier', 'motorizado', 'delivery', 'repartidor', 'driver', 'chofer')
        OR (LOWER(COALESCE(p.role, '')) NOT IN ('general_admin', 'junior_admin', 'admin'))
      )
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_couriers_for_branch(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_couriers_for_branch(text) TO anon;

-- 4. Función RPC delete_task (SECURITY DEFINER para borrado limpio y seguro)
CREATE OR REPLACE FUNCTION public.delete_task(p_task_id text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_user_id uuid;
  v_now timestamptz := NOW();
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay sesión activa');
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id::uuid AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'La tarea ya no existe');
  END IF;

  -- Validar que no esté en estado completado o en ruta
  IF v_task.status IN ('completed', 'en_route', 'in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se puede eliminar una tarea en ruta o completada');
  END IF;

  -- Soft-delete con cambio a estado cancelled
  UPDATE public.tasks
  SET 
    deleted_at = v_now,
    deleted_by = v_user_id::text,
    updated_at = v_now,
    updated_by = v_user_id::text,
    status = 'cancelled'
  WHERE id = p_task_id::uuid;

  -- Registrar en audit_logs si la tabla existe
  BEGIN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, entity_code, branch_id, actor_user_id, changes)
    VALUES (
      'task_deleted',
      'task',
      p_task_id,
      v_task.code,
      v_task.branch_id,
      v_user_id,
      jsonb_build_object('code', v_task.code, 'title', v_task.title, 'deleted_by', v_user_id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar si la tabla de auditoría no existe o difiere en esquema
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'code', v_task.code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_task(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_task(text) TO anon;
