-- Sincronización de perfiles reales actuales
INSERT INTO public.profiles (
  id, email, full_name, display_name, phone, is_active, primary_branch_id, role, created_at, updated_at
) VALUES (
  '400931a5-ff1b-48c7-ae51-f649c42315a6',
  'moisesmejia419@gmail.com',
  'David Perez',
  'David',
  '8982-6240',
  true,
  '734d1f4e-daae-465a-9117-6c765e2fbe6d',
  'courier',
  '2026-08-16 01:09:03.510392+00',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true,
  primary_branch_id = EXCLUDED.primary_branch_id;

INSERT INTO public.profiles (
  id, email, full_name, display_name, phone, is_active, primary_branch_id, role, created_at, updated_at
) VALUES (
  '142208d1-e18e-44e6-96ec-c6c2be7eb7aa',
  'torresajeanery@gmail.com',
  'Eveling Torres Amaya',
  'Eveling',
  '8888-8888',
  true,
  '734d1f4e-daae-465a-9117-6c765e2fbe6d',
  'junior_admin',
  '2026-08-16 01:41:46.892711+00',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true,
  primary_branch_id = EXCLUDED.primary_branch_id;

-- Roles
INSERT INTO public.user_roles (user_id, role_id)
VALUES 
  ('400931a5-ff1b-48c7-ae51-f649c42315a6', '80c30c5a-031d-4d1a-a520-640131c3e637')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id)
VALUES 
  ('142208d1-e18e-44e6-96ec-c6c2be7eb7aa', '431288ab-2696-4b9c-9320-58d2e6815c22')
ON CONFLICT (id) DO NOTHING;

-- Sucursales
INSERT INTO public.user_branches (user_id, branch_id)
VALUES
  ('400931a5-ff1b-48c7-ae51-f649c42315a6', '734d1f4e-daae-465a-9117-6c765e2fbe6d')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_branches (user_id, branch_id)
VALUES
  ('142208d1-e18e-44e6-96ec-c6c2be7eb7aa', '734d1f4e-daae-465a-9117-6c765e2fbe6d')
ON CONFLICT (id) DO NOTHING;
