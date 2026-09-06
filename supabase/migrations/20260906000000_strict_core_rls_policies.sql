-- ==============================================================================
-- MIGRATION: 20260906000000_strict_core_rls_policies.sql
-- Políticas RLS completas y estrictas para: profiles, tasks, settlements, cash_movements
-- Garantiza aislamiento total entre motorizados e integridad para administradores.
-- ==============================================================================

-- 1. TABLA: PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "profiles_insert_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_insert_own_or_admin" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'general_admin'
    )
  );

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'general_admin'
    )
  );

DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
CREATE POLICY "profiles_delete_admin_only" ON public.profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'general_admin'
    )
  );


-- 2. TABLA: TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      assigned_courier_id = auth.uid()
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('general_admin', 'junior_admin')
      )
    )
  );

DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      (created_by = auth.uid() AND assigned_courier_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('general_admin', 'junior_admin')
      )
    )
  );

DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      assigned_courier_id = auth.uid()
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('general_admin', 'junior_admin')
      )
    )
  );

DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('general_admin', 'junior_admin')
    )
  );


-- 3. TABLA: SETTLEMENTS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settlements_select_policy" ON public.settlements;
CREATE POLICY "settlements_select_policy" ON public.settlements
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      courier_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('general_admin', 'junior_admin')
      )
    )
  );

DROP POLICY IF EXISTS "settlements_insert_policy" ON public.settlements;
CREATE POLICY "settlements_insert_policy" ON public.settlements
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      courier_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('general_admin', 'junior_admin')
      )
    )
  );

DROP POLICY IF EXISTS "settlements_update_policy" ON public.settlements;
CREATE POLICY "settlements_update_policy" ON public.settlements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('general_admin', 'junior_admin')
    )
  );

DROP POLICY IF EXISTS "settlements_delete_policy" ON public.settlements;
CREATE POLICY "settlements_delete_policy" ON public.settlements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'general_admin'
    )
  );


-- 4. TABLA: CASH_MOVEMENTS
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_movements_select_policy" ON public.cash_movements;
CREATE POLICY "cash_movements_select_policy" ON public.cash_movements
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      courier_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('general_admin', 'junior_admin')
      )
    )
  );

DROP POLICY IF EXISTS "cash_movements_insert_policy" ON public.cash_movements;
CREATE POLICY "cash_movements_insert_policy" ON public.cash_movements
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      courier_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('general_admin', 'junior_admin')
      )
    )
  );

DROP POLICY IF EXISTS "cash_movements_update_policy" ON public.cash_movements;
CREATE POLICY "cash_movements_update_policy" ON public.cash_movements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('general_admin', 'junior_admin')
      )
  );

DROP POLICY IF EXISTS "cash_movements_delete_policy" ON public.cash_movements;
CREATE POLICY "cash_movements_delete_policy" ON public.cash_movements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'general_admin'
    )
  );
