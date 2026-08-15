# SPRINT_PLANNING — Bricklar Gestor
# Plan de Sprints por Fases de Estabilizacion
#
# Fecha: 2026-08-06
# Estado inicial del proyecto: ~57% listo para produccion
# Metodologia: Sprints cortos de 1-2 semanas con objetivos medibles
# Convencion de IDs: Cada tarea referencia su ID en MASTER_BACKLOG.md

---

## VISION GENERAL DE LOS SPRINTS

| Sprint | Nombre | Duracion | Objetivo |
|--------|--------|----------|----------|
| Sprint 0 | Estabilizacion Critica | 1-2 dias | Build limpio + Trabajo commiteado |
| Sprint 1 | Correccion Funcional | 1 semana | Modulos core funcionando correctamente |
| Sprint 2 | UX/Seguridad | 1 semana | Experiencia consistente + seguridad basica |
| Sprint 3 | Backend y Base de Datos | 2 semanas | Esquema versionado + modulos faltantes |
| Sprint 4 | Calidad y Codigo | 1 semana | Codigo limpio + reduccion de deuda tecnica |
| Sprint 5 | Tests | 2 semanas | Cobertura minima de pruebas automatizadas |
| Sprint 6 | QA y Responsive | 1 semana | Pruebas en dispositivos reales |
| Sprint 7 | Produccion | 3-5 dias | Deploy a produccion con checklist completo |

Total estimado: 8-10 semanas para produccion confiable.
Con recursos adicionales (2 devs), podria comprimirse a 5-6 semanas.

---

## ===================================================================
## SPRINT 0 — ESTABILIZACION CRITICA
## Duracion: 1-2 dias
## ===================================================================

### Objetivo
Resolver los blockers inmediatos que impiden cualquier avance ordenado.
Al terminar este sprint: el build pasa, el trabajo esta en git, la base es estable.

### Contexto
Este sprint es una emergencia de ingenieria. No hay desarrollo nuevo hasta resolverlo.
El riesgo de perder el trabajo es CATASTROFICO y debe eliminarse HOY.

### Tareas (en orden estricto de ejecucion)

| Orden | ID | Tarea | Complejidad | Responsable |
|-------|-----|-------|-------------|-------------|
| 1 | F1-002 | Commit de todo el trabajo acumulado (50+ archivos) | XS (15min) | Dev |
| 2 | F1-001 | Corregir error TypeScript SortableTaskCard.tsx:252 | XS (30min) | Dev |
| 3 | F1-003 | Agregar tsconfig.app.tsbuildinfo a .gitignore | XS (10min) | Dev |
| 4 | — | Verificar: npm run build PASA | — | Dev |
| 5 | — | git push origin main | — | Dev |

### Tiempo total estimado: 1-2 horas de trabajo efectivo

### Comandos de validacion
```
npx tsc --noEmit -p tsconfig.app.json    # debe retornar 0 errores
npm run lint                              # debe retornar 0 errores
npm run build                            # debe completar sin errores
git status                               # debe retornar "nothing to commit"
git log --oneline -3                     # debe mostrar los commits nuevos
```

### Resultado esperado
- npm run build pasa exitosamente
- git status retorna "nothing to commit, working tree clean"
- El repositorio remoto esta actualizado
- El proyecto puede deployarse (aunque no es optimo para produccion aun)

### Criterio de exito del Sprint 0
El comando "npm run build" produce una salida sin errores.
Todo el trabajo esta en git con historial limpio.

---

## ===================================================================
## SPRINT 1 — CORRECCION FUNCIONAL
## Duracion: 1 semana (5 dias de trabajo)
## ===================================================================

### Objetivo
Corregir todas las funcionalidades visibles que no operan correctamente.
Al terminar: el admin puede cerrar el dia, el dashboard es preciso, el onboarding funciona.

### Tareas

