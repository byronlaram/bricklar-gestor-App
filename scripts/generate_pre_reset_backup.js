import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SUPABASE_URL = 'https://awhyddumfhfxqkaebczk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3aHlkZHVtZmhmeHFrYWViY3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODIxMTYsImV4cCI6MjEwMDk1ODExNn0.DvL7DqNyaybOcul9n_YOlbfIEFq5aWrq401vKNPd6A0';

const typesPath = 'c:/Users/MSI Gamer/Documents/ANTIGRAVITY/GESTOR DE TAREAS/src/shared/lib/database.types.ts';
const content = fs.readFileSync(typesPath, 'utf8');

const tablesSection = content.split('Tables: {')[1].split('Views: {')[0];
const tableRegex = /^\s{6}([a-z_0-9]+):\s*\{/gm;

const tables = [];
let match;
while ((match = tableRegex.exec(tablesSection)) !== null) {
  tables.push(match[1]);
}

async function createBackup() {
  console.log('=== BRICKLAR GESTOR - GENERADOR DE BACKUP PRE-RESET ===');

  // Authenticate as Admin
  let token = SUPABASE_ANON_KEY;
  try {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gestorops.com', password: 'Admin1234!' })
    });
    const authData = await authRes.json();
    if (authData.access_token) {
      token = authData.access_token;
      console.log('✔ Autenticado exitosamente como admin');
    }
  } catch (err) {
    console.error('Error autenticando:', err.message);
  }

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      project: 'Bricklar Gestor (GestorDeTareasApp)',
      environment: 'Development / QA',
      purpose: 'Backup previo al Reset para Nuevo Cliente',
      total_tables: tables.length,
    },
    tables: {},
  };

  let totalRows = 0;
  let sqlDump = `-- ==============================================================================\n`;
  sqlDump += `-- BRICKLAR GESTOR — BACKUP COMPLETO PREVIO AL RESET DE NUEVO CLIENTE\n`;
  sqlDump += `-- FECHA: ${backupData.metadata.timestamp}\n`;
  sqlDump += `-- PROYECTO: ${backupData.metadata.project}\n`;
  sqlDump += `-- ==============================================================================\n\n`;

  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        }
      });
      const rows = await res.json();

      if (Array.isArray(rows)) {
        backupData.tables[table] = rows;
        totalRows += rows.length;
        console.log(`✔ Tabla ${table.padEnd(28)} : ${rows.length} registros`);

        if (rows.length > 0) {
          sqlDump += `-- --- Tabla: public.${table} (${rows.length} registros) ---\n`;
          for (const row of rows) {
            const cols = Object.keys(row);
            const vals = cols.map(c => {
              const v = row[c];
              if (v === null || v === undefined) return 'NULL';
              if (typeof v === 'boolean' || typeof v === 'number') return v;
              if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
              return `'${String(v).replace(/'/g, "''")}'`;
            });
            sqlDump += `INSERT INTO public.${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;\n`;
          }
          sqlDump += `\n`;
        }
      } else {
        backupData.tables[table] = [];
        console.log(`⚠ Tabla ${table.padEnd(28)} : Sin datos o error`);
      }
    } catch (err) {
      console.error(`Error respaldando ${table}:`, err.message);
    }
  }

  backupData.metadata['total_rows'] = totalRows;

  // Prepare backup directory inside workspace
  const backupDir = 'c:/Users/MSI Gamer/Documents/ANTIGRAVITY/GESTOR DE TAREAS/backups';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
  const jsonPath = path.join(backupDir, `bricklar_pre_reset_${dateStr}.json`);
  const sqlPath = path.join(backupDir, `bricklar_pre_reset_${dateStr}.sql`);

  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf8');
  fs.writeFileSync(sqlPath, sqlDump, 'utf8');

  // Compute SHA-256 and size
  const jsonSize = fs.statSync(jsonPath).size;
  const sqlSize = fs.statSync(sqlPath).size;

  const jsonBuffer = fs.readFileSync(jsonPath);
  const sqlBuffer = fs.readFileSync(sqlPath);

  const jsonHash = crypto.createHash('sha256').update(jsonBuffer).digest('hex');
  const sqlHash = crypto.createHash('sha256').update(sqlBuffer).digest('hex');

  console.log('\n=== RESUMEN DEL BACKUP GENERADO ===');
  console.log(`Total de Tablas Respaldadas : ${tables.length}`);
  console.log(`Total de Registros Extraídos : ${totalRows}`);
  console.log(`\n1. Archivo JSON:`);
  console.log(`   - Ruta    : ${jsonPath}`);
  console.log(`   - Tamaño  : ${(jsonSize / 1024).toFixed(2)} KB (${jsonSize} bytes)`);
  console.log(`   - SHA256  : ${jsonHash}`);
  console.log(`\n2. Archivo SQL:`);
  console.log(`   - Ruta    : ${sqlPath}`);
  console.log(`   - Tamaño  : ${(sqlSize / 1024).toFixed(2)} KB (${sqlSize} bytes)`);
  console.log(`   - SHA256  : ${sqlHash}`);
}

createBackup();
