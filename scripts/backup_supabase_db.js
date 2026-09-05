/**
 * Script de Backup Automatizado de Base de Datos Supabase (F12-004)
 * Exporta todas las tablas operativas a formato JSON y SQL Dump con marcas de tiempo.
 * Uso: npm run backup:db
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://awhyddumfhfxqkaebczk.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3aHlkZHVtZmhmeHFrYWViY3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODIxMTYsImV4cCI6MjEwMDk1ODExNn0.DvL7DqNyaybOcul9n_YOlbfIEFq5aWrq401vKNPd6A0'

const CORE_TABLES = [
  'branches',
  'profiles',
  'buses',
  'bus_routes',
  'tasks',
  'task_assignments',
  'task_status_history',
  'workdays',
  'settlements',
  'daily_closures',
  'exchange_rates',
  'notifications',
  'audit_logs',
]

async function runDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`)

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log('====================================================')
  console.log('📦 BRICKLAR GESTOR - BACKUP AUTOMATIZADO DE BASE DE DATOS')
  console.log(`🕒 Fecha/Hora: ${new Date().toLocaleString()}`)
  console.log(`📁 Directorio: ${outputDir}`)
  console.log('====================================================\n')

  const summary = {
    timestamp: new Date().toISOString(),
    supabase_url: SUPABASE_URL,
    tables_backed_up: {},
    total_records: 0,
  }

  let fullSqlDump = `-- ==============================================================================\n`
  fullSqlDump += `-- BRICKLAR GESTOR — SQL BACKUP DUMP\n`
  fullSqlDump += `-- GENERADO: ${new Date().toISOString()}\n`
  fullSqlDump += `-- ==============================================================================\n\n`

  for (const table of CORE_TABLES) {
    try {
      process.stdout.write(`⏳ Respaldando tabla: ${table}... `)
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        console.log(`⚠️ (HTTP ${res.status}: ${res.statusText})`)
        summary.tables_backed_up[table] = { status: 'error', code: res.status }
        continue
      }

      const rows = await res.json()
      const rowCount = Array.isArray(rows) ? rows.length : 0
      summary.tables_backed_up[table] = { status: 'success', count: rowCount }
      summary.total_records += rowCount

      // Guardar JSON individual
      const jsonFilePath = path.join(outputDir, `${table}.json`)
      fs.writeFileSync(jsonFilePath, JSON.stringify(rows, null, 2), 'utf8')

      // Generar insert statements para SQL Dump
      if (Array.isArray(rows) && rows.length > 0) {
        fullSqlDump += `-- Tabla: ${table} (${rows.length} registros)\n`
        for (const row of rows) {
          const keys = Object.keys(row)
          const vals = keys.map((k) => {
            const v = row[k]
            if (v === null || v === undefined) return 'NULL'
            if (typeof v === 'number' || typeof v === 'boolean') return v
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
            return `'${String(v).replace(/'/g, "''")}'`
          })
          fullSqlDump += `INSERT INTO public.${table} (${keys.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;\n`
        }
        fullSqlDump += `\n`
      }

      console.log(`✔ OK (${rowCount} registros)`)
    } catch (err) {
      console.log(`❌ Error: ${err.message}`)
      summary.tables_backed_up[table] = { status: 'failed', error: err.message }
    }
  }

  // Guardar metadata y SQL dump
  fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(summary, null, 2), 'utf8')
  fs.writeFileSync(path.join(outputDir, 'full_backup.sql'), fullSqlDump, 'utf8')

  console.log('\n====================================================')
  console.log(`🎉 BACKUP COMPLETADO EXITOSAMENTE`)
  console.log(`📊 Total Registros Respaldados: ${summary.total_records}`)
  console.log(`📄 Archivos generados en: ${outputDir}`)
  console.log('====================================================\n')
}

runDatabaseBackup().catch((err) => {
  console.error('Error fatal durante el backup:', err)
  process.exit(1)
})