| ID | Tarea | Complejidad | Dias | Dependencias |
|----|-------|-------------|------|--------------|
| F2-001 | Cierre Diario — escritura real a daily_closures | L (8h) | 1 | Sprint 0 |
| F2-002 | Dashboard — filtro deleted_at en KPIs | XS (15min) | 0.1 | Sprint 0 |
| F2-003 | Settings — refrescar perfil tras guardar | XS (20min) | 0.1 | Sprint 0 |
| F2-004 | Verificar flujo de Contrasena Temporal | M (4h) | 0.5 | Sprint 0 |
| F2-005 | Notificaciones — implementar triggers en DB | XL (2 dias) | 2 | Sprint 0 |
| F2-006 | TaskDetailPage courier — historial completo | M (4h) | 0.5 | Sprint 0 |
| F9-005 | Ampliar audit log en eventos criticos | M (4h) | 0.5 | Sprint 0 |

### Plan diario

DIA 1:
- F2-002: Filtro deleted_at en Dashboard (15 min — primer commit del sprint)
- F2-003: refreshProfile() en SettingsPage (20 min)
- F2-001: Iniciar implementacion de Cierre Diario (toda la tarde)

DIA 2:
- F2-001: Completar y testear Cierre Diario end-to-end

DIA 3:
- F2-004: Verificar flujo completo de Contrasena Temporal
- F2-006: Historial completo en TaskDetailPage del courier
- F9-005: Agregar audit log en approveTask, rejectTask, user_created

DIA 4:
- F2-005: Disenar e implementar triggers de notificaciones en DB

DIA 5:
- F2-005: Continuar y testear triggers de notificaciones
- Buffer: revision, correccion de bugs encontrados, PR review

### Tiempo total estimado: 4-5 dias de trabajo efectivo

### Validacion del Sprint 1

Para considerar el sprint COMPLETO:
1. Ir a DailyClosurePage, confirmar cierre, verificar registro en daily_closures en Supabase
2. Crear y eliminar una tarea, verificar que el Dashboard no la cuenta
3. Cambiar nombre en Settings, verificar que el header se actualiza sin recargar
4. Crear un usuario nuevo, completar el flujo de contrasena temporal
5. Asignar tarea a motorizado, verificar notificacion en NotificationsPage
6. Ver detalle de tarea como motorizado, verificar historial de estados

### Resultado esperado
- El Cierre Diario es real y persistente en la base de datos
- Los KPIs del Dashboard son precisos
- El onboarding de usuarios nuevos funciona de extremo a extremo
- Las notificaciones se crean automaticamente ante eventos de negocio
- El audit log cubre los eventos mas criticos del sistema

### Criterio de exito del Sprint 1
El flujo completo de una jornada operativa funciona de principio a fin:
inicio de jornada -> asignacion de tareas -> completar tareas -> liquidacion -> cierre diario.
Todos los pasos se registran correctamente en la base de datos.

---

## ===================================================================
## SPRINT 2 — UX Y SEGURIDAD BASICA
## Duracion: 1 semana (5 dias de trabajo)
## ===================================================================

### Objetivo
Eliminar todas las fricciones de UX. Agregar la seguridad basica requerida para produccion.
Al terminar: experiencia consistente, headers de seguridad activos, RLS verificado.

### Tareas

| ID | Tarea | Complejidad | Dias | Dependencias |
|----|-------|-------------|------|--------------|
| F3-001 | ConfirmDialog en UsersPage | S (2h) | 0.3 | Sprint 0 |
| F3-002 | ConfirmDialog en BranchesPage | S (1h) | 0.2 | Sprint 0 |
| F3-003 | ConfirmDialog en BusDirectoryPage | XS (45min) | 0.1 | Sprint 0 |
| F3-004 | Pagina 404 personalizada | S (2h) | 0.3 | Sprint 0 |
| F3-005 | Avatar de usuario en SettingsPage | M (4h) | 0.5 | F2-003 |
| F4-001 | Resolver ButtonVariant "success" en Design System | S (2h) | 0.3 | F1-001 |
| F4-003 | Ampliar reglas de oxlint | S (2h) | 0.3 | — |
| F5-001 | Headers de seguridad HTTP en vercel.json | S (2h) | 0.3 | Sprint 0 |
| F5-002 | Auditoria y documentacion de RLS de Supabase | XL (2 dias) | 2 | — |
| F5-003 | Validacion de tipo/tamano en upload de evidencias | S (2h) | 0.3 | Sprint 0 |
| F5-004 | Eliminar logs de consola con datos sensibles | S (2h) | 0.3 | Sprint 0 |

