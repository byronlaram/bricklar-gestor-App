import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://awhyddumfhfxqkaebczk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3aHlkZHVtZmhmeHFrYWViY3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODIxMTYsImV4cCI6MjEwMDk1ODExNn0.DvL7DqNyaybOcul9n_YOlbfIEFq5aWrq401vKNPd6A0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runDryRun() {
  console.log('=== VERIFICACIÓN PREVIA (DRY-RUN) VIA SUPABASE CLIENT ===');
  
  // Login as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@gestorops.com',
    password: 'Admin1234!'
  });

  if (authError) {
    console.error('Error de inicio de sesión:', authError.message);
    return;
  }

  console.log('✔ Sesión iniciada como:', authData.user.email, '| ID:', authData.user.id);

  const tablesToCount = [
    'audit_logs',
    'notifications',
    'notification_preferences',
    'task_status_history',
    'task_assignments',
    'tasks',
    'settlement_adjustments',
    'settlements',
    'daily_closures',
    'cash_transfers',
    'cash_movements',
    'financial_movements',
    'exchange_rates',
    'workdays',
    'task_sequences',
    'courier_branch_assignments',
    'user_branches',
    'user_roles',
    'profiles',
    'branches',
    'app_settings',
    'roles',
    'destinations',
    'bus_routes',
    'bus_schedules',
    'transport_services'
  ];

  console.log('\nConteo actual de filas por tabla:');
  for (const table of tablesToCount) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  - ${table.padEnd(28)} : ERROR (${error.message})`);
    } else {
      console.log(`  - ${table.padEnd(28)} : ${count} filas`);
    }
  }

  // Check Admin General profile & user_role specifically
  const { data: adminProfile } = await supabase.from('profiles').select('*').eq('id', '11d5ac93-ede7-4b86-a4bd-20939253e2d0').single();
  console.log('\nPerfil de Admin General:', adminProfile ? `${adminProfile.full_name} (${adminProfile.email}) - Rol: ${adminProfile.role}` : 'NO ENCONTRADO!');

  const { data: adminRoles } = await supabase.from('user_roles').select('*').eq('user_id', '11d5ac93-ede7-4b86-a4bd-20939253e2d0');
  console.log('Roles de Admin General:', adminRoles);
}

runDryRun();
