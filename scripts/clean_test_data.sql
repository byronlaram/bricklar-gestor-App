-- Clean test phase data and keep only real team and active catalogues
BEGIN;

-- 1. Remove test tasks, assignments, status history
DELETE FROM task_status_history;
DELETE FROM task_assignments;
DELETE FROM tasks;

-- 2. Remove test workdays, movements, settlements
DELETE FROM settlement_adjustments;
DELETE FROM settlements;
DELETE FROM cash_movements;
DELETE FROM workdays;

-- 3. Remove test profiles (profiles without real auth user)
DELETE FROM profiles 
WHERE id NOT IN (
  '11d5ac93-ede7-4b86-a4bd-20939253e2d0',
  '400931a5-ff1b-48c7-ae51-f649c42315a6',
  '142208d1-e18e-44e6-96ec-c6c2be7eb7aa'
);

-- 4. Ensure real users have proper roles and branch assignments
UPDATE profiles 
SET 
  role = 'general_admin', 
  is_active = true,
  primary_branch_id = (SELECT id FROM branches WHERE code = 'MGA' LIMIT 1)
WHERE id = '11d5ac93-ede7-4b86-a4bd-20939253e2d0';

UPDATE profiles 
SET 
  role = 'courier', 
  is_active = true,
  primary_branch_id = (SELECT id FROM branches WHERE code = 'MGA' LIMIT 1)
WHERE id = '400931a5-ff1b-48c7-ae51-f649c42315a6';

UPDATE profiles 
SET 
  role = 'junior_admin', 
  is_active = true,
  primary_branch_id = (SELECT id FROM branches WHERE code = 'MGA' LIMIT 1)
WHERE id = '142208d1-e18e-44e6-96ec-c6c2be7eb7aa';

COMMIT;