### Plan diario

DIA 1:
- F3-001, F3-002, F3-003: Reemplazar los 3 window.confirm con ConfirmDialog (manana)
- F3-004: Implementar pagina 404 personalizada (tarde)

DIA 2:
- F5-001: Configurar headers de seguridad en vercel.json (manana)
- F5-003: Validacion de tipo/tamano en upload de evidencias (manana)
- F5-004: Eliminar logs de consola con datos sensibles (tarde)

DIA 3:
- F4-001: Resolver ButtonVariant — documentar decision en DESIGN_SYSTEM.md (manana)
- F4-003: Ampliar oxlint y corregir warnings encontrados (tarde)

DIA 4:
- F5-002: Auditoria de RLS — revisar cada tabla en Supabase Dashboard

DIA 5:
- F5-002: Continuar auditoria RLS, documentar SECURITY_AUDIT_RLS.md
- F3-005: Avatar de usuario en SettingsPage

### Validacion del Sprint 2

1. Intentar activar/desactivar un usuario — debe aparecer ConfirmDialog, no window.confirm
2. Navegar a /ruta-inexistente — debe mostrar pagina 404 estilizada
3. Subir una imagen de avatar — debe mostrarse en el header
4. Subir un archivo .txt como evidencia — debe rechazarse con error claro
5. Escanear la app en SecurityHeaders.com — debe obtener grado A o superior
6. Crear 2 usuarios de sucursales distintas — verificar que no pueden ver datos del otro
7. En DevTools, verificar que no hay console.log con datos de usuario en produccion

### Resultado esperado
- No existe ningun window.confirm nativo en toda la aplicacion
- La app obtiene grado A en SecurityHeaders.com
- El RLS esta verificado y documentado para todas las tablas activas
- Los uploads de evidencias rechazan tipos de archivo invalidos

### Criterio de exito del Sprint 2
SecurityHeaders.com da grado A o superior.
Ninguna tabla activa carece de RLS verificado.
El design system es 100% consistente (sin ButtonVariant sin definir).

---

## ===================================================================
## SPRINT 3 — BACKEND Y BASE DE DATOS
## Duracion: 2 semanas (10 dias de trabajo)
## ===================================================================

### Objetivo
Versionar el esquema completo de la BD. Implementar modulos que faltan.
Resolver tablas huerfanas. Completar integracion de Realtime.
Al terminar: la BD esta versionada, el tipo de cambio funciona, Realtime es completo.

### Tareas

| ID | Tarea | Complejidad | Dias | Dependencias |
|----|-------|-------------|------|--------------|
| F8-001 | Exportar y versionar esquema SQL completo | M (4h) | 0.5 | Sprint 0 |
| F8-002 | Plan de accion para tablas huerfanas | M (4h) | 0.5 | F8-001 |
| F8-003 | UI para tipo de cambio (exchange_rates) | L (1 dia) | 1 | F8-001 |
| F8-004 | Resolver duplicidad financial_movements / cash_movements | XL (2 dias) | 2 | F8-001, F8-002 |
| F6-001 | Realtime — suscripcion a tabla notifications | S (2h) | 0.3 | F2-005 (Sprint 1) |
| F6-002 | Realtime — suscripcion a tabla workdays | S (1h) | 0.2 | Sprint 0 |
| F6-003 | Realtime — invalidacion selectiva de queries | M (4h) | 0.5 | Sprint 0 |
| F4-002 | Normalizar CRLF a LF en database.types.ts | XS (20min) | 0.1 | F1-002 |
| F7-001 | RPC batch para updateTaskRouteOrders | M (4h) | 0.5 | F8-001 |
| F12-004 | Backup automatico de Supabase | S (3h) | 0.4 | F8-001 |

### Plan por semana

SEMANA 1 (dias 1-5):
- DIA 1: F8-001 — Exportar y versionar esquema SQL completo
- DIA 1 tarde: F8-002 — Crear DATABASE_DECISIONS.md con decisiones para tablas huerfanas
- DIA 2: F8-003 — UI para tipo de cambio
- DIA 3: F8-004 — Inicio de resolucion de duplicidad financiera
- DIA 4: F8-004 — Continuar y testear resolucion de duplicidad
- DIA 5: F6-002, F6-003 — Mejoras de Realtime. Buffer para revisiones.

