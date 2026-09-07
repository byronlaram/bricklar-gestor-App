-- ==============================================================================
-- MIGRATION: 20260907000000_get_couriers_rpc_and_rls.sql
-- Asegura acceso irrestricto de lectura a perfiles y asignaciones de sucursal
-- para administradores generales, administradores junior y motorizados,
-- además de proveer una función RPC (SECURITY DEFINER) para el catálogo de repartidores.
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

-- 2. Función RPC get_couriers_for_branch (SECURITY DEFINER)
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
