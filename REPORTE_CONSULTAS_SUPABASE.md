# Reporte Integral de Auditoría: Consultas a Supabase (.from(), .select(), .rpc())

> **Proyecto:** Bricklar GestorApp (Gestor de Tareas)  
> **Fecha de Análisis:** 19 de Octubre de 2026  
> **Alcance:** Todas las llamadas a `.from()`, `.select()` y `.rpc()` en `src/` (TypeScript / React)  
> **Estado:** Auditoría preliminar — **Sin cambios de código aplicados aún**.

---

## 1. Resumen Ejecutivo de Hallazgos

Se auditaron las **267 llamadas a Supabase** en el código fuente. De ellas:
- **170 llamadas** realizan operaciones de lectura o mutaciones que devuelven filas (`select` y `rpc`).
- **45 llamadas** ejecutan `select('*')` o `select()` sin especificar columnas, trayendo hasta 53 columnas por fila innecesariamente.
- **9 consultas críticas** operan sobre tablas con crecimiento indefinido (`tasks`, `directory_contacts`, `bus_routes`, `profiles`, `user_branches`, `workdays`) **sin ningún filtro (`.eq`, etc.) ni paginación (`.limit`, `.range`)**, realizando escaneos de tabla completos (*Full Table Scans*).
- **34 consultas adicionales** tienen algún filtro lógico pero **carecen de `.limit()` o `.range()`**, por lo que su transferencia crece proporcionalmente con el historial del cliente o jornada.
- **11 consultas** se ejecutan directamente dentro de hooks `useEffect`, y más de **70 consultas** se disparan de forma reactiva al abrir modales, cambiar estados de filtros o tipear en campos de texto (ej. `staleTime: 0`).

### Los 5 Puntos Críticos de Fuga de Egress (Mayor Transferencia de Datos):

1. **`directoryService.ts` (`getDirectoryContacts`):** Realiza un `select('*')` sin `.limit()` sobre `directory_contacts`. Se llama desde `ContactAutosuggest` en la creación de tareas con `staleTime: 0`. Descarga todo el directorio de clientes en memoria en cada sesión/búsqueda.
2. **`tasksService.ts` (`getCouriersForBranch`):** Para llenar la lista de motorizados en un dropdown, ejecuta 3 consultas simultáneas sin filtro ni límite a `branches`, `profiles` (todos los usuarios del sistema) y `user_branches`.
3. **`busesService.ts` (`getBusRoutes`):** Realiza un `select('*')` sin `.limit()` a `bus_routes` cada vez que se abre el formulario de tareas o el directorio de buses.
4. **`backupService.ts` (`generateFullBackup`):** Ejecuta `select('*')` sin límite sobre 10 tablas simultáneamente (incluyendo todas las tareas y liquidaciones históricas).
5. **`tasksService.ts` (Mutaciones con `.select()` vacío):** Al crear, actualizar, aprobar, rechazar o reasignar tareas, se usa `.select()` que descarga las **53 columnas completas** de la tabla `tasks` en vez de solo devolver el `id` o columnas afectadas.

---

## 2. Ranking General: De Mayor a Menor Volumen de Datos Transferidos

El siguiente ranking ordena todas las consultas evaluadas según su **Score de Transferencia Relativa** estimado:
$$\text{Score de Datos} = (\text{Filas Estimadas}) \times (\text{Columnas Descargadas}) \times (\text{Frecuencia de Ejecución por Sesión})$$