SEMANA 2 (dias 6-10):
- DIA 6: F6-001 — Realtime sobre notifications (depende de Sprint 1 F2-005)
- DIA 7: F7-001 — RPC batch para reordenamiento de ruta
- DIA 8: F4-002, F12-004 — Normalizar CRLF, configurar backup de Supabase
- DIA 9-10: Buffer — revision integral, correcciones, documentacion

### Validacion del Sprint 3

1. Ejecutar migracion exportada en un proyecto Supabase nuevo — debe funcionar
2. Ingresar un tipo de cambio USD/NIO — verificar en liquidaciones
3. Reordenar 10 tareas — verificar 1 solo request en Network tab
4. Abrir jornadas en dos ventanas admin — cambio en una debe reflejarse en la otra
5. Verificar que daily_closures y notification tienen backups configurados
6. Todas las tablas en DATABASE_DECISIONS.md tienen decision documentada

### Resultado esperado
- El esquema completo de la BD esta versionado en supabase/migrations/
- El tipo de cambio se puede gestionar desde el admin
- Realtime cubre tasks, task_assignments, workdays y notifications
- El backup diario esta configurado y probado

### Criterio de exito del Sprint 3
Supabase db dump + migraciones reconstruyen el esquema completo.
El tipo de cambio USD/NIO se usa en el calculo de liquidaciones.

---

## ===================================================================
## SPRINT 4 — CALIDAD Y CODIGO
## Duracion: 1 semana (5 dias de trabajo)
## ===================================================================

### Objetivo
Limpiar el codigo. Eliminar duplicaciones. Mejorar rendimiento.
Al terminar: codigo sin deuda tecnica evidente, imports limpios, codigo muerto eliminado.

### Tareas

| ID | Tarea | Complejidad | Dias | Dependencias |
|----|-------|-------------|------|--------------|
| F7-002 | Extraer hook usePrimaryBranch | S (2h) | 0.3 | Sprint 0 |
| F7-003 | Extraer utilidad getTodayStr | XS (30min) | 0.1 | Sprint 0 |
| F7-004 | Memoizacion en listas grandes (useMemo/useCallback) | M (4h) | 0.5 | Sprint 0 |
| F9-001 | Tipar err: any en CourierLayout | XS (15min) | 0.1 | Sprint 0 |
| F9-002 | Reorganizar imports en UsersPage | XS (5min) | 0.1 | Sprint 0 |
| F9-003 | Verificar y eliminar CompleteTaskModal si es muerto | XS (30min) | 0.1 | Sprint 0 |
| F9-004 | Eliminar dependencias sin uso | XS (15min) | 0.1 | F1-002 |

### Plan diario

DIA 1:
- F9-001, F9-002, F9-003, F9-004: Todas las tareas XS del dia (manana, ~1.5h total)
- F7-002: Extraer usePrimaryBranch() y actualizar los 6+ componentes afectados

DIA 2:
- F7-003: Extraer getTodayStr() y actualizar los 6+ archivos afectados
- F7-004: Agregar memoizacion en TasksPage, UsersPage, WorkdaysPage

DIA 3-5:
- F7-005 OPCIONAL (si hay tiempo): Iniciar refactorizacion de TaskFormModal
- Buffer: revision completa, npm run build, npm run lint, verificacion de funcionalidad

### Validacion del Sprint 4

```
npm run lint  # debe retornar 0 errores y 0 warnings
npx tsc --noEmit  # debe retornar 0 errores
npm run build  # debe completar sin errores
```

1. Buscar "profile?.primary_branch_id || profile?.branch_ids[0]" — debe aparecer solo en usePrimaryBranch.ts
2. Buscar "new Date().toISOString().split('T')[0]" — debe aparecer solo en date.ts
3. Buscar "CompleteTaskModal" en src/ — debe retornar 0 resultados (si se elimino)
4. Verificar que @react-pdf/renderer no esta en package.json
5. React DevTools Profiler — verificar menos renders en TasksPage al interactuar

