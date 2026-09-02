import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupPath = path.join(__dirname, '..', 'backups', 'bricklar_pre_reset_2026-08-09_073115.json');
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Dependency order for restoration
const orderedTables = [
  'roles',
  'branches',
  'profiles',
  'user_roles',
  'user_branches',
  'app_settings',
  'destinations',
  'bus_routes',
  'workdays',
  'tasks',
  'task_assignments',
  'task_status_history',
  'cash_movements',
  'settlements',
  'daily_closures',
  'audit_logs',
  'notifications',
  'notification_preferences'
];

function escapeVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

let sql = `-- ==============================================================================
-- RESTORE FROM BACKUP
-- ==============================================================================

SET session_replication_role = 'replica'; -- Bypass FK constraints during restore

`;

for (const tableName of orderedTables) {
  const rows = backup.tables[tableName];
  if (!rows || rows.length === 0) continue;

  sql += `-- Table: public.${tableName} (${rows.length} rows)\n`;
  for (const row of rows) {
    const cols = Object.keys(row);
    const colNames = cols.map(c => `"${c}"`).join(', ');
    const values = cols.map(c => escapeVal(row[c])).join(', ');
    sql += `INSERT INTO public.${tableName} (${colNames}) VALUES (${values}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
  sql += '\n';
}

sql += `SET session_replication_role = 'origin';\n`;

const outPath = path.join(__dirname, '..', 'backups', 'ordered_restore.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`Generated ordered SQL at ${outPath}`);