| # | Archivo y Línea | Tabla / Recurso | Tipo de Select | Filas Estimadas | Cols | Frecuencia / Sesión | Score Relativo | Disparador / Contexto |
|---|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | [backupService.ts:83](file:///src/modules/maintenance/services/backupService.ts)#L83 | `tasks` | `select('*')` | ~2500 | 53 | ~1x | **132,500** | Efecto / React Query |
| 2 | [directoryService.ts:31](file:///src/modules/directory/services/directoryService.ts)#L31 | `directory_contacts` | `select('*')` | ~250 | 19 | ~12x | **57,000** | Autosuggest en creación de tareas, búsqueda y cambio de categorías |
| 3 | [backupService.ts:86](file:///src/modules/maintenance/services/backupService.ts)#L86 | `workdays` | `select('*')` | ~1500 | 17 | ~1x | **25,500** | Efecto / React Query |
| 4 | [backupService.ts:88](file:///src/modules/maintenance/services/backupService.ts)#L88 | `settlements` | `select('*')` | ~1500 | 17 | ~1x | **25,500** | Efecto / React Query |
| 5 | [DashboardPage.tsx:47](file:///src/pages/admin/DashboardPage.tsx)#L47 | `tasks` | `id, title, status, financ` | ~120 | 16 | ~12x | **23,040** | Panel principal con refetch cada 5 min y al cambiar fecha/sucursal |
| 6 | [backupService.ts:87](file:///src/modules/maintenance/services/backupService.ts)#L87 | `cash_movements` | `select('*')` | ~1500 | 12 | ~1x | **18,000** | Efecto / React Query |
| 7 | [busesService.ts:6](file:///src/modules/buses/services/busesService.ts)#L6 | `bus_routes` | `select('*')` | ~150 | 10 | ~6x | **9,000** | Combobox de buses en modal de tareas y directorio de buses |
| 8 | [tasksService.ts:1060](file:///src/modules/tasks/services/tasksService.ts)#L1060 | `user_branches` | `user_id, branch_id, profi` | ~90 | 10 | ~8x | **7,200** | Hook useCouriers al listar tareas, asignar motorizado o cambiar de sucursal |
| 9 | [ReportsPage.tsx:196](file:///src/pages/admin/ReportsPage.tsx)#L196 | `settlement_adjustments` | `id,           settlement_` | ~200 | 15 | ~2x | **6,000** | Carga normal de página o formulario |
| 10 | [DashboardPage.tsx:85](file:///src/pages/admin/DashboardPage.tsx)#L85 | `cash_movements` | `id, amount, currency, dir` | ~60 | 7 | ~12x | **5,040** | Panel principal con refetch cada 5 min y al cambiar fecha/sucursal |
| 11 | [tasksService.ts:1047](file:///src/modules/tasks/services/tasksService.ts)#L1047 | `profiles` | `id, full_name, display_na` | ~60 | 8 | ~8x | **3,840** | Hook useCouriers al listar tareas, asignar motorizado o cambiar de sucursal |
| 12 | [DashboardPage.tsx:59](file:///src/pages/admin/DashboardPage.tsx)#L59 | `settlements` | `id, workday_id, courier_i` | ~30 | 9 | ~12x | **3,240** | Panel principal con refetch cada 5 min y al cambiar fecha/sucursal |
| 13 | [settlementsService.ts:88](file:///src/modules/settlements/services/settlementsService.ts)#L88 | `tasks` | `assigned_courier_id, sche` | ~120 | 11 | ~2x | **2,640** | Carga normal de página o formulario |
| 14 | [settlementsService.ts:970](file:///src/modules/settlements/services/settlementsService.ts)#L970 | `tasks` | `assigned_courier_id, sche` | ~120 | 11 | ~2x | **2,640** | Carga normal de página o formulario |
| 15 | [backupService.ts:90](file:///src/modules/maintenance/services/backupService.ts)#L90 | `audit_logs` | `select('*')` | ~200 | 13 | ~1x | **2,600** | Efecto / React Query |
| 16 | [DashboardPage.tsx:115](file:///src/pages/admin/DashboardPage.tsx)#L115 | `profiles` | `id, full_name, display_na` | ~30 | 7 | ~12x | **2,520** | Panel principal con refetch cada 5 min y al cambiar fecha/sucursal |
| 17 | [workdaysService.ts:285](file:///src/modules/workdays/services/workdaysService.ts)#L285 | `tasks` | `assigned_courier_id, sche` | ~120 | 10 | ~2x | **2,400** | Carga normal de página o formulario |
| 18 | [DashboardPage.tsx:54](file:///src/pages/admin/DashboardPage.tsx)#L54 | `workdays` | `id, courier_id, status, i` | ~40 | 5 | ~12x | **2,400** | Panel principal con refetch cada 5 min y al cambiar fecha/sucursal |
| 19 | [tasksService.ts:241](file:///src/modules/tasks/services/tasksService.ts)#L241 | `profiles` | `id, full_name, display_na` | ~30 | 5 | ~15x | **2,250** | Vista de tareas: paginación, filtros de fecha/estado, refresco tras crear o cambiar estado |
| 20 | [useOfflineConflicts.ts:41](file:///src/modules/settlements/hooks/useOfflineConflicts.ts)#L41 | `audit_logs` | `id,           action,    ` | ~30 | 14 | ~4x | **1,680** | Hook que consulta auditoría al entrar al módulo de liquidaciones |
| 21 | [usersService.ts:41](file:///src/modules/users/services/usersService.ts)#L41 | `profiles` | `select('*')` | ~30 | 13 | ~4x | **1,560** | Al ingresar a Gestión de Usuarios y al aplicar filtros |
| 22 | [backupService.ts:82](file:///src/modules/maintenance/services/backupService.ts)#L82 | `bus_routes` | `select('*')` | ~150 | 10 | ~1x | **1,500** | Efecto / React Query |
| 23 | [settlementsService.ts:793](file:///src/modules/settlements/services/settlementsService.ts)#L793 | `settlement_adjustments` | `id,       settlement_id, ` | ~30 | 19 | ~2x | **1,140** | Carga normal de página o formulario |
| 24 | [branchesService.ts:6](file:///src/modules/branches/services/branchesService.ts)#L6 | `branches` | `select('*')` | ~10 | 16 | ~6x | **960** | Efecto / React Query |
| 25 | [backupService.ts:84](file:///src/modules/maintenance/services/backupService.ts)#L84 | `task_assignments` | `select('*')` | ~100 | 8 | ~1x | **800** | Efecto / React Query |
| 26 | [backupService.ts:85](file:///src/modules/maintenance/services/backupService.ts)#L85 | `task_status_history` | `select('*')` | ~100 | 8 | ~1x | **800** | Efecto / React Query |
| 27 | [backupService.ts:81](file:///src/modules/maintenance/services/backupService.ts)#L81 | `profiles` | `select('*')` | ~60 | 13 | ~1x | **780** | Efecto / React Query |
| 28 | [settlementsService.ts:96](file:///src/modules/settlements/services/settlementsService.ts)#L96 | `cash_movements` | `workday_id, amount, curre` | ~60 | 6 | ~2x | **720** | Carga normal de página o formulario |
| 29 | [settlementsService.ts:1013](file:///src/modules/settlements/services/settlementsService.ts)#L1013 | `cash_movements` | `workday_id, amount, curre` | ~60 | 6 | ~2x | **720** | Carga normal de página o formulario |
| 30 | [settlementsService.ts:1370](file:///src/modules/settlements/services/settlementsService.ts)#L1370 | `cash_movements` | `workday_id, amount, curre` | ~60 | 6 | ~2x | **720** | Carga normal de página o formulario |
| 31 | [usersService.ts:59](file:///src/modules/users/services/usersService.ts)#L59 | `user_branches` | `user_id, branch_id` | ~90 | 2 | ~4x | **720** | Al ingresar a Gestión de Usuarios y al aplicar filtros |
| 32 | [workdaysService.ts:293](file:///src/modules/workdays/services/workdaysService.ts)#L293 | `cash_movements` | `workday_id, amount, curre` | ~60 | 6 | ~2x | **720** | Carga normal de página o formulario |
| 33 | [backupService.ts:89](file:///src/modules/maintenance/services/backupService.ts)#L89 | `settlement_adjustments` | `select('*')` | ~100 | 6 | ~1x | **600** | Efecto / React Query |
| 34 | [tasksService.ts:996](file:///src/modules/tasks/services/tasksService.ts)#L996 | `branches` | `id, name, code` | ~10 | 3 | ~8x | **240** | Hook useCouriers al listar tareas, asignar motorizado o cambiar de sucursal |
| 35 | [MaintenancePage.tsx:64](file:///src/pages/admin/MaintenancePage.tsx)#L64 | `check.table` | `id` | ~100 | 1 | ~2x | **200** | Carga normal de página o formulario |
| 36 | [backupService.ts:80](file:///src/modules/maintenance/services/backupService.ts)#L80 | `branches` | `select('*')` | ~10 | 16 | ~1x | **160** | Efecto / React Query |
| 37 | [settlementsService.ts:79](file:///src/modules/settlements/services/settlementsService.ts)#L79 | `workdays` | `id, initial_cash` | ~40 | 2 | ~2x | **160** | Carga normal de página o formulario |
| 38 | [tasksService.ts:358](file:///src/modules/tasks/services/tasksService.ts)#L358 | `tasks` | `select()` (vacío = *) | ~1 | 53 | ~2x | **106** | Efecto / React Query |
| 39 | [tasksService.ts:382](file:///src/modules/tasks/services/tasksService.ts)#L382 | `tasks` | `select()` (vacío = *) | ~1 | 53 | ~2x | **106** | Efecto / React Query |
| 40 | [tasksService.ts:512](file:///src/modules/tasks/services/tasksService.ts)#L512 | `tasks` | `select()` (vacío = *) | ~1 | 53 | ~2x | **106** | Efecto / React Query |
| 41 | [tasksService.ts:537](file:///src/modules/tasks/services/tasksService.ts)#L537 | `tasks` | `select()` (vacío = *) | ~1 | 53 | ~2x | **106** | Efecto / React Query |
| 42 | [tasksService.ts:757](file:///src/modules/tasks/services/tasksService.ts)#L757 | `tasks` | `select()` (vacío = *) | ~1 | 53 | ~2x | **106** | Efecto / React Query |
| 43 | [tasksService.ts:910](file:///src/modules/tasks/services/tasksService.ts)#L910 | `tasks` | `select()` (vacío = *) | ~1 | 53 | ~2x | **106** | Carga normal de página o formulario |
| 44 | [tasksService.ts:1225](file:///src/modules/tasks/services/tasksService.ts)#L1225 | `tasks` | `select()` (vacío = *) | ~1 | 53 | ~2x | **106** | Efecto / React Query |
| 45 | [tasksService.ts:1297](file:///src/modules/tasks/services/tasksService.ts)#L1297 | `tasks` | `select()` (vacío = *) | ~1 | 53 | ~2x | **106** | Efecto / React Query |
| 46 | [tasksService.ts:1537](file:///src/modules/tasks/services/tasksService.ts)#L1537 | `tasks` | `select()` (vacío = *) | ~1 | 53 | ~2x | **106** | Efecto / React Query |
| 47 | [DeliverCashModal.tsx:129](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L129 | `workdays` | `id, courier_id, branch_id` | ~1 | 15 | ~6x | **90** | `useEffect` directo |
| 48 | [DeliverCashModal.tsx:146](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L146 | `workdays` | `id, courier_id, branch_id` | ~1 | 15 | ~6x | **90** | `useEffect` directo |
| 49 | [DeliverCashModal.tsx:197](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L197 | `workdays` | `id, courier_id, branch_id` | ~1 | 15 | ~6x | **90** | `useEffect` directo |
| 50 | [ReceiveCashModal.tsx:134](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L134 | `workdays` | `id, courier_id, branch_id` | ~1 | 15 | ~6x | **90** | `useEffect` directo |
| 51 | [ReceiveCashModal.tsx:151](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L151 | `workdays` | `id, courier_id, branch_id` | ~1 | 15 | ~6x | **90** | `useEffect` directo |
| 52 | [ReceiveCashModal.tsx:176](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L176 | `workdays` | `id, courier_id, branch_id` | ~1 | 15 | ~6x | **90** | `useEffect` directo |
| 53 | [tasksService.ts:1079](file:///src/modules/tasks/services/tasksService.ts)#L1079 | `workdays` | `courier_id, branch_id, co` | ~1 | 10 | ~8x | **80** | Hook useCouriers al listar tareas, asignar motorizado o cambiar de sucursal |
| 54 | [tasksService.ts:1099](file:///src/modules/tasks/services/tasksService.ts)#L1099 | `tasks` | `assigned_courier_id, bran` | ~1 | 10 | ~8x | **80** | Hook useCouriers al listar tareas, asignar motorizado o cambiar de sucursal |
| 55 | [ReceiveCashModal.tsx:197](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L197 | `tasks` | `expected_collection_amoun` | ~1 | 9 | ~6x | **54** | `useEffect` directo |
| 56 | [settlementsService.ts:919](file:///src/modules/settlements/services/settlementsService.ts)#L919 | `daily_closures` | `select('*')` | ~1 | 26 | ~2x | **52** | Carga normal de página o formulario |
| 57 | [settlementsService.ts:1218](file:///src/modules/settlements/services/settlementsService.ts)#L1218 | `daily_closures` | `select('*')` | ~1 | 26 | ~2x | **52** | Carga normal de página o formulario |
| 58 | [settlementsService.ts:1235](file:///src/modules/settlements/services/settlementsService.ts)#L1235 | `daily_closures` | `select('*')` | ~1 | 26 | ~2x | **52** | Carga normal de página o formulario |
| 59 | [tasksService.ts:1614](file:///src/modules/tasks/services/tasksService.ts)#L1614 | `tasks` | `id,         code,        ` | ~1 | 26 | ~2x | **52** | Efecto / React Query |
| 60 | [workdaysService.ts:360](file:///src/modules/workdays/services/workdaysService.ts)#L360 | `cash_movements` | `id, created_at, workday_i` | ~1 | 26 | ~2x | **52** | Carga normal de página o formulario |
| 61 | [DeliverCashModal.tsx:218](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L218 | `cash_movements` | `id, created_at, amount, c` | ~1 | 7 | ~6x | **42** | `useEffect` directo |
| 62 | [ReceiveCashModal.tsx:204](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L204 | `cash_movements` | `id, created_at, amount, c` | ~1 | 7 | ~6x | **42** | `useEffect` directo |
| 63 | [directoryService.ts:109](file:///src/modules/directory/services/directoryService.ts)#L109 | `directory_contacts` | `select()` (vacío = *) | ~1 | 19 | ~2x | **38** | Carga normal de página o formulario |
| 64 | [directoryService.ts:199](file:///src/modules/directory/services/directoryService.ts)#L199 | `directory_contacts` | `select()` (vacío = *) | ~1 | 19 | ~2x | **38** | Carga normal de página o formulario |
| 65 | [settlementsService.ts:941](file:///src/modules/settlements/services/settlementsService.ts)#L941 | `workdays` | `select('*')` | ~1 | 17 | ~2x | **34** | Carga normal de página o formulario |
| 66 | [FundsPage.tsx:53](file:///src/pages/courier/FundsPage.tsx)#L53 | `workdays` | `select('*')` | ~1 | 17 | ~2x | **34** | Carga normal de página o formulario |
| 67 | [SettlementPage.tsx:65](file:///src/pages/courier/SettlementPage.tsx)#L65 | `workdays` | `select('*')` | ~1 | 17 | ~2x | **34** | Carga normal de página o formulario |
| 68 | [branchesService.ts:28](file:///src/modules/branches/services/branchesService.ts)#L28 | `branches` | `select()` (vacío = *) | ~1 | 16 | ~2x | **32** | Efecto / React Query |
| 69 | [branchesService.ts:50](file:///src/modules/branches/services/branchesService.ts)#L50 | `branches` | `select()` (vacío = *) | ~1 | 16 | ~2x | **32** | Efecto / React Query |
| 70 | [auditService.ts:103](file:///src/shared/services/auditService.ts)#L103 | `audit_logs` | `id,       action,       e` | ~1 | 16 | ~2x | **32** | Efecto / React Query |
| 71 | [AuthContext.tsx:25](file:///src/modules/auth/AuthContext.tsx)#L25 | `get_my_profile` | `` | ~1 | 13 | ~2x | **26** | Carga normal de página o formulario |
| 72 | [notificationsService.ts:9](file:///src/modules/notifications/services/notificationsService.ts)#L9 | `notifications` | `select('*')` | ~1 | 13 | ~2x | **26** | Carga normal de página o formulario |
| 73 | [usersService.ts:119](file:///src/modules/users/services/usersService.ts)#L119 | `profiles` | `select()` (vacío = *) | ~1 | 13 | ~2x | **26** | Efecto / React Query |
| 74 | [settlementsService.ts:859](file:///src/modules/settlements/services/settlementsService.ts)#L859 | `cash_movements` | `select('*')` | ~1 | 12 | ~2x | **24** | Carga normal de página o formulario |
| 75 | [settlementsService.ts:893](file:///src/modules/settlements/services/settlementsService.ts)#L893 | `cash_movements` | `select()` (vacío = *) | ~1 | 12 | ~2x | **24** | Carga normal de página o formulario |
| 76 | [workdaysService.ts:451](file:///src/modules/workdays/services/workdaysService.ts)#L451 | `cash_movements` | `select('*')` | ~1 | 12 | ~2x | **24** | Carga normal de página o formulario |
| 77 | [settlementsService.ts:149](file:///src/modules/settlements/services/settlementsService.ts)#L149 | `tasks` | `assigned_courier_id, sche` | ~1 | 11 | ~2x | **22** | Carga normal de página o formulario |
| 78 | [settlementsService.ts:201](file:///src/modules/settlements/services/settlementsService.ts)#L201 | `tasks` | `assigned_courier_id, sche` | ~1 | 11 | ~2x | **22** | Carga normal de página o formulario |
| 79 | [busesService.ts:20](file:///src/modules/buses/services/busesService.ts)#L20 | `bus_routes` | `select()` (vacío = *) | ~1 | 10 | ~2x | **20** | Efecto / React Query |
| 80 | [busesService.ts:52](file:///src/modules/buses/services/busesService.ts)#L52 | `bus_routes` | `select()` (vacío = *) | ~1 | 10 | ~2x | **20** | Efecto / React Query |
| 81 | [exchangeRatesService.ts:10](file:///src/modules/exchange-rates/services/exchangeRatesService.ts)#L10 | `exchange_rates` | `id,         branch_id,   ` | ~1 | 10 | ~2x | **20** | Efecto / React Query |
| 82 | [exchangeRatesService.ts:67](file:///src/modules/exchange-rates/services/exchangeRatesService.ts)#L67 | `exchange_rates` | `id,         branch_id,   ` | ~1 | 10 | ~2x | **20** | Efecto / React Query |
| 83 | [exchangeRatesService.ts:189](file:///src/modules/exchange-rates/services/exchangeRatesService.ts)#L189 | `exchange_rates` | `id,       branch_id,     ` | ~1 | 10 | ~2x | **20** | Efecto / React Query |
| 84 | [settlementsService.ts:1364](file:///src/modules/settlements/services/settlementsService.ts)#L1364 | `tasks` | `scheduled_date, expected_` | ~1 | 10 | ~2x | **20** | Carga normal de página o formulario |
| 85 | [settlementsService.ts:250](file:///src/modules/settlements/services/settlementsService.ts)#L250 | `tasks` | `expected_collection_amoun` | ~1 | 9 | ~2x | **18** | Carga normal de página o formulario |
| 86 | [exchangeRatesService.ts:149](file:///src/modules/exchange-rates/services/exchangeRatesService.ts)#L149 | `exchange_rates` | `select()` (vacío = *) | ~1 | 8 | ~2x | **16** | Efecto / React Query |
| 87 | [exchangeRatesService.ts:168](file:///src/modules/exchange-rates/services/exchangeRatesService.ts)#L168 | `exchange_rates` | `select()` (vacío = *) | ~1 | 8 | ~2x | **16** | Efecto / React Query |
| 88 | [settlementsService.ts:345](file:///src/modules/settlements/services/settlementsService.ts)#L345 | `compute_settlement as any` | `` | ~1 | 8 | ~2x | **16** | Efecto / React Query |
| 89 | [settlementsService.ts:616](file:///src/modules/settlements/services/settlementsService.ts)#L616 | `compute_settlement as any` | `` | ~1 | 8 | ~2x | **16** | Carga normal de página o formulario |
| 90 | [tasksService.ts:935](file:///src/modules/tasks/services/tasksService.ts)#L935 | `task_assignments` | `select('*')` | ~1 | 8 | ~2x | **16** | Carga normal de página o formulario |
| 91 | [tasksService.ts:956](file:///src/modules/tasks/services/tasksService.ts)#L956 | `task_status_history` | `select('*')` | ~1 | 8 | ~2x | **16** | Carga normal de página o formulario |
| 92 | [workdaysService.ts:35](file:///src/modules/workdays/services/workdaysService.ts)#L35 | `tasks` | `expected_collection_amoun` | ~1 | 8 | ~2x | **16** | Efecto / React Query |
| 93 | [tasksService.ts:186](file:///src/modules/tasks/services/tasksService.ts)#L186 | `tasks` | `TASK_LIST_SELECT` | ~1 | 1 | ~15x | **15** | Vista de tareas: paginación, filtros de fecha/estado, refresco tras crear o cambiar estado |
| 94 | [settlementsService.ts:1316](file:///src/modules/settlements/services/settlementsService.ts)#L1316 | `settlements` | `id, workday_id, settlemen` | ~1 | 7 | ~2x | **14** | Carga normal de página o formulario |
| 95 | [settlementsService.ts:156](file:///src/modules/settlements/services/settlementsService.ts)#L156 | `cash_movements` | `workday_id, amount, curre` | ~1 | 6 | ~2x | **12** | Carga normal de página o formulario |
| 96 | [settlementsService.ts:208](file:///src/modules/settlements/services/settlementsService.ts)#L208 | `cash_movements` | `workday_id, amount, curre` | ~1 | 6 | ~2x | **12** | Carga normal de página o formulario |
| 97 | [settlementsService.ts:601](file:///src/modules/settlements/services/settlementsService.ts)#L601 | `workdays` | `id, branch_id, courier_id` | ~1 | 6 | ~2x | **12** | Carga normal de página o formulario |
| 98 | [tasksService.ts:452](file:///src/modules/tasks/services/tasksService.ts)#L452 | `tasks` | `id, code, title, status, ` | ~1 | 6 | ~2x | **12** | Efecto / React Query |
| 99 | [tasksService.ts:619](file:///src/modules/tasks/services/tasksService.ts)#L619 | `tasks` | `id, code, title, status, ` | ~1 | 6 | ~2x | **12** | Efecto / React Query |
| 100 | [settlementsService.ts:239](file:///src/modules/settlements/services/settlementsService.ts)#L239 | `workdays` | `id, branch_id, courier_id` | ~1 | 5 | ~2x | **10** | Carga normal de página o formulario |
| 101 | [settlementsService.ts:258](file:///src/modules/settlements/services/settlementsService.ts)#L258 | `cash_movements` | `amount, currency, directi` | ~1 | 5 | ~2x | **10** | Carga normal de página o formulario |
| 102 | [settlementsService.ts:521](file:///src/modules/settlements/services/settlementsService.ts)#L521 | `settlements` | `workday_id, courier_id, n` | ~1 | 5 | ~2x | **10** | Efecto / React Query |
| 103 | [settlementsService.ts:985](file:///src/modules/settlements/services/settlementsService.ts)#L985 | `tasks` | `id, status, expected_coll` | ~1 | 5 | ~2x | **10** | Carga normal de página o formulario |
| 104 | [settlementsService.ts:1310](file:///src/modules/settlements/services/settlementsService.ts)#L1310 | `workdays` | `id, work_date, status, in` | ~1 | 5 | ~2x | **10** | Carga normal de página o formulario |
| 105 | [tasksService.ts:283](file:///src/modules/tasks/services/tasksService.ts)#L283 | `profiles` | `id, full_name, display_na` | ~1 | 5 | ~2x | **10** | Efecto / React Query |
| 106 | [tasksService.ts:1287](file:///src/modules/tasks/services/tasksService.ts)#L1287 | `tasks` | `status, assigned_courier_` | ~1 | 5 | ~2x | **10** | Efecto / React Query |
| 107 | [workdaysService.ts:42](file:///src/modules/workdays/services/workdaysService.ts)#L42 | `cash_movements` | `amount, currency, directi` | ~1 | 5 | ~2x | **10** | Efecto / React Query |
| 108 | [settlementsService.ts:321](file:///src/modules/settlements/services/settlementsService.ts)#L321 | `settlements` | `expected_cash, workday_id` | ~1 | 4 | ~2x | **8** | Efecto / React Query |
| 109 | [settlementsService.ts:641](file:///src/modules/settlements/services/settlementsService.ts)#L641 | `tasks` | `expected_collection_amoun` | ~1 | 4 | ~2x | **8** | Carga normal de página o formulario |
| 110 | [settlementsService.ts:1451](file:///src/modules/settlements/services/settlementsService.ts)#L1451 | `profiles` | `id, full_name, display_na` | ~1 | 4 | ~2x | **8** | Carga normal de página o formulario |
| 111 | [workdaysService.ts:546](file:///src/modules/workdays/services/workdaysService.ts)#L546 | `workdays` | `id, status, work_date, cr` | ~1 | 4 | ~2x | **8** | Efecto / React Query |
| 112 | [StartWorkdayModal.tsx:58](file:///src/modules/courier/components/StartWorkdayModal.tsx)#L58 | `workdays` | `id, initial_cash, status` | ~1 | 3 | ~2x | **6** | `useEffect` directo |
| 113 | [DeliverCashModal.tsx:319](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L319 | `user_branches` | `branch_id` | ~1 | 1 | ~6x | **6** | Efecto / React Query |
| 114 | [DeliverCashModal.tsx:323](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L323 | `branches` | `id` | ~1 | 1 | ~6x | **6** | Efecto / React Query |
| 115 | [DeliverCashModal.tsx:327](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L327 | `workdays` | `id` | ~1 | 1 | ~6x | **6** | Efecto / React Query |
| 116 | [DeliverCashModal.tsx:361](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L361 | `cash_movements` | `id` | ~1 | 1 | ~6x | **6** | Efecto / React Query |
| 117 | [DeliverCashModal.tsx:382](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L382 | `log_audit_event` | `` | ~1 | 1 | ~6x | **6** | Efecto / React Query |
| 118 | [ReceiveCashModal.tsx:325](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L325 | `cash_movements` | `id` | ~1 | 1 | ~6x | **6** | Efecto / React Query |
| 119 | [ReceiveCashModal.tsx:346](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L346 | `log_audit_event` | `` | ~1 | 1 | ~6x | **6** | Efecto / React Query |
| 120 | [tasksService.ts:824](file:///src/modules/tasks/services/tasksService.ts)#L824 | `tasks` | `status, metadata, evidenc` | ~1 | 3 | ~2x | **6** | Carga normal de página o formulario |
| 121 | [tasksService.ts:1678](file:///src/modules/tasks/services/tasksService.ts)#L1678 | `tasks` | `id, status, metadata` | ~1 | 3 | ~2x | **6** | Efecto / React Query |
| 122 | [workdaysService.ts:107](file:///src/modules/workdays/services/workdaysService.ts)#L107 | `workdays` | `id, initial_cash, status` | ~1 | 3 | ~2x | **6** | Efecto / React Query |
| 123 | [AdminLayout.tsx:330](file:///src/layouts/AdminLayout.tsx)#L330 | `notifications` | `id, read_at` | ~1 | 2 | ~2x | **4** | Carga normal de página o formulario |
| 124 | [CourierLayout.tsx:60](file:///src/layouts/CourierLayout.tsx)#L60 | `notifications` | `id, read_at` | ~1 | 2 | ~2x | **4** | Carga normal de página o formulario |
| 125 | [useOfflineConflicts.ts:99](file:///src/modules/settlements/hooks/useOfflineConflicts.ts)#L99 | `audit_logs` | `changes` | ~1 | 1 | ~4x | **4** | Hook que consulta auditoría al entrar al módulo de liquidaciones |
| 126 | [settlementsService.ts:411](file:///src/modules/settlements/services/settlementsService.ts)#L411 | `profiles` | `full_name, display_name` | ~1 | 2 | ~2x | **4** | Efecto / React Query |
| 127 | [settlementsService.ts:752](file:///src/modules/settlements/services/settlementsService.ts)#L752 | `profiles` | `full_name, display_name` | ~1 | 2 | ~2x | **4** | Carga normal de página o formulario |
| 128 | [tasksService.ts:716](file:///src/modules/tasks/services/tasksService.ts)#L716 | `tasks` | `assigned_courier_id, stat` | ~1 | 2 | ~2x | **4** | Efecto / React Query |
| 129 | [workdaysService.ts:75](file:///src/modules/workdays/services/workdaysService.ts)#L75 | `settlements` | `id, status` | ~1 | 2 | ~2x | **4** | Carga normal de página o formulario |
| 130 | [exchangeRatesService.ts:134](file:///src/modules/exchange-rates/services/exchangeRatesService.ts)#L134 | `exchange_rates` | `id` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 131 | [fleetService.ts:150](file:///src/modules/fleet/services/fleetService.ts)#L150 | `app_settings` | `value_json` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 132 | [fleetService.ts:228](file:///src/modules/fleet/services/fleetService.ts)#L228 | `app_settings` | `id` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 133 | [fleetService.ts:387](file:///src/modules/fleet/services/fleetService.ts)#L387 | `app_settings` | `value_json` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 134 | [companySettingsService.ts:37](file:///src/modules/settings/services/companySettingsService.ts)#L37 | `app_settings` | `value_json` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 135 | [companySettingsService.ts:86](file:///src/modules/settings/services/companySettingsService.ts)#L86 | `app_settings` | `id` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 136 | [settlementsService.ts:36](file:///src/modules/settlements/services/settlementsService.ts)#L36 | `settlements` | `SETTLEMENT_SELECT` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 137 | [settlementsService.ts:129](file:///src/modules/settlements/services/settlementsService.ts)#L129 | `settlements` | `SETTLEMENT_SELECT` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 138 | [settlementsService.ts:143](file:///src/modules/settlements/services/settlementsService.ts)#L143 | `workdays` | `initial_cash` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 139 | [settlementsService.ts:181](file:///src/modules/settlements/services/settlementsService.ts)#L181 | `settlements` | `SETTLEMENT_SELECT` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 140 | [settlementsService.ts:195](file:///src/modules/settlements/services/settlementsService.ts)#L195 | `workdays` | `initial_cash` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 141 | [settlementsService.ts:301](file:///src/modules/settlements/services/settlementsService.ts)#L301 | `settlements` | `SETTLEMENT_SELECT` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 142 | [settlementsService.ts:371](file:///src/modules/settlements/services/settlementsService.ts)#L371 | `settlements` | `SETTLEMENT_SELECT` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 143 | [settlementsService.ts:533](file:///src/modules/settlements/services/settlementsService.ts)#L533 | `settlements` | `SETTLEMENT_SELECT` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 144 | [settlementsService.ts:695](file:///src/modules/settlements/services/settlementsService.ts)#L695 | `settlements` | `SETTLEMENT_SELECT` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 145 | [settlementsService.ts:1019](file:///src/modules/settlements/services/settlementsService.ts)#L1019 | `settlements` | `SETTLEMENT_SELECT` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 146 | [settlementsService.ts:1132](file:///src/modules/settlements/services/settlementsService.ts)#L1132 | `profiles` | `primary_branch_id` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 147 | [settlementsService.ts:1141](file:///src/modules/settlements/services/settlementsService.ts)#L1141 | `branches` | `id` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 148 | [settlementsService.ts:1210](file:///src/modules/settlements/services/settlementsService.ts)#L1210 | `daily_closures` | `id` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 149 | [settlementsService.ts:1254](file:///src/modules/settlements/services/settlementsService.ts)#L1254 | `log_audit_event` | `` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 150 | [tasksService.ts:269](file:///src/modules/tasks/services/tasksService.ts)#L269 | `tasks` | `TASK_DETAIL_SELECT` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 151 | [tasksService.ts:305](file:///src/modules/tasks/services/tasksService.ts)#L305 | `generate_task_code` | `` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 152 | [tasksService.ts:688](file:///src/modules/tasks/services/tasksService.ts)#L688 | `log_audit_event` | `` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 153 | [tasksService.ts:835](file:///src/modules/tasks/services/tasksService.ts)#L835 | `profiles` | `role` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 154 | [tasksService.ts:1185](file:///src/modules/tasks/services/tasksService.ts)#L1185 | `update_task_route_orders as any` | `` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 155 | [taskTypeSettingsService.ts:46](file:///src/modules/tasks/services/taskTypeSettingsService.ts)#L46 | `app_settings` | `value_json` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 156 | [taskTypeSettingsService.ts:147](file:///src/modules/tasks/services/taskTypeSettingsService.ts)#L147 | `app_settings` | `id` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 157 | [whatsappTemplatesService.ts:37](file:///src/modules/tasks/services/whatsappTemplatesService.ts)#L37 | `app_settings` | `value_json` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 158 | [whatsappTemplatesService.ts:86](file:///src/modules/tasks/services/whatsappTemplatesService.ts)#L86 | `app_settings` | `id` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 159 | [usersService.ts:234](file:///src/modules/users/services/usersService.ts)#L234 | `log_audit_event` | `` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 160 | [kilometrajeSettingsService.ts:17](file:///src/modules/workdays/services/kilometrajeSettingsService.ts)#L17 | `app_settings` | `value_json` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 161 | [kilometrajeSettingsService.ts:62](file:///src/modules/workdays/services/kilometrajeSettingsService.ts)#L62 | `app_settings` | `id` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 162 | [workdaysService.ts:24](file:///src/modules/workdays/services/workdaysService.ts)#L24 | `workdays` | `WORKDAY_SELECT` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 163 | [workdaysService.ts:56](file:///src/modules/workdays/services/workdaysService.ts)#L56 | `workdays` | `WORKDAY_SELECT` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 164 | [workdaysService.ts:140](file:///src/modules/workdays/services/workdaysService.ts)#L140 | `workdays` | `WORKDAY_SELECT` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 165 | [workdaysService.ts:172](file:///src/modules/workdays/services/workdaysService.ts)#L172 | `workdays` | `WORKDAY_SELECT` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 166 | [workdaysService.ts:187](file:///src/modules/workdays/services/workdaysService.ts)#L187 | `log_audit_event` | `` | ~1 | 1 | ~2x | **2** | Efecto / React Query |
| 167 | [workdaysService.ts:213](file:///src/modules/workdays/services/workdaysService.ts)#L213 | `workdays` | `WORKDAY_SELECT` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 168 | [workdaysService.ts:244](file:///src/modules/workdays/services/workdaysService.ts)#L244 | `workdays` | `WORKDAY_SELECT` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 169 | [workdaysService.ts:494](file:///src/modules/workdays/services/workdaysService.ts)#L494 | `log_audit_event` | `` | ~1 | 1 | ~2x | **2** | Carga normal de página o formulario |
| 170 | [ResetDatabaseModal.tsx:85](file:///src/pages/admin/components/ResetDatabaseModal.tsx)#L85 | `reset_database_for_new_client` | `` | ~1 | 1 | ~2x | **2** | Efecto / React Query |

---

## 3. Inventario Completo: Cada `select('*')` o `select()` sin Columnas (45 Casos)

En Supabase JS v2, llamar a `.select()` sin argumentos equivale a `.select('*')`. Esto descarga la totalidad de las columnas de la tabla (incluso campos JSON pesados, metadatos, evidencias y auditorías).

| Archivo | Línea | Tabla | Operación | Cols | Filtros Presentes | Límite / Rango | Función Contenedora |
|---|:---:|---|---|:---:|---|:---:|---|
| [backupService.ts:83](file:///src/modules/maintenance/services/backupService.ts)#L83 | 83 | `tasks` | `.select('*')` | **53** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [directoryService.ts:31](file:///src/modules/directory/services/directoryService.ts)#L31 | 31 | `directory_contacts` | `.select('*')` | **19** | `eq('category', filters.category), e` | *Sin límite* | `getDirectoryContacts` |
| [backupService.ts:86](file:///src/modules/maintenance/services/backupService.ts)#L86 | 86 | `workdays` | `.select('*')` | **17** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [backupService.ts:88](file:///src/modules/maintenance/services/backupService.ts)#L88 | 88 | `settlements` | `.select('*')` | **17** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [backupService.ts:87](file:///src/modules/maintenance/services/backupService.ts)#L87 | 87 | `cash_movements` | `.select('*')` | **12** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [busesService.ts:6](file:///src/modules/buses/services/busesService.ts)#L6 | 6 | `bus_routes` | `.select('*')` | **10** | *Sin filtros* | *Sin límite* | `getBusRoutes` |
| [backupService.ts:90](file:///src/modules/maintenance/services/backupService.ts)#L90 | 90 | `audit_logs` | `.select('*')` | **13** | *Sin filtros* | 200 | `generateFullBackup` |
| [usersService.ts:41](file:///src/modules/users/services/usersService.ts)#L41 | 41 | `profiles` | `.select('*')` | **13** | `eq('role', role), eq('is_active', i` | *Sin límite* | `getUsers` |
| [backupService.ts:82](file:///src/modules/maintenance/services/backupService.ts)#L82 | 82 | `bus_routes` | `.select('*')` | **10** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [branchesService.ts:6](file:///src/modules/branches/services/branchesService.ts)#L6 | 6 | `branches` | `.select('*')` | **16** | *Sin filtros* | *Sin límite* | `getBranches` |
| [backupService.ts:84](file:///src/modules/maintenance/services/backupService.ts)#L84 | 84 | `task_assignments` | `.select('*')` | **8** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [backupService.ts:85](file:///src/modules/maintenance/services/backupService.ts)#L85 | 85 | `task_status_history` | `.select('*')` | **8** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [backupService.ts:81](file:///src/modules/maintenance/services/backupService.ts)#L81 | 81 | `profiles` | `.select('*')` | **13** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [backupService.ts:89](file:///src/modules/maintenance/services/backupService.ts)#L89 | 89 | `settlement_adjustments` | `.select('*')` | **6** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [backupService.ts:80](file:///src/modules/maintenance/services/backupService.ts)#L80 | 80 | `branches` | `.select('*')` | **16** | *Sin filtros* | *Sin límite* | `generateFullBackup` |
| [tasksService.ts:358](file:///src/modules/tasks/services/tasksService.ts)#L358 | 358 | `tasks` | `.select()` vacío | **53** | *Sin filtros* | *Sin límite* | `createTask` |
| [tasksService.ts:382](file:///src/modules/tasks/services/tasksService.ts)#L382 | 382 | `tasks` | `.select()` vacío | **53** | *Sin filtros* | *Sin límite* | `createTask` |
| [tasksService.ts:512](file:///src/modules/tasks/services/tasksService.ts)#L512 | 512 | `tasks` | `.select()` vacío | **53** | `eq('id', id), is('deleted_at', null` | *Sin límite* | `updateTask` |
| [tasksService.ts:537](file:///src/modules/tasks/services/tasksService.ts)#L537 | 537 | `tasks` | `.select()` vacío | **53** | `eq('id', id), is('deleted_at', null` | *Sin límite* | `updateTask` |
| [tasksService.ts:757](file:///src/modules/tasks/services/tasksService.ts)#L757 | 757 | `tasks` | `.select()` vacío | **53** | `eq('id', task_id)` | *Sin límite* | `assignTask` |
| [tasksService.ts:910](file:///src/modules/tasks/services/tasksService.ts)#L910 | 910 | `tasks` | `.select()` vacío | **53** | `eq('id', task_id)` | *Sin límite* | `changeTaskStatus` |
| [tasksService.ts:1225](file:///src/modules/tasks/services/tasksService.ts)#L1225 | 1225 | `tasks` | `.select()` vacío | **53** | `eq('id', taskId)` | *Sin límite* | `approveTask` |
| [tasksService.ts:1297](file:///src/modules/tasks/services/tasksService.ts)#L1297 | 1297 | `tasks` | `.select()` vacío | **53** | `eq('id', taskId)` | *Sin límite* | `rejectTask` |
| [tasksService.ts:1537](file:///src/modules/tasks/services/tasksService.ts)#L1537 | 1537 | `tasks` | `.select()` vacío | **53** | `eq('id', original.id)` | *Sin límite* | `rescheduleTask` |
| [settlementsService.ts:919](file:///src/modules/settlements/services/settlementsService.ts)#L919 | 919 | `daily_closures` | `.select('*')` | **26** | `gte('closure_date', date), eq('clos` | 1 | `getDailyClosure` |
| [settlementsService.ts:1218](file:///src/modules/settlements/services/settlementsService.ts)#L1218 | 1218 | `daily_closures` | `.select('*')` | **26** | `eq('id', existingClosure.id)` | *Sin límite* | `confirmDailyClosure` |
| [settlementsService.ts:1235](file:///src/modules/settlements/services/settlementsService.ts)#L1235 | 1235 | `daily_closures` | `.select('*')` | **26** | *Sin filtros* | *Sin límite* | `confirmDailyClosure` |
| [directoryService.ts:109](file:///src/modules/directory/services/directoryService.ts)#L109 | 109 | `directory_contacts` | `.select()` vacío | **19** | *Sin filtros* | *Sin límite* | `createDirectoryContact` |
| [directoryService.ts:199](file:///src/modules/directory/services/directoryService.ts)#L199 | 199 | `directory_contacts` | `.select()` vacío | **19** | `eq('id', id)` | *Sin límite* | `updateDirectoryContact` |
| [settlementsService.ts:941](file:///src/modules/settlements/services/settlementsService.ts)#L941 | 941 | `workdays` | `.select('*')` | **17** | `gte('work_date', date), eq('work_da` | *Sin límite* | `getDailyClosure` |
| [FundsPage.tsx:53](file:///src/pages/courier/FundsPage.tsx)#L53 | 53 | `workdays` | `.select('*')` | **17** | `eq('courier_id', profile.id), eq('w` | 1 | `CourierFundsPage` |
| [SettlementPage.tsx:65](file:///src/pages/courier/SettlementPage.tsx)#L65 | 65 | `workdays` | `.select('*')` | **17** | `eq('courier_id', profile.id), eq('w` | 1 | `CourierSettlementPage` |
| [branchesService.ts:28](file:///src/modules/branches/services/branchesService.ts)#L28 | 28 | `branches` | `.select()` vacío | **16** | *Sin filtros* | *Sin límite* | `createBranch` |
| [branchesService.ts:50](file:///src/modules/branches/services/branchesService.ts)#L50 | 50 | `branches` | `.select()` vacío | **16** | `eq('id', id)` | *Sin límite* | `updateBranch` |
| [notificationsService.ts:9](file:///src/modules/notifications/services/notificationsService.ts)#L9 | 9 | `notifications` | `.select('*')` | **13** | `eq('user_id', userId)` | 50 | `getNotifications` |
| [usersService.ts:119](file:///src/modules/users/services/usersService.ts)#L119 | 119 | `profiles` | `.select()` vacío | **13** | `eq('id', id)` | *Sin límite* | `updateUser` |
| [settlementsService.ts:859](file:///src/modules/settlements/services/settlementsService.ts)#L859 | 859 | `cash_movements` | `.select('*')` | **12** | `eq('workday_id', workdayId)` | *Sin límite* | `getCashMovements` |
| [settlementsService.ts:893](file:///src/modules/settlements/services/settlementsService.ts)#L893 | 893 | `cash_movements` | `.select()` vacío | **12** | *Sin filtros* | *Sin límite* | `createCashMovement` |
| [workdaysService.ts:451](file:///src/modules/workdays/services/workdaysService.ts)#L451 | 451 | `cash_movements` | `.select('*')` | **12** | `eq('id', payload.movementId)` | *Sin límite* | `voidCashMovement` |
| [busesService.ts:20](file:///src/modules/buses/services/busesService.ts)#L20 | 20 | `bus_routes` | `.select()` vacío | **10** | *Sin filtros* | *Sin límite* | `createBusRoute` |
| [busesService.ts:52](file:///src/modules/buses/services/busesService.ts)#L52 | 52 | `bus_routes` | `.select()` vacío | **10** | `eq('id', id)` | *Sin límite* | `updateBusRoute` |
| [exchangeRatesService.ts:149](file:///src/modules/exchange-rates/services/exchangeRatesService.ts)#L149 | 149 | `exchange_rates` | `.select()` vacío | **8** | `eq('id', existing.id)` | *Sin límite* | `saveExchangeRate` |
| [exchangeRatesService.ts:168](file:///src/modules/exchange-rates/services/exchangeRatesService.ts)#L168 | 168 | `exchange_rates` | `.select()` vacío | **8** | *Sin filtros* | *Sin límite* | `saveExchangeRate` |
| [tasksService.ts:935](file:///src/modules/tasks/services/tasksService.ts)#L935 | 935 | `task_assignments` | `.select('*')` | **8** | `eq('task_id', task_id)` | *Sin límite* | `getTaskAssignments` |
| [tasksService.ts:956](file:///src/modules/tasks/services/tasksService.ts)#L956 | 956 | `task_status_history` | `.select('*')` | **8** | `eq('task_id', task_id)` | *Sin límite* | `getTaskStatusHistory` |

---

## 4. Consultas sin `.limit()`, `.range()` ni Filtro sobre Tablas Crecientes (Table Scans)

Estas consultas leen la totalidad de filas existentes en la base de datos sin importar cuánto tiempo lleve operando la aplicación. Son las que causan aumentos exponenciales en el consumo de ancho de banda (**Egress**) y degradación de memoria en el navegador.

### 4.1. `tasks` en [backupService.ts:83](file:///src/modules/maintenance/services/backupService.ts)#L83
- **Función:** `generateFullBackup`
- **Operación:** `supabase.from('tasks').select('*')`
- **Columnas traídas:** **53 columnas** (select * completo)
- **Filas potenciales:** Trae **el 100% de la tabla** (~2500 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~1 veces por sesión**.
- **Impacto y Razón:** Total histórico de tareas (sin filtro ni paginación, crece sin tope). Acción manual puntual (Generar backup o reset).

### 4.2. `workdays` en [backupService.ts:86](file:///src/modules/maintenance/services/backupService.ts)#L86
- **Función:** `generateFullBackup`
- **Operación:** `supabase.from('workdays').select('*')`
- **Columnas traídas:** **17 columnas** (select * completo)
- **Filas potenciales:** Trae **el 100% de la tabla** (~1500 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~1 veces por sesión**.
- **Impacto y Razón:** Todo el historial acumulado en BD sin filtro de fecha. Acción manual puntual (Generar backup o reset).

### 4.3. `settlements` en [backupService.ts:88](file:///src/modules/maintenance/services/backupService.ts)#L88
- **Función:** `generateFullBackup`
- **Operación:** `supabase.from('settlements').select('*')`
- **Columnas traídas:** **17 columnas** (select * completo)
- **Filas potenciales:** Trae **el 100% de la tabla** (~1500 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~1 veces por sesión**.
- **Impacto y Razón:** Todo el historial acumulado en BD sin filtro de fecha. Acción manual puntual (Generar backup o reset).

### 4.4. `cash_movements` en [backupService.ts:87](file:///src/modules/maintenance/services/backupService.ts)#L87
- **Función:** `generateFullBackup`
- **Operación:** `supabase.from('cash_movements').select('*')`
- **Columnas traídas:** **12 columnas** (select * completo)
- **Filas potenciales:** Trae **el 100% de la tabla** (~1500 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~1 veces por sesión**.
- **Impacto y Razón:** Todo el historial acumulado en BD sin filtro de fecha. Acción manual puntual (Generar backup o reset).

### 4.5. `bus_routes` en [busesService.ts:6](file:///src/modules/buses/services/busesService.ts)#L6
- **Función:** `getBusRoutes`
- **Operación:** `supabase .from('bus_routes') .select('*') .order('destination_city', { ascending: true })`
- **Columnas traídas:** **10 columnas** (select * completo)
- **Filas potenciales:** Trae **el 100% de la tabla** (~150 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~6 veces por sesión**.
- **Impacto y Razón:** Directorio completo de buses y cooperativas. Combobox de buses en modal de tareas y directorio de buses.

### 4.6. `user_branches` en [tasksService.ts:1060](file:///src/modules/tasks/services/tasksService.ts)#L1060
- **Función:** `getCouriersForBranch`
- **Operación:** `supabase .from('user_branches') .select('user_id, branch_id, profile:profiles!user_branches_user_id_`
- **Columnas traídas:** **10 columnas** (user_id, branch_id, profile:profiles!user_branches_user_id_fkey(id, full_name, display_name, phone, avatar_url, role, is_active, primary_branch_id))
- **Filas potenciales:** Trae **el 100% de la tabla** (~90 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~8 veces por sesión**.
- **Impacto y Razón:** Todas las relaciones usuario-sucursal. Hook useCouriers al listar tareas, asignar motorizado o cambiar de sucursal.

### 4.7. `profiles` en [tasksService.ts:1047](file:///src/modules/tasks/services/tasksService.ts)#L1047
- **Función:** `getCouriersForBranch`
- **Operación:** `supabase .from('profiles') .select('id, full_name, display_name, phone, avatar_url, role, is_active,`
- **Columnas traídas:** **8 columnas** (id, full_name, display_name, phone, avatar_url, role, is_active, primary_branch_id)
- **Filas potenciales:** Trae **el 100% de la tabla** (~60 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~8 veces por sesión**.
- **Impacto y Razón:** Todos los usuarios y perfiles del sistema. Hook useCouriers al listar tareas, asignar motorizado o cambiar de sucursal.

### 4.8. `bus_routes` en [backupService.ts:82](file:///src/modules/maintenance/services/backupService.ts)#L82
- **Función:** `generateFullBackup`
- **Operación:** `supabase.from('bus_routes').select('*')`
- **Columnas traídas:** **10 columnas** (select * completo)
- **Filas potenciales:** Trae **el 100% de la tabla** (~150 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~1 veces por sesión**.
- **Impacto y Razón:** Directorio completo de buses y cooperativas. Acción manual puntual (Generar backup o reset).

### 4.9. `branches` en [branchesService.ts:6](file:///src/modules/branches/services/branchesService.ts)#L6
- **Función:** `getBranches`
- **Operación:** `supabase .from('branches') .select('*') .order('created_at', { ascending: true })`
- **Columnas traídas:** **16 columnas** (select * completo)
- **Filas potenciales:** Trae **el 100% de la tabla** (~10 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~6 veces por sesión**.
- **Impacto y Razón:** Todas las sucursales del sistema. Hook useBranches presente en casi todas las páginas y modales administrativos.

### 4.10. `profiles` en [backupService.ts:81](file:///src/modules/maintenance/services/backupService.ts)#L81
- **Función:** `generateFullBackup`
- **Operación:** `supabase.from('profiles').select('*')`
- **Columnas traídas:** **13 columnas** (select * completo)
- **Filas potenciales:** Trae **el 100% de la tabla** (~60 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~1 veces por sesión**.
- **Impacto y Razón:** Todos los usuarios y perfiles del sistema. Acción manual puntual (Generar backup o reset).

### 4.11. `user_branches` en [usersService.ts:59](file:///src/modules/users/services/usersService.ts)#L59
- **Función:** `getUsers`
- **Operación:** `supabase.from('user_branches').select('user_id, branch_id')`
- **Columnas traídas:** **2 columnas** (user_id, branch_id)
- **Filas potenciales:** Trae **el 100% de la tabla** (~90 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~4 veces por sesión**.
- **Impacto y Razón:** Todas las relaciones usuario-sucursal. Al ingresar a Gestión de Usuarios y al aplicar filtros.

### 4.12. `branches` en [tasksService.ts:996](file:///src/modules/tasks/services/tasksService.ts)#L996
- **Función:** `getCouriersForBranch`
- **Operación:** `supabase.from('branches').select('id, name, code')`
- **Columnas traídas:** **3 columnas** (id, name, code)
- **Filas potenciales:** Trae **el 100% de la tabla** (~10 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~8 veces por sesión**.
- **Impacto y Razón:** Todas las sucursales del sistema. Hook useCouriers al listar tareas, asignar motorizado o cambiar de sucursal.

### 4.13. `branches` en [backupService.ts:80](file:///src/modules/maintenance/services/backupService.ts)#L80
- **Función:** `generateFullBackup`
- **Operación:** `supabase.from('branches').select('*')`
- **Columnas traídas:** **16 columnas** (select * completo)
- **Filas potenciales:** Trae **el 100% de la tabla** (~10 filas estimadas hoy; indefinido a futuro).
- **Frecuencia por sesión:** Se ejecuta aproximadamente **~1 veces por sesión**.
- **Impacto y Razón:** Todas las sucursales del sistema. Acción manual puntual (Generar backup o reset).


---

## 5. Consultas Reactivas: `useEffect`, Intervalos, Polling o Cambios de Estado

Este grupo reúne consultas que se ejecutan automáticamente por el ciclo de vida de React, sin que el usuario haga clic explícitamente en "Buscar" o "Consultar".

### A. Consultas Directas dentro de `useEffect` (11 Casos)

| Archivo | Línea | Tabla Consultada | Dependencias de `useEffect` | Riesgo de Re-disparo |
|---|:---:|---|---|---|
| [DeliverCashModal.tsx:129](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L129 | 129 | `workdays` | `[isOpen, workdayId, selectedWorkdayId, select` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |
| [DeliverCashModal.tsx:146](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L146 | 146 | `workdays` | `[isOpen, workdayId, selectedWorkdayId, select` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |
| [DeliverCashModal.tsx:197](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L197 | 197 | `workdays` | `[isOpen, workdayId, selectedWorkdayId, select` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |
| [ReceiveCashModal.tsx:134](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L134 | 134 | `workdays` | `[isOpen, workdayId, selectedWorkdayId, select` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |
| [ReceiveCashModal.tsx:151](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L151 | 151 | `workdays` | `[isOpen, workdayId, selectedWorkdayId, select` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |
| [ReceiveCashModal.tsx:176](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L176 | 176 | `workdays` | `[isOpen, workdayId, selectedWorkdayId, select` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |
| [ReceiveCashModal.tsx:197](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L197 | 197 | `tasks` | `[isOpen, workdayId, selectedWorkdayId, select` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |
| [DeliverCashModal.tsx:218](file:///src/modules/settlements/components/DeliverCashModal.tsx)#L218 | 218 | `cash_movements` | `[isOpen, workdayId, selectedWorkdayId, select` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |
| [ReceiveCashModal.tsx:204](file:///src/modules/settlements/components/ReceiveCashModal.tsx)#L204 | 204 | `cash_movements` | `[isOpen, workdayId, selectedWorkdayId, select` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |
| [StartWorkdayModal.tsx:58](file:///src/modules/courier/components/StartWorkdayModal.tsx)#L58 | 58 | `workdays` | `[isOpen, user?.id]` | 🔴 Alto (se dispara al abrir modal y por cada cambio de dropdown) |

### B. Consultas en Intervalos y Polling Activo (`setInterval`)
1. **Rastreo continuo de mensajeros (`CourierLiveLocationContext.tsx:206`):**
   - Ejecuta un `setInterval` de emisión cada 30 segundos (`PING_INTERVAL_MS`).
   - *Nota de auditoría:* Utiliza WebSocket Broadcast (`supabase.channel.send`), por lo que no genera lecturas HTTP `SELECT` en base de datos, aunque sí consume cuota de mensajes realtime si hay clientes escuchando.
2. **Sincronización de canales (`realtimeSync.ts:140`):**
   - Intervalo local de 50ms para esperar la conexión de canales WebSocket. Es en memoria del navegador (sin peticiones Supabase).

### C. Consultas Disparadas por Cambios de Estado y React Query con `staleTime: 0`
1. **`useDirectoryContacts` (`useDirectoryContacts.ts:15`):**
   - Configurado con `staleTime: 0`. Cada vez que se monta cualquier formulario o modal que contenga `ContactAutosuggest` (ej. `TaskFormModal` al crear cualquier tarea), invalida la caché y lanza un `SELECT * FROM directory_contacts` completo.
2. **`useTasks` (`useTasks.ts:15`):**
   - Se re-ejecuta cada vez que cambia cualquier filtro: sucursal, motorizado, fecha, estado o texto de búsqueda. No tiene debounce en búsquedas locales dentro del servicio.
3. **`DashboardPage.tsx` (`useDashboard`):**
   - Refresco programado con `refetchInterval: 5 min` y `staleTime: 1 min`. Realiza 4 consultas simultáneas (`tasks`, `workdays`, `settlements`, `cash_movements`).
4. **`DeliverCashModal.tsx` y `ReceiveCashModal.tsx`:**
   - Contienen `useEffect` con múltiples estados en su array de dependencias (`selectedCourierId`, `todayStr`, etc.). Si el operador cambia de motorizado en el selector 5 veces, se lanzan 15 consultas a la base de datos de inmediato.


---

## 6. Diagnóstico de los Focos Principales y Hoja de Ruta de Mitigación

*(Recuerda que ningún cambio ha sido aplicado aún, según lo solicitado).*

### 1. Foco #1: `directory_contacts` (Directorio de Contactos)
- **Problema:** `getDirectoryContacts` descarga todas las columnas (`*`) y todas las filas de clientes, incluso cuando el usuario solo está buscando una coincidencia por nombre en un autocompletado.
- **Mitigación recomendada futura:**
  1. Agregar `.limit(20)` en el autocompletado.
  2. Proyectar solo las columnas necesarias: `.select('id, name, phone, address, category, contact_person')`.
  3. Incrementar `staleTime` de `0` a `1000 * 60 * 5` (5 minutos) en React Query.

### 2. Foco #2: `getCouriersForBranch` en `tasksService.ts`
- **Problema:** Hace tres consultas sin filtros (`branches.select('id, name, code')`, `profiles.select('...')` de TODOS los usuarios del sistema sin filtrar por rol, y `user_branches.select('...')` de todas las asignaciones).
- **Mitigación recomendada futura:**
  1. Filtrar en la consulta: `.eq('role', 'courier').eq('is_active', true)`.
  2. Si se provee `branch_id`, filtrar directamente en BD en lugar de descargar todo en un `Map` en Javascript.

### 3. Foco #3: `bus_routes` (Directorio de Buses)
- **Problema:** `getBusRoutes` hace `select('*')` sin límite ni paginación en `busesService.ts:6`.
- **Mitigación recomendada futura:**
  1. Seleccionar únicamente columnas requeridas en el combobox (`id, cooperative_name, origin_terminal, destination_city, departure_schedules, dispatch_phone`).
  2. Aplicar caché en React Query (`staleTime: 5 min`).

### 4. Foco #4: Mutaciones con `.select()` en `tasksService.ts`
- **Problema:** Se ejecutan `.insert().select()` y `.update().select()` vacíos en 10 métodos de tareas. Devuelven las 53 columnas completas de la tarea.
- **Mitigación recomendada futura:**
  1. Si el llamador solo necesita verificar éxito o actualizar el ID, usar `.select('id, code, status, updated_at')`.

### 5. Foco #5: Modales de Entrega/Recepción de Efectivo
- **Problema:** Consultas en cascada dentro de `useEffect` disparadas por cambios en selectores de formulario.
- **Mitigación recomendada futura:**
  1. Unificar las consultas en un hook React Query o cargar los datos bajo demanda únicamente cuando el modal está abierto y estabilizado.

---
*Reporte generado automáticamente por Antigravity IDE tras análisis sintáctico completo del AST.*
