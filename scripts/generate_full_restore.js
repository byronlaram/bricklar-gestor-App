import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupPath = path.join(__dirname, '..', 'backups', 'bricklar_pre_reset_2026-08-09_073115.json');
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Additional real users that must be in profiles
const extraProfiles = [
  {
    id: '400931a5-ff1b-48c7-ae51-f649c42315a6',
    email: 'moisesmejia419@gmail.com',
    full_name: 'David Perez',
    display_name: 'David',
    phone: '8982-6240',
    is_active: true,
    primary_branch_id: '734d1f4e-daae-465a-9117-6c765e2fbe6d',
    role: 'courier'
  },
  {
    id: '142208d1-e18e-44e6-96ec-c6c2be7eb7aa',
    email: 'torresajeanery@gmail.com',
    full_name: 'Eveling Torres Amaya',
    display_name: 'Eveling',
    phone: '8888-8888',
    is_active: true,
    primary_branch_id: '734d1f4e-daae-465a-9117-6c765e2fbe6d',
    role: 'junior_admin'
  }
];

function escapeVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

let sql = `-- ==============================================================================
-- RESTORE COMPLETE TASKS, WORKDAYS, CASH MOVEMENTS AND PROFILES
-- ==============================================================================

SET session_replication_role = 'replica';

`;

// 1. Roles
if (backup.tables.roles) {
  sql += `-- Roles\n`;
  for (const row of backup.tables.roles) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.roles (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

// 2. Branches
if (backup.tables.branches) {
  sql += `-- Branches\n`;
  for (const row of backup.tables.branches) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.branches (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

// 3. Profiles (backup + extras)
sql += `-- Profiles\n`;
const allProfiles = [...(backup.tables.profiles || [])];
for (const extra of extraProfiles) {
  if (!allProfiles.some(p => p.id === extra.id)) {
    allProfiles.push(extra);
  }
}
for (const row of allProfiles) {
  const cols = Object.keys(row);
  sql += `INSERT INTO public.profiles (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
}

// 4. User Roles
sql += `-- User Roles\n`;
const allUserRoles = [...(backup.tables.user_roles || [])];
allUserRoles.push(
  { user_id: '400931a5-ff1b-48c7-ae51-f649c42315a6', role_id: '80c30c5a-031d-4d1a-a520-640131c3e637' },
  { user_id: '142208d1-e18e-44e6-96ec-c6c2be7eb7aa', role_id: '431288ab-2696-4b9c-9320-58d2e6815c22' }
);
for (const row of allUserRoles) {
  const cols = Object.keys(row);
  sql += `INSERT INTO public.user_roles (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT DO NOTHING;\n`;
}

// 5. User Branches
sql += `-- User Branches\n`;
const allUserBranches = [...(backup.tables.user_branches || [])];
allUserBranches.push(
  { user_id: '400931a5-ff1b-48c7-ae51-f649c42315a6', branch_id: '734d1f4e-daae-465a-9117-6c765e2fbe6d' },
  { user_id: '142208d1-e18e-44e6-96ec-c6c2be7eb7aa', branch_id: '734d1f4e-daae-465a-9117-6c765e2fbe6d' }
);
for (const row of allUserBranches) {
  const cols = Object.keys(row);
  sql += `INSERT INTO public.user_branches (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT DO NOTHING;\n`;
}

// 6. Workdays
if (backup.tables.workdays) {
  sql += `-- Workdays\n`;
  for (const row of backup.tables.workdays) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.workdays (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

// 7. Tasks
if (backup.tables.tasks) {
  sql += `-- Tasks\n`;
  for (const row of backup.tables.tasks) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.tasks (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

// 8. Task Assignments
if (backup.tables.task_assignments) {
  sql += `-- Task Assignments\n`;
  for (const row of backup.tables.task_assignments) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.task_assignments (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

// 9. Task Status History
if (backup.tables.task_status_history) {
  sql += `-- Task Status History\n`;
  for (const row of backup.tables.task_status_history) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.task_status_history (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

// 10. Cash Movements
if (backup.tables.cash_movements) {
  sql += `-- Cash Movements\n`;
  for (const row of backup.tables.cash_movements) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.cash_movements (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

// 11. Settlements
if (backup.tables.settlements) {
  sql += `-- Settlements\n`;
  for (const row of backup.tables.settlements) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.settlements (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

// 12. Daily Closures
if (backup.tables.daily_closures) {
  sql += `-- Daily Closures\n`;
  for (const row of backup.tables.daily_closures) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.daily_closures (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

// 13. Audit Logs
if (backup.tables.audit_logs) {
  sql += `-- Audit Logs\n`;
  for (const row of backup.tables.audit_logs) {
    const cols = Object.keys(row);
    sql += `INSERT INTO public.audit_logs (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => escapeVal(row[c])).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
  }
}

sql += `SET session_replication_role = 'origin';\n`;

const outPath = path.join(__dirname, '..', 'backups', 'full_restore_tasks_and_workdays.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`Generated full restore SQL at ${outPath}`);
