# BRICKLAR GESTOR
# BACKUP PREVIO AL RESET — INFORME DE VERIFICACIÓN Y COBERTURA

> **Estado**: `BACKUP POSTGRESQL NO VERIFICADO — RESET BLOQUEADO`  
> **Fecha y Hora de Auditoría**: 9 de Agosto, 2026 — 21:25 CST (10 de Agosto, 2026 — 03:25 UTC)  
> **Proyecto**: Bricklar Gestor (`GestorDeTareasApp`)

---

## 1. Fecha y Hora

- **Fecha**: 9 de Agosto de 2026 (Local CST) / 10 de Agosto de 2026 (UTC)
- **Hora**: 09:25 PM (CST / Local) | 03:25 AM (UTC)

---

## 2. Motivo del Backup

- **Propósito**: Establecer un respaldo multicapa (Capa 1: Snapshot de Datos PostgREST + Capa 2: Dump PostgreSQL / Supabase CLI) del esquema y datos del proyecto **GestorDeTareasApp** antes de autorizar la ejecución del **Reset para Nuevo Cliente** (`reset_for_new_client.sql`).

---

## 3. Entorno e Infraestructura

- **Proyecto Supabase**: `GestorDeTareasApp` (Ref ID: `awhyddumfhfxqkaebczk`)
- **Host Postgres**: `db.awhyddumfhfxqkaebczk.supabase.co` / `aws-0-us-east-1.pooler.supabase.com`
- **Versión Postgres**: PostgreSQL 17.6.1.147 (Engine 17)
- **Esquema Principal**: `public` (26 tablas)

---

# CAPA 1 — SNAPSHOT DE DATOS VÍA POSTGREST (JSON + SQL DML)

### 1. Método y Ejecución
- **Script Autenticado**: `scripts/generate_pre_reset_backup.js`
- **Mecanismo**: Extracción de datos vía API PostgREST autenticada con token del usuario Administrador General (`admin@gestorops.com`).
- **Naturaleza**: Respaldo exclusivo de datos planos (DML) de las 26 tablas del esquema público en formato JSON e instrucciones SQL `INSERT INTO ... ON CONFLICT DO NOTHING`.

### 2. Archivos Persistidos e Intactos en `backups/`
1. **JSON Snapshot**: `bricklar_pre_reset_2026-08-09_073115.json`
   - **Ruta**: `backups/bricklar_pre_reset_2026-08-09_073115.json`
   - **Tamaño**: `96.30 KB` (98,609 bytes)
   - **SHA-256**: `41655bc3390943e6acfe098ab6ad49ae9cdf3ac47096138a35ffdc8548940ccb`
   - **Estado**: INTACTO Y VERIFICADO.

2. **SQL DML Snapshot**: `bricklar_pre_reset_2026-08-09_073115.sql`
   - **Ruta**: `backups/bricklar_pre_reset_2026-08-09_073115.sql`
   - **Tamaño**: `82.91 KB` (84,896 bytes)
   - **SHA-256**: `4cfac8fc0c425683e85f72d7b91100f0ad8dfc0f865b125a69115f677e168c77`
   - **Estado**: INTACTO Y VERIFICADO.

### 3. Cobertura de la Capa 1
- **Tablas Respaldadas**: 26 tablas en `public` (168 registros totales).
- **Limitación de Capa 1**: NO incluye DDL (esquema, tipos, funciones, triggers, RLS, secuencias) ni el esquema `auth`.

---

# CAPA 2 — DUMP POSTGRESQL / SUPABASE CLI

### 1. Herramientas Inspeccionadas en el Entorno
- **Supabase CLI**: Disponible e instalada (`v2.113.0` vía `npx supabase`). Estado: Vinculada correctamente al proyecto `awhyddumfhfxqkaebczk` (`GestorDeTareasApp`).
- **Docker Desktop**: NO instalado en el sistema (`docker` no disponible).
- **pg_dump**: NO instalado nativamente en el PATH del sistema Windows.
- **psql**: NO instalado nativamente en el PATH del sistema Windows.