### Resultado esperado
- No existe codigo duplicado de los patrones identificados
- El codigo muerto esta eliminado
- Las dependencias sin uso estan removidas
- El rendimiento de las paginas con listas es notablemente mejor

### Criterio de exito del Sprint 4
npm run lint retorna 0 errores y 0 warnings.
La busqueda de patrones duplicados retorna 0 resultados.

---

## ===================================================================
## SPRINT 5 — TESTS AUTOMATIZADOS
## Duracion: 2 semanas (10 dias de trabajo)
## ===================================================================

### Objetivo
Establecer una cobertura minima de pruebas automatizadas para los flujos criticos.
Al terminar: los servicios core tienen tests, los schemas tienen tests, E2E cubren 6 flujos.

### Tareas

| ID | Tarea | Complejidad | Dias | Dependencias |
|----|-------|-------------|------|--------------|
| F10-001 | Configurar Vitest y testing-library | S (3h) | 0.4 | Sprint 4 |
| F10-002 | Tests unitarios para tasksService | XL (2 dias) | 2 | F10-001 |
| F10-003 | Tests unitarios para schemas Zod | M (4h) | 0.5 | F10-001 |
| F10-004 | Tests E2E con Playwright (6 flujos criticos) | XXL (1 semana) | 5 | F10-001 |

### Plan por semana

SEMANA 1 (dias 1-5):
- DIA 1: F10-001 — Configurar Vitest, testing-library, path aliases, setup file
- DIA 2-3: F10-002 — Tests unitarios de tasksService (createTask, deleteTask, changeTaskStatus, assignTask)
- DIA 4: F10-003 — Tests unitarios de schemas Zod
- DIA 5: Buffer — corregir failing tests, aumentar cobertura

SEMANA 2 (dias 6-10):
- DIA 6: F10-004 — Setup de Playwright, configuracion de BD de pruebas
- DIA 7: F10-004 — Tests E2E de login y creacion de tarea
- DIA 8: F10-004 — Tests E2E de asignacion y cambio de estado
- DIA 9: F10-004 — Tests E2E de jornada y liquidacion
- DIA 10: Buffer — corregir tests fallidos, documentacion, PR review

### Validacion del Sprint 5

```
npm test                         # debe retornar PASS en todos los tests unitarios
npm run test:coverage            # debe mostrar cobertura > 80% en tasksService
npx playwright test              # debe retornar PASS en todos los tests E2E
```

### Resultado esperado
- Al menos 20 tests unitarios escritos y pasando
- Cobertura > 80% en tasksService.ts
- Al menos 6 flujos E2E cubiertos y pasando
- Los tests se ejecutan en menos de 2 minutos en total

### Criterio de exito del Sprint 5
npm test y npx playwright test retornan PASS.
Cobertura total > 60% en los servicios criticos.

---

## ===================================================================
## SPRINT 6 — QA Y RESPONSIVE
## Duracion: 1 semana (5 dias de trabajo)
## ===================================================================

### Objetivo
Verificar que la app funciona en todos los dispositivos objetivo.
Documentar y corregir todos los bugs encontrados en el QA.
Al terminar: la app ha sido probada en Android, iPhone y Tablet.

### Tareas

| ID | Tarea | Complejidad | Dias | Dependencias |
|----|-------|-------------|------|--------------|
| F11-001 | QA manual en Android Chrome | M (1 dia) | 1 | Sprints 1-4 |
| F11-002 | QA manual en iPhone Safari | M (1 dia) | 1 | F11-001 |
| F11-003 | QA manual en Tablet | S (4h) | 0.5 | F11-001 |
| — | Correccion de bugs encontrados en QA | Variable | 2-3 | F11-001, F11-002, F11-003 |

### Plan diario

DIA 1: F11-001 — QA completo en Android Chrome
  Documentar: screenshots, videos, lista de bugs en QA_ANDROID_REPORT.md

DIA 2: F11-002 — QA completo en iPhone Safari
  Documentar: screenshots, videos, lista de bugs en QA_IOS_REPORT.md

DIA 3: F11-003 — QA en Tablet
  Documentar: screenshots, bugs en QA_TABLET_REPORT.md

