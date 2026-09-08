-- ==============================================================================
-- ÍNDICES DE ALTO RENDIMIENTO PARA SUPABASE POSTGRESQL
-- Optimiza la velocidad de consulta en tareas, liquidaciones, jornadas y motorizados.
-- Ejecutar en SQL Editor de Supabase.
-- ==============================================================================

-- 1. Índices para la tabla TASKS
CREATE INDEX IF NOT EXISTS idx_tasks_courier_date_status 
  ON public.tasks(assigned_courier_id, scheduled_date, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_branch_date_status 
  ON public.tasks(branch_id, scheduled_date, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_status 
  ON public.tasks(status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date 
  ON public.tasks(scheduled_date) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_code 
  ON public.tasks(code);

-- 2. Índices para la tabla WORKDAYS
CREATE INDEX IF NOT EXISTS idx_workdays_courier_status 
  ON public.workdays(courier_id, status);

CREATE INDEX IF NOT EXISTS idx_workdays_branch_date 
  ON public.workdays(branch_id, work_date);

-- 3. Índices para la tabla SETTLEMENTS
CREATE INDEX IF NOT EXISTS idx_settlements_courier_date 
  ON public.settlements(courier_id, settlement_date);

CREATE INDEX IF NOT EXISTS idx_settlements_status 
  ON public.settlements(status);

CREATE INDEX IF NOT EXISTS idx_settlements_workday 
  ON public.settlements(workday_id);

-- 4. Índices para CASH_MOVEMENTS
CREATE INDEX IF NOT EXISTS idx_cash_movements_workday 
  ON public.cash_movements(workday_id);

-- 5. Índices para NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON public.notifications(user_id, read_at) 
  WHERE read_at IS NULL;

-- 6. Índices para USER_BRANCHES y PROFILES
CREATE INDEX IF NOT EXISTS idx_user_branches_user_branch 
  ON public.user_branches(user_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role_active 
  ON public.profiles(role, is_active);
