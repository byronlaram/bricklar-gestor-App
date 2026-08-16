import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://awhyddumfhfxqkaebczk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3aHlkZHVtZmhmeHFrYWViY3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODIxMTYsImV4cCI6MjEwMDk1ODExNn0.DvL7DqNyaybOcul9n_YOlbfIEFq5aWrq401vKNPd6A0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabaseResetState() {
  console.log('=== VERIFICANDO ESTADO DE LA BASE DE DATOS Y RESET ===');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@gestorops.com',
    password: 'Admin1234!'
  });

  if (authError) {
    console.error('Error de login:', authError.message);
    return;
  }
  console.log('✔ Sesión activa como:', authData.user.email);

  // Tablas y recuentos actuales
  const tables = [
    'profiles',
    'branches',
    'tasks',
    'workdays',
    'cash_movements',
    'settlements',
    'bus_routes',
    'app_settings',
    'audit_logs',
    'notifications'
  ];

  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) console.log(`- ${t}: Error (${error.message})`);
    else console.log(`- ${t}: ${count} registros`);
  }
}

checkDatabaseResetState();
