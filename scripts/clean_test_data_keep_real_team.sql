-- ==============================================================================
-- LIMPIEZA DE DATOS DE PRUEBA Y CONSERVACIÓN DEL EQUIPO REAL
-- ==============================================================================

-- 1. Eliminar tareas, asignaciones e historiales de prueba
DELETE FROM public.task_status_history;
DELETE FROM public.task_assignments;
DELETE FROM public.tasks;
DELETE FROM public.task_sequences;

-- 2. Eliminar jornadas, liquidaciones y movimientos de caja de prueba
DELETE FROM public.settlement_adjustments;
DELETE FROM public.settlements;
DELETE FROM public.daily_closures;
DELETE FROM public.cash_transfers;
DELETE FROM public.cash_movements;
DELETE FROM public.financial_movements;
DELETE FROM public.workdays;

-- 3. Eliminar logs de auditoría y notificaciones de prueba
DELETE FROM public.audit_logs;
DELETE FROM public.notifications;
DELETE FROM public.notification_preferences;

-- 4. Conservar únicamente los 3 usuarios reales en user_branches, user_roles y profiles
DELETE FROM public.courier_branch_assignments;

DELETE FROM public.user_branches 
WHERE user_id NOT IN (
  '11d5ac93-ede7-4b86-a4bd-20939253e2d0', -- admin@gestorops.com
  '400931a5-ff1b-48c7-ae51-f649c42315a6', -- moisesmejia419@gmail.com (David Perez)
  '142208d1-e18e-44e6-96ec-c6c2be7eb7aa'  -- torresajeanery@gmail.com (Eveling Torres Amaya)
);

DELETE FROM public.user_roles 
WHERE user_id NOT IN (
  '11d5ac93-ede7-4b86-a4bd-20939253e2d0',
  '400931a5-ff1b-48c7-ae51-f649c42315a6',
  '142208d1-e18e-44e6-96ec-c6c2be7eb7aa'
);

DELETE FROM public.profiles 
WHERE id NOT IN (
  '11d5ac93-ede7-4b86-a4bd-20939253e2d0',
  '400931a5-ff1b-48c7-ae51-f649c42315a6',
  '142208d1-e18e-44e6-96ec-c6c2be7eb7aa'
);

-- 5. Eliminar usuarios de prueba de auth.users para evitar confusión en autenticación
DELETE FROM auth.users
WHERE id NOT IN (
  '11d5ac93-ede7-4b86-a4bd-20939253e2d0',
  '400931a5-ff1b-48c7-ae51-f649c42315a6',
  '142208d1-e18e-44e6-96ec-c6c2be7eb7aa'
);

-- 6. Asegurar que los perfiles y roles del equipo real estén exactos y vinculados a Managua
INSERT INTO public.profiles (
  id, email, full_name, display_name, phone, is_active, primary_branch_id, role
) VALUES 
  ('11d5ac93-ede7-4b86-a4bd-20939253e2d0', 'admin@gestorops.com', 'Administrador General', 'Admin', '8888-7777', true, '734d1f4e-daae-465a-9117-6c765e2fbe6d', 'general_admin'),
  ('400931a5-ff1b-48c7-ae51-f649c42315a6', 'moisesmejia419@gmail.com', 'David Perez', 'David', '8982-6240', true, '734d1f4e-daae-465a-9117-6c765e2fbe6d', 'courier'),
  ('142208d1-e18e-44e6-96ec-c6c2be7eb7aa', 'torresajeanery@gmail.com', 'Eveling Torres Amaya', 'Eveling', '8888-8888', true, '734d1f4e-daae-465a-9117-6c765e2fbe6d', 'junior_admin')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  display_name = EXCLUDED.display_name,
  phone = EXCLUDED.phone,
  is_active = true,
  primary_branch_id = EXCLUDED.primary_branch_id,
  role = EXCLUDED.role;

-- Vincular roles
INSERT INTO public.user_roles (user_id, role_id)
VALUES
  ('11d5ac93-ede7-4b86-a4bd-20939253e2d0', 'e89590c3-12ae-4274-9984-c3af6a25cbd1'),
  ('400931a5-ff1b-48c7-ae51-f649c42315a6', '80c30c5a-031d-4d1a-a520-640131c3e637'),
  ('142208d1-e18e-44e6-96ec-c6c2be7eb7aa', '431288ab-2696-4b9c-9320-58d2e6815c22')
ON CONFLICT DO NOTHING;

-- Vincular a sucursal Managua
INSERT INTO public.user_branches (user_id, branch_id)
VALUES
  ('11d5ac93-ede7-4b86-a4bd-20939253e2d0', '734d1f4e-daae-465a-9117-6c765e2fbe6d'),
  ('400931a5-ff1b-48c7-ae51-f649c42315a6', '734d1f4e-daae-465a-9117-6c765e2fbe6d'),
  ('142208d1-e18e-44e6-96ec-c6c2be7eb7aa', '734d1f4e-daae-465a-9117-6c765e2fbe6d')
ON CONFLICT DO NOTHING;