### 2. Intento de Generación de Dump Real
Se ejecutó la inspección y prueba oficial de generación mediante Supabase CLI:
```bash
npx supabase db dump --linked -f backups/bricklar_pre_reset_schema.sql
```
**Resultado del comando**:
- La CLI de Supabase inició el rol temporal de login (`Initialising login role...`).
- Al invocar la exportación (`Dumping schemas from remote database...`), la CLI falló con el error:
  `LegacyDockerRunError: failed to run docker. Docker Desktop is a prerequisite for local development.`

### 3. Diagnóstico de Prerrequisitos Faltantes
Para completar un dump PostgreSQL real de Capa 2 desde la consola local se requiere uno de los siguientes elementos:

1. **Opción A (Recomendada Supabase CLI)**: Tener **Docker Desktop** instalado y en ejecución en la máquina. Con Docker activo, el comando `npx supabase db dump --linked -f backups/bricklar_pre_reset_schema_YYYY-MM-DD_HHMM.sql` ejecuta la herramienta oficial de volcado aislada sin requerir binarios Postgres en el host.
2. **Opción B (Acceso Postgres Directo / pg_dump nativo)**: Contar con la **Contraseña de Base de Datos PostgreSQL** (Database Password del usuario `postgres` en Supabase Dashboard) y tener el binario nativo `pg_dump.exe` (PostgreSQL 17) en el PATH del sistema Windows.
3. **Opción C (Supabase Dashboard GUI Dump)**: Descargar directamente el respaldo de la base de datos desde el panel oficial de Supabase (`Database` -> `Backups` -> `Download Backup`).

### 4. Cobertura Esperada de Capa 2 (PostgreSQL Dump)
- **Estructura (DDL)**: Tablas, columnas, tipos, claves primarias, claves foráneas, restricciones, índices, funciones PostgreSQL, triggers, RLS, políticas de seguridad y secuencias.
- **Tratamiento de Supabase Auth**:
  - `pg_dump` sobre el esquema `public` respalda perfiles y asignaciones de usuario en `public.profiles`, `public.user_roles`, `public.user_branches`.
  - El esquema `auth` (tablas `auth.users`, `auth.identities`, password hashes, refresh tokens) es gestionado por la plataforma Supabase. Supabase CLI excluye esquemas internos por defecto (`--exclude-schema auth,...`). El Administrador General (`admin@gestorops.com`) permanece intacto y protegido en `auth.users` sin ser afectado por el reset.
- **Tratamiento de Storage**:
  - Se reconfirmó: **Buckets = 0**, **Objetos = 0**. No existen archivos binarios en Supabase Storage.

### 5. Procedimiento Conceptual de Restauración (Capa 2)
Una vez generado el archivo `.sql` de dump PostgreSQL completo:
```bash
pg_dump -h aws-0-us-east-1.pooler.supabase.com -U postgres -d postgres -f backups/bricklar_pre_reset_schema_YYYY-MM-DD_HHMM.sql
```
La restauración se realizaría ejecutando el script sobre una base de datos de destino mediante `psql` o el Editor SQL de Supabase.

---

## 4. Estado Actual del Procedimiento

- **Capa 1 (Snapshot PostgREST JSON + DML)**: `VERIFICADO E INTACTO`
- **Capa 2 (Dump PostgreSQL Real)**: `NO VERIFICADO — REQUERE PRERREQUISITO`
- **Storage**: `VERIFICADO (0 Buckets / 0 Objetos)`
- **Administrador General (`admin@gestorops.com`)**: `PROTEGIDO`
- **Script de Reset (`reset_for_new_client.sql`)**: `NO EJECUTADO`

---

## 5. Dictamen Final

> **`BACKUP POSTGRESQL NO VERIFICADO — RESET BLOQUEADO`**