DIA 4-5: Correccion de bugs encontrados en el QA
  Priorizar: bloqueantes primero, medios despues, menores si hay tiempo

### Protocolo de QA (flujos a verificar)

FLUJOS MOTORIZADO (Android + iPhone):
1. Login con email/contrasena
2. Ver lista de tareas del dia
3. Buscar una tarea especifica
4. Reordenar tareas en Mi Ruta con DnD
5. Abrir detalle de una tarea
6. Cambiar estado de tarea (En ruta -> En gestion -> Completada)
7. Subir evidencia de tarea
8. Registrar un gasto en Fondos
9. Ver resumen de liquidacion
10. Enviar liquidacion
11. Ver notificaciones

FLUJOS ADMINISTRADOR (Tablet):
1. Login y ver Dashboard
2. Crear una nueva tarea
3. Asignar tarea a motorizado
4. Cambiar estado de tarea desde admin
5. Ver jornadas del dia
6. Entregar fondo a motorizado
7. Aprobar liquidacion
8. Ver reportes y exportar CSV
9. Crear/editar usuario
10. Confirmar cierre diario

### Validacion del Sprint 6

- QA_ANDROID_REPORT.md: 0 bugs criticos, 0 bugs altos sin resolver
- QA_IOS_REPORT.md: 0 bugs criticos, 0 bugs altos sin resolver
- QA_TABLET_REPORT.md: 0 bugs criticos, 0 bugs altos sin resolver
- Todos los flujos del protocolo funcionan en todos los dispositivos probados

### Resultado esperado
- Tres reportes de QA documentados con screenshots
- Todos los bugs criticos y altos corregidos
- La app funciona correctamente en Android, iPhone y Tablet

### Criterio de exito del Sprint 6
Los 10 flujos del motorizado funcionan en Android y iPhone sin bugs bloqueantes.
Los 10 flujos del admin funcionan en Tablet sin bugs bloqueantes.

---

## ===================================================================
## SPRINT 7 — PREPARACION PARA PRODUCCION
## Duracion: 3-5 dias de trabajo
## ===================================================================

### Objetivo
Completar todos los requisitos del PRODUCTION_CHECKLIST.md.
Hacer el deploy inicial a produccion.
Al terminar: la app esta disponible en su dominio de produccion con monitoreo activo.

### Tareas

| ID | Tarea | Complejidad | Dias | Dependencias |
|----|-------|-------------|------|--------------|
| F12-001 | Configurar variables de entorno en Vercel | XS (20min) | 0.1 | Sprints 0-6 |
| F12-002 | Configurar dominio personalizado | S (2h) | 0.3 | F12-001 |
| F12-003 | Configurar Sentry para monitoreo de errores | S (3h) | 0.4 | F12-001 |
| — | Deploy inicial a staging | — | 0.2 | F12-001 |
| — | Smoke test en staging | — | 0.5 | Deploy staging |
| — | Deploy a produccion | — | 0.1 | Smoke test OK |
| — | Verificar produccion con PRODUCTION_CHECKLIST.md | — | 0.3 | Deploy produccion |
| — | Comunicar disponibilidad a usuarios piloto | — | 0.1 | Checklist completo |

### Plan diario

DIA 1:
- Configurar todas las variables de entorno en Vercel (F12-001)
- Configurar dominio personalizado y DNS (F12-002)
- Deploy a staging (rama de staging o URL de preview de Vercel)

DIA 2:
- Smoke test completo en staging usando el protocolo de QA del Sprint 6
- Documentar resultados del smoke test
- Corregir cualquier bug de configuracion encontrado

DIA 3:
- Configurar Sentry (F12-003) y verificar que captura errores
- Verificar PRODUCTION_CHECKLIST.md — todos los items deben estar marcados
- Deploy a produccion (si el checklist esta completo)

DIA 4 (si se necesita):
- Buffer para correccion de problemas de produccion
- Verificacion de metricas de Sentry

DIA 5 (si se necesita):
- Comunicacion a usuarios piloto
- Monitoreo de las primeras 24h

### Validacion del Sprint 7

