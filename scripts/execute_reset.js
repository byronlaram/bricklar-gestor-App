import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://awhyddumfhfxqkaebczk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3aHlkZHVtZmhmeHFrYWViY3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODIxMTYsImV4cCI6MjEwMDk1ODExNn0.DvL7DqNyaybOcul9n_YOlbfIEFq5aWrq401vKNPd6A0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_ID = '11d5ac93-ede7-4b86-a4bd-20939253e2d0';
const ADMIN_EMAIL = 'admin@gestorops.com';

async function main() {
  console.log('========================================================================');
  console.log('  BRICKLAR GESTOR — EJECUCIÓN DE RESET CONTROLADO PARA NUEVO CLIENTE   ');
  console.log('========================================================================\n');

  // 1. Authenticate as Admin General
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: 'Admin1234!'
  });

  if (authError || !authData?.session) {
    console.error('❌ Error fatal de autenticación:', authError?.message);
    process.exit(1);
  }

  console.log(`✔ Sesión iniciada correctamente como: ${authData.user.email} (ID: ${authData.user.id})\n`);
  const accessToken = authData.session.access_token;

  // 2. Fetch all non-admin profiles to identify test users to delete
  const { data: testProfiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .neq('id', ADMIN_ID);

  if (profErr) {
    console.error('❌ Error obteniendo perfiles de prueba:', profErr.message);
    process.exit(1);
  }

  console.log(`📋 Perfiles de prueba identificados para eliminación (${testProfiles.length}):`);
  testProfiles.forEach(p => console.log(`   - ${p.id} | ${p.email} | ${p.full_name} (${p.role})`));
  console.log('');

  // 3. Clear Operational Tables in transactional / safe order
  const operationalDeletions = [
    { table: 'audit_logs', query: () => supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'notifications', query: () => supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'notification_preferences', query: () => supabase.from('notification_preferences').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'task_status_history', query: () => supabase.from('task_status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'task_assignments', query: () => supabase.from('task_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'tasks', query: () => supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'settlement_adjustments', query: () => supabase.from('settlement_adjustments').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'settlements', query: () => supabase.from('settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'daily_closures', query: () => supabase.from('daily_closures').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'cash_transfers', query: () => supabase.from('cash_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'cash_movements', query: () => supabase.from('cash_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'financial_movements', query: () => supabase.from('financial_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'exchange_rates', query: () => supabase.from('exchange_rates').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'workdays', query: () => supabase.from('workdays').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'task_sequences', query: () => supabase.from('task_sequences').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'courier_branch_assignments', query: () => supabase.from('courier_branch_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
    { table: 'user_branches', query: () => supabase.from('user_branches').delete().neq('id', '00000000-0000-0000-0000-000000000000') },
  ];

  console.log('🧹 Limpiando tablas operativas de prueba...');
  for (const item of operationalDeletions) {
    const { error } = await item.query();
    if (error) {
      console.error(`❌ Error eliminando registros de ${item.table}:`, error.message);
      process.exit(1);
    }
    console.log(`  ✔ Tabla ${item.table.padEnd(28)} limpiada`);
  }

  // 4. Delete test users (Profiles + Supabase Auth) using edge function `delete-user`
  console.log('\n👤 Eliminando usuarios y motorizados de prueba en Auth + Profiles...');
  let authUsersDeleted = 0;
  for (const p of testProfiles) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ userId: p.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        console.log(`  ✔ Usuario eliminado (Auth + Profile): ${p.email} (${p.id})`);
        authUsersDeleted++;
      } else {
        console.warn(`  ⚠ Error en delete-user function para ${p.email}:`, data.error || data);
        // Fallback: Delete from user_roles and profiles directly if function failed
        await supabase.from('user_roles').delete().eq('user_id', p.id);
        const { error: pDelErr } = await supabase.from('profiles').delete().eq('id', p.id);
        if (!pDelErr) {
          console.log(`  ✔ Perfil eliminado directamente: ${p.email}`);
        } else {
          console.error(`  ❌ No se pudo eliminar perfil ${p.email}:`, pDelErr.message);
        }
      }
    } catch (err) {
      console.error(`  ❌ Excepción eliminando ${p.email}:`, err.message);
    }
  }

  // 5. Delete test branches ("Managua")
  console.log('\n🏢 Eliminando sucursales de prueba...');
  const { error: branchErr } = await supabase.from('branches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (branchErr) {
    console.error('❌ Error eliminando sucursales:', branchErr.message);
  } else {
    console.log('  ✔ Tabla branches limpiada (0 sucursales permanecen)');
  }

  // 6. Reset operational settings (Factory default)
  console.log('\n⚙ Restableciendo app_settings a fábrica...');
  const { error: settingsErr } = await supabase
    .from('app_settings')
    .update({
      value_json: { enabled: true, allow_not_available: true },
      updated_at: new Date().toISOString()
    })
    .eq('key', 'odometer_settings');

  if (settingsErr) {
    console.error('❌ Error actualizando app_settings:', settingsErr.message);
  } else {
    console.log('  ✔ odometer_settings restablecido a {"enabled": true, "allow_not_available": true}');
  }

  console.log('\n========================================================================');
  console.log('  RESET COMPLETADO — INICIANDO VERIFICACIÓN POST-RESET');
  console.log('========================================================================\n');

  // 7. Post-Reset Audit Verification
  const tablesToVerify = [
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

  console.log('Conteo final por tabla:');
  const postCounts = {};
  for (const table of tablesToVerify) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    postCounts[table] = count;
    console.log(`  - ${table.padEnd(28)} : ${count} filas`);
  }

  // 8. Verify Admin General account integrity
  const { data: adminProfCheck } = await supabase.from('profiles').select('*').eq('id', ADMIN_ID).single();
  const { data: adminRoleCheck } = await supabase.from('user_roles').select('*').eq('user_id', ADMIN_ID);

  console.log('\n🔒 VERIFICACIÓN DEL ADMINISTRADOR GENERAL:');
  console.log(`  - ID                   : ${adminProfCheck?.id}`);
  console.log(`  - Email                : ${adminProfCheck?.email}`);
  console.log(`  - Nombre               : ${adminProfCheck?.full_name}`);
  console.log(`  - Rol en perfil        : ${adminProfCheck?.role}`);
  console.log(`  - Registros user_roles : ${adminRoleCheck?.length}`);

  if (adminProfCheck && adminProfCheck.email === ADMIN_EMAIL && adminProfCheck.role === 'general_admin' && adminRoleCheck?.length === 1) {
    console.log('\n✅ ADMINISTRADOR GENERAL INTACTO Y TOTALMENTE VERIFICADO.');
  } else {
    console.error('\n❌ ATENCIÓN: INCONSISTENCIA DETECTADA EN EL ADMINISTRADOR GENERAL.');
  }
}

main();
