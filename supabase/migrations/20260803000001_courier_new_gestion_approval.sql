-- Migration: Courier New Gestion & Approval Workflow
-- Date: 2026-08-03

-- 1. Agregar columnas a la tabla `tasks`
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS creation_origin TEXT NOT NULL DEFAULT 'admin' CHECK (creation_origin IN ('admin', 'courier_created')),
  ADD COLUMN IF NOT EXISTS evidence_url TEXT;

-- Index para optimizar consultas de tareas pendientes de aprobación
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON public.tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_tasks_creation_origin ON public.tasks(creation_origin);

-- 2. Asegurar políticas RLS para inserción por parte del motorizado
-- Permitir que un motorizado cree tareas únicamente para sí mismo
DROP POLICY IF EXISTS "Couriers can insert own tasks" ON public.tasks;
CREATE POLICY "Couriers can insert own tasks" ON public.tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND assigned_courier_id = auth.uid()
  );

-- Permitir que los administradores actualicen el estado de aprobación
DROP POLICY IF EXISTS "Admins can update approval status" ON public.tasks;
CREATE POLICY "Admins can update approval status" ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('general_admin', 'junior_admin')
    )
  );

-- 3. Políticas RLS para la tabla `workdays`
ALTER TABLE public.workdays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couriers can insert own workdays" ON public.workdays;
CREATE POLICY "Couriers can insert own workdays" ON public.workdays
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND courier_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can view workdays" ON public.workdays;
CREATE POLICY "Users can view workdays" ON public.workdays
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

DROP POLICY IF EXISTS "Couriers can update own workdays" ON public.workdays;
CREATE POLICY "Couriers can update own workdays" ON public.workdays
  FOR UPDATE
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
