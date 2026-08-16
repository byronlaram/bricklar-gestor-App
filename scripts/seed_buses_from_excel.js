import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://awhyddumfhfxqkaebczk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3aHlkZHVtZmhmeHFrYWViY3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODIxMTYsImV4cCI6MjEwMDk1ODExNn0.DvL7DqNyaybOcul9n_YOlbfIEFq5aWrq401vKNPd6A0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSeed() {
  console.log('=== ACTUALIZACIÓN DEL DIRECTORIO DE BUSES (121 RUTAS REALES) ===');

  // 1. Login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@gestorops.com',
    password: 'Admin1234!'
  });

  if (authError) {
    console.error('Error de autenticación:', authError.message);
    process.exit(1);
  }
  console.log('✔ Sesión iniciada con éxito como:', authData.user.email);

  // 2. Backup current records
  const { data: currentBuses, error: fetchErr } = await supabase.from('bus_routes').select('*');
  if (fetchErr) {
    console.error('Error obteniendo registros actuales:', fetchErr.message);
    process.exit(1);
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `bus_routes_backup_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(currentBuses || [], null, 2), 'utf8');
  console.log(`✔ Respaldo guardado en ${backupFile} (${(currentBuses || []).length} registros respaldados)`);

  // 3. Load cleaned data
  const cleanedFile = path.join(__dirname, 'cleaned_buses_for_db.json');
  const cleanedData = JSON.parse(fs.readFileSync(cleanedFile, 'utf8'));
  console.log(`✔ Se prepararon ${cleanedData.length} registros para insertar`);

  // 4. Delete existing rows
  if (currentBuses && currentBuses.length > 0) {
    const ids = currentBuses.map(b => b.id);
    const { error: delErr } = await supabase.from('bus_routes').delete().in('id', ids);
    if (delErr) {
      console.error('Error eliminando registros anteriores:', delErr.message);
      process.exit(1);
    }
    console.log(`✔ Eliminados ${ids.length} registros antiguos de prueba.`);
  }

  // 5. Insert new records in chunks of 25
  const payloadToInsert = cleanedData.map(c => ({
    destination_city: c.destination_city,
    cooperative_name: c.cooperative_name,
    origin_terminal: c.origin_terminal,
    departure_schedules: c.departure_schedules,
    dispatch_phone: c.dispatch_phone,
    notes: c.notes,
    is_active: true
  }));

  const chunkSize = 25;
  for (let i = 0; i < payloadToInsert.length; i += chunkSize) {
    const chunk = payloadToInsert.slice(i, i + chunkSize);
    const { error: insErr } = await supabase.from('bus_routes').insert(chunk);
    if (insErr) {
      console.error(`Error insertando bloque ${i} - ${i + chunk.length}:`, insErr.message);
      process.exit(1);
    }
    console.log(`  - Insertados ${Math.min(i + chunkSize, payloadToInsert.length)} / ${payloadToInsert.length} registros...`);
  }

  // 6. Verify count
  const { data: finalRoutes, count, error: countErr } = await supabase
    .from('bus_routes')
    .select('*', { count: 'exact' });

  if (countErr) {
    console.error('Error verificando inserción:', countErr.message);
    process.exit(1);
  }

  console.log(`\n🎉 ÉXITO TOTAL: Se han cargado ${finalRoutes.length} rutas reales de buses en Supabase.`);

  // Generate SQL migration file
  generateSqlMigration(payloadToInsert);
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSqlMigration(routes) {
  const values = routes.map(r => {
    return `  (${escapeSql(r.destination_city)}, ${escapeSql(r.cooperative_name)}, ${escapeSql(r.origin_terminal)}, ${escapeSql(r.departure_schedules)}, ${escapeSql(r.dispatch_phone)}, ${escapeSql(r.notes)}, true)`;
  }).join(',\n');

  const sql = `-- ============================================================================
-- MIGRATION: Seed Real Bus Routes Catalog (121 routes from buses.xlsx)
-- ============================================================================

DELETE FROM public.bus_routes;

INSERT INTO public.bus_routes (
  destination_city,
  cooperative_name,
  origin_terminal,
  departure_schedules,
  dispatch_phone,
  notes,
  is_active
) VALUES
${values};
`;

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260816000000_seed_real_bus_routes.sql');
  fs.writeFileSync(migrationPath, sql, 'utf8');
  console.log(`✔ Archivo de migración SQL generado en: ${migrationPath}`);
}

runSeed();