1. La app es accesible desde https://[dominio-produccion]
2. El certificado SSL es valido (candado verde en el navegador)
3. SecurityHeaders.com da grado A o superior en la URL de produccion
4. El login funciona con credenciales reales
5. Sentry captura errores correctamente (verificar con error intencional)
6. npm run build produce una salida con 0 errores
7. PRODUCTION_CHECKLIST.md tiene todos los items marcados como completados

### Resultado esperado
- La app esta disponible en produccion en su dominio personalizado
- Sentry esta activo y captura errores
- El backup diario de Supabase esta configurado y probado
- El PRODUCTION_CHECKLIST.md esta 100% completo

### Criterio de exito del Sprint 7
La URL de produccion carga en menos de 3 segundos.
Los usuarios piloto pueden usar la app sin intervenciones del equipo de desarrollo.
Sentry recibe datos de sesion activa.

---

## ===================================================================
## SPRINT POST-MVP — FUNCIONALIDADES PREMIUM (Post-produccion inicial)
## ===================================================================

### Objetivo
Implementar las funcionalidades de Fase 13 segun el feedback de usuarios reales.
Estos sprints se planifican despues de tener usuarios en produccion.

### Backlog Post-MVP (prioridad a definir con feedback real)
1. F13-003 — Confirmacion de transferencias de efectivo (cash_transfers)
2. F7-005 — Refactorizacion de TaskFormModal (deuda tecnica)
3. F13-002 — Exportacion de reportes en PDF
4. F13-001 — Horarios de buses y destinos
5. F13-004 — Preferencias de notificaciones por usuario
6. F13-005 — Asignacion multi-sucursal de motorizados
7. F13-006 — Configuracion avanzada por sucursal
8. F13-007 — Geolocalizacion y mapa de rutas

---

## ===================================================================
## MATRIZ DE DEPENDENCIAS CRITICAS
## ===================================================================

El siguiente diagrama muestra las dependencias que NO pueden violarse:

Sprint 0 (F1-002, F1-001, F1-003)
    |
    +--> Sprint 1 (F2-001, F2-002, F2-003, F2-004, F2-005, F2-006)
    |         |
    |         +--> Sprint 3 (F6-001 depende de F2-005)
    |
    +--> Sprint 2 (F3-xxx, F4-xxx, F5-xxx)
    |
    +--> Sprint 3 (F8-001 -> F8-002 -> F8-003, F8-004)
    |         |
    |         +--> Sprint 7 (F12-004 depende de F8-001)
    |
    +--> Sprint 4 (F7-xxx, F9-xxx)
    |
    +--> Sprint 5 (F10-001 -> F10-002, F10-003, F10-004)
    |
    +--> Sprint 6 (F11-001 -> F11-002 -> F11-003) [requiere Sprints 1-4 completados]
    |
    +--> Sprint 7 (F12-001 -> F12-002, F12-003) [requiere TODO lo anterior]

REGLA DE ORO: El Sprint 7 (Produccion) no puede comenzar hasta que
Sprints 0, 1, 2, 5 esten COMPLETADOS y el PRODUCTION_CHECKLIST.md este listo.

---

## ===================================================================
## METRICAS DE EXITO GLOBALES
## ===================================================================

| Metrica | Valor Actual | Meta Sprint 0 | Meta Sprint 7 |
|---------|-------------|---------------|---------------|
| npm run build pasa | NO | SI | SI |
| Archivos commiteados | 50+ pendientes | 0 pendientes | 0 pendientes |
| TypeScript errores | 1 | 0 | 0 |
| ESLint warnings | 0 | 0 | 0 |
| Tests unitarios | 0 | 0 | 20+ |
| Cobertura de tests | 0% | 0% | >60% |
| Tests E2E | 0 | 0 | 6+ |
| Grado SecurityHeaders | F/no medido | sin cambio | A o superior |
| RLS verificado | No verificado | No verificado | Todas las tablas |
| Backup configurado | No | No | SI (diario) |
| Monitoreo de errores | No | No | Sentry activo |
| QA en Android | No | No | SI |
| QA en iPhone | No | No | SI |
| Madurez del proyecto | 57% | 60% | 85-90% |

*Sprint Planning version 1.0 — Generado el 2026-08-06*
*Sujeto a revision tras cada sprint completado*
