-- ==============================================================================
-- FIX RLS: Permitir que todos los usuarios autenticados (incluido Junior Admin)
-- puedan consultar perfiles de motorizados y otros usuarios para asignación de tareas
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Política de lectura universal para autenticados
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Asegurar lectura de user_branches para autenticados
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_branches_select_authenticated" ON public.user_branches;
CREATE POLICY "user_branches_select_authenticated" ON public.user_branches
  FOR SELECT
  TO authenticated
  USING (true);
