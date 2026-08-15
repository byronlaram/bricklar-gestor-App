# MASTER_BACKLOG — Bricklar Gestor
# Plan Maestro de Estabilizacion y Desarrollo Profesional
#
# Fecha de creacion: 2026-08-06
# Basado en: PROJECT_AUDIT_REPORT.md (Auditoria Integral)
# Madurez actual: ~57% para produccion
# Metodologia: Feature-driven sprints con criterios de aceptacion verificables
#
# ==========================================================================
# LEYENDA
# Prioridad:    P0=CRITICA | P1=ALTA | P2=MEDIA | P3=BAJA
# Complejidad:  XS=30min | S=2h | M=4h | L=8h | XL=2dias | XXL=1semana
# Impacto:      BLOQUEANTE | CRITICO | ALTO | MEDIO | BAJO
# ==========================================================================

## RESUMEN EJECUTIVO DEL BACKLOG

| Fase | Area | Items | Tiempo Est. | Prioridad Max |
|------|------|-------|-------------|---------------|
| Fase 1  | Criticos que bloquean produccion | 3  | ~1h      | P0 |
| Fase 2  | Errores funcionales              | 6  | ~4 dias  | P0 |
| Fase 3  | Problemas de UX                  | 5  | ~10h     | P1 |
| Fase 4  | Problemas de UI                  | 3  | ~4h      | P2 |
| Fase 5  | Seguridad                        | 4  | ~3 dias  | P0 |
| Fase 6  | Realtime                         | 3  | ~7h      | P2 |
| Fase 7  | Optimizacion                     | 5  | ~3 dias  | P1 |
| Fase 8  | Base de datos                    | 4  | ~5 dias  | P0 |
| Fase 9  | Codigo                           | 5  | ~8h      | P2 |
| Fase 10 | Tests                            | 4  | ~2 semanas| P1 |
| Fase 11 | Responsive                       | 3  | ~2.5 dias | P0 |
| Fase 12 | Preparacion produccion           | 4  | ~2 dias  | P0 |
| Fase 13 | Funcionalidades futuras (Post-MVP)| 7 | ~3 semanas| P3|

Total estimado para produccion (Fases 1-12): 30-40 dias de trabajo efectivo.

---

## ===================================================================
## FASE 1 — ERRORES CRITICOS QUE BLOQUEAN PRODUCCION
## Objetivo: Desbloquear el build y proteger el trabajo acumulado.
## ===================================================================

### [F1-001] Corregir error TypeScript en SortableTaskCard

- Nombre: Fix TypeScript build-blocker variant="success" invalido
- Descripcion: SortableTaskCard.tsx linea 252 usa variant="success" en el componente Button.
  ButtonVariant no incluye "success". El compilador falla con TS2322.
  Dos soluciones: (A) Cambiar a variant="confirm" — recomendada.
  (B) Agregar "success" como nueva variante en Button.tsx con estilos.
- Impacto: BLOQUEANTE — npm run build falla completamente
- Riesgo: CRITICO — ningun deploy a produccion es posible
- Prioridad: P0 — CRITICA
- Complejidad: XS (30 minutos)
- Tiempo estimado: 30 minutos
- Archivos involucrados:
    src/modules/tasks/components/SortableTaskCard.tsx (linea 252)
    src/shared/components/ui/Button.tsx (si se elige opcion B)
- Dependencias: Ninguna. Es el primer paso de todo.
- Como validarla: npx tsc --noEmit -p tsconfig.app.json debe retornar 0 errores
- Criterios de aceptacion:
    * npx tsc --noEmit retorna 0 errores
    * npm run build completa sin errores
    * El boton "Finalizar Gestion" en Mi Ruta muestra el color correcto

---

### [F1-002] Hacer commit de todo el trabajo acumulado

- Nombre: Commit atomico del trabajo post-auditoria (50+ archivos)
- Descripcion: Existen 50+ archivos modificados/sin trackear que nunca fueron commiteados.
  Todo el desarrollo post-commit a96bb6a existe solo en el disco local.
  Ante cualquier reset, falla de disco o trabajo colaborativo, este codigo se perderia.
- Impacto: BLOQUEANTE — riesgo de perdida total del trabajo
- Riesgo: CATASTROFICO si se pierde el trabajo
- Prioridad: P0 — CRITICA
- Complejidad: XS (15 minutos)
- Tiempo estimado: 15 minutos
- Archivos involucrados: Todos los 50+ archivos modificados segun git status
- Dependencias: Ninguna. Debe hacerse ANTES que cualquier otra tarea.
- Como validarla: git status retorna "nothing to commit, working tree clean"
- Criterios de aceptacion:
    * git status retorna working tree clean
    * git log muestra commit nuevo con mensaje descriptivo
    * El repositorio remoto (origin/main) esta actualizado via git push

---

### [F1-003] Agregar tsconfig.app.tsbuildinfo a .gitignore

- Nombre: Limpiar artefactos de compilacion del repositorio
- Descripcion: tsconfig.app.tsbuildinfo (3.3KB) esta en el repositorio y no deberia.
  Es un artefacto de compilacion incremental que cambia en cada build
  y genera diffs innecesarios que contaminan el historial de git.
- Impacto: MEDIO — genera ruido en git y puede causar conflictos en CI/CD
- Riesgo: BAJO
- Prioridad: P1 — ALTA
- Complejidad: XS (10 minutos)
- Tiempo estimado: 10 minutos
- Archivos involucrados:
    .gitignore (agregar entrada "tsconfig.app.tsbuildinfo")
    tsconfig.app.tsbuildinfo (eliminar del indice con git rm --cached)
- Dependencias: F1-002 (hacer primero el commit del trabajo actual)
- Como validarla: git status no muestra tsconfig.app.tsbuildinfo tras hacer un build
- Criterios de aceptacion:
    * tsconfig.app.tsbuildinfo no aparece en git status
    * .gitignore incluye la entrada correcta
    * npm run build sigue funcionando

---

## ===================================================================
## FASE 2 — ERRORES FUNCIONALES
## Objetivo: Corregir funcionalidades visibles que no operan correctamente.
## ===================================================================

### [F2-001] Implementar Cierre Diario con persistencia real en base de datos

- Nombre: Cierre Diario — escritura real a tabla daily_closures
- Descripcion: DailyClosurePage.tsx "Confirmar Cierre Diario" solo ejecuta setIsClosed(true).
  No hay ninguna llamada a Supabase. La tabla daily_closures nunca recibe registros.
  El administrador cree que cierra el dia pero no hay ninguna evidencia en DB.
  Implementar: dailyClosureService.ts, hook useDailyClosure, calculo consolidado
  de totales (tasks_total, tasks_completed, total_collections, workdays_count),
  escritura atomica a daily_closures con status="closed", ConfirmDialog previo.
- Impacto: CRITICO — riesgo financiero. Perdida de trazabilidad de cierres.
- Riesgo: FINANCIERO ALTO
- Prioridad: P0 — CRITICA
- Complejidad: L (8 horas)
- Tiempo estimado: 1 dia
- Archivos involucrados:
    src/pages/admin/DailyClosurePage.tsx
    src/modules/settlements/services/settlementsService.ts
    src/modules/settlements/hooks/useSettlements.ts
    supabase/migrations/ (nueva RPC si necesaria)
- Dependencias: F1-001, F1-002
- Como validarla:
    1. Ir a DailyClosurePage con datos del dia
    2. Confirmar el cierre
    3. Verificar en Supabase que daily_closures tiene un nuevo registro
    4. Verificar que el boton queda deshabilitado
- Criterios de aceptacion:
    * Existe registro en daily_closures por cada cierre confirmado
    * Los totales calculados son correctos
    * No se puede hacer doble cierre del mismo dia/sucursal
    * Toast de exito/error segun resultado

---

### [F2-002] Corregir Dashboard — filtrar tareas soft-deleted en KPIs

- Nombre: Dashboard KPIs con datos incorrectos por falta de filtro deleted_at
- Descripcion: DashboardPage.tsx linea 42 hace query a "tasks" sin .is('deleted_at', null).
  Tareas eliminadas siguen apareciendo en los contadores del dashboard.
  Es un fix de una linea con impacto directo en la calidad de la informacion.
- Impacto: ALTO — KPIs muestran datos incorrectos
- Riesgo: MEDIO — confusion operativa para el administrador
- Prioridad: P1 — ALTA
- Complejidad: XS (15 minutos)
- Tiempo estimado: 15 minutos
- Archivos involucrados:
    src/pages/admin/DashboardPage.tsx (linea ~42)
- Dependencias: Ninguna
- Como validarla: Crear y eliminar una tarea, verificar que el contador decremente
- Criterios de aceptacion:
    * KPIs no incluyen tareas con deleted_at IS NOT NULL
    * Total de tareas coincide con el conteo en la pagina de Tareas

---

### [F2-003] Corregir Settings — refrescar perfil tras guardar cambios

- Nombre: SettingsPage no actualiza el header tras guardar nombre/telefono
- Descripcion: SettingsPage.tsx guarda en Supabase pero no llama a refreshProfile()
  del AuthContext. El header sigue mostrando el nombre anterior hasta recargar.
  Se debe llamar refreshProfile() despues de handleSaveProfile() exitoso.
- Impacto: MEDIO — el usuario guarda pero no ve el cambio reflejado
- Riesgo: BAJO — UX degradada pero no pierde datos
- Prioridad: P1 — ALTA
- Complejidad: XS (20 minutos)
- Tiempo estimado: 20 minutos
- Archivos involucrados:
    src/pages/admin/SettingsPage.tsx (funcion handleSaveProfile)
- Dependencias: Ninguna
- Como validarla: Cambiar nombre, guardar, verificar que el header se actualiza SIN recargar
- Criterios de aceptacion:
    * El header muestra el nuevo nombre inmediatamente tras guardar
    * No se requiere recarga de pagina

---

### [F2-004] Verificar e integrar flujo de Contrasena Temporal

- Nombre: TempPasswordModal — verificar integracion completa en UsersPage
- Descripcion: TempPasswordModal.tsx existe (10KB) pero sin evidencia de integracion.
  Verificar: si se abre tras crear usuario, si Edge Function manage-user-password
  esta deployada, si must_change_password se setea, si RouteGuard redirige correctamente.
- Impacto: ALTO — los usuarios nuevos no pueden onboardearse si el flujo falla
- Riesgo: OPERATIVO ALTO
- Prioridad: P1 — ALTA
- Complejidad: M (4 horas)
- Tiempo estimado: 4 horas
- Archivos involucrados:
    src/pages/admin/UsersPage.tsx
    src/modules/users/components/TempPasswordModal.tsx
    src/modules/users/components/UserFormModal.tsx
    supabase/functions/manage-user-password/
    src/modules/auth/RouteGuard.tsx
- Dependencias: F1-001, F1-002
- Como validarla: Crear usuario nuevo, verificar TempPasswordModal, hacer login, ver flujo completo
- Criterios de aceptacion:
    * Flujo completo de onboarding funciona sin errores
    * El flag must_change_password se resetea tras el primer cambio

---

### [F2-005] Notificaciones — implementar productor de notificaciones

- Nombre: Sistema de notificaciones sin backend productor
- Descripcion: La tabla "notifications" existe y la UI la lee. Sin embargo nada crea notificaciones.
  Los Toasts de useTasksRealtime son efimeros. Implementar mecanismo de creacion:
  Se recomienda Triggers PostgreSQL que inserten en notifications ante eventos clave
  (nueva tarea asignada, reasignada, liquidacion aprobada, fondo entregado).
- Impacto: ALTO — la pagina de Notificaciones siempre muestra vacio
- Riesgo: UX DEGRADADA
- Prioridad: P1 — ALTA
- Complejidad: XL (2 dias)
- Tiempo estimado: 2 dias
- Archivos involucrados:
    supabase/migrations/ (nueva migracion con triggers)
    src/pages/courier/NotificationsPage.tsx
    src/modules/tasks/services/tasksService.ts
- Dependencias: F1-002, acceso al dashboard de Supabase
- Como validarla: Asignar tarea a motorizado, verificar que aparece notificacion sin recargar
- Criterios de aceptacion:
    * Notificaciones se crean automaticamente ante eventos relevantes
    * El motorizado ve notificaciones de asignacion y cambios de estado

---

### [F2-006] Completar historial de tarea en panel del motorizado

- Nombre: TaskDetailPage courier — mostrar historial de cambios de estado
- Descripcion: TaskDetailPage del courier muestra datos basicos pero no el historial completo
  de cambios de estado ni de asignaciones. El admin si puede ver esto.
  Agregar: cambios de estado con fecha/hora y notas, reutilizando TaskHistoryPanel.
- Impacto: MEDIO — el motorizado no tiene visibilidad completa
- Riesgo: BAJO
- Prioridad: P2 — MEDIA
- Complejidad: M (4 horas)
- Tiempo estimado: 4 horas
- Archivos involucrados:
    src/pages/courier/TaskDetailPage.tsx
    src/modules/tasks/components/TaskHistoryPanel.tsx
- Dependencias: F1-001
- Como validarla: Ver detalle de tarea como motorizado y verificar historial
- Criterios de aceptacion:
    * Historial de estados es visible para el motorizado con fechas y notas

---

## ===================================================================
## FASE 3 — PROBLEMAS DE UX
## Objetivo: Eliminar fricciones. Hacer la experiencia consistente.
## ===================================================================

### [F3-001] Reemplazar window.confirm en UsersPage con ConfirmDialog

- Descripcion: UsersPage.tsx linea 80 usa window.confirm() para activar/desactivar usuarios.
  El dialogo nativo bloquea JS, no puede estilizarse, rompe la experiencia premium.
- Impacto: ALTO — UX inconsistente con el design system
- Prioridad: P1 — ALTA | Complejidad: S (2 horas) | Tiempo: 2h
- Archivos: src/pages/admin/UsersPage.tsx
- Dependencias: F1-001
- Criterios: ConfirmDialog reemplaza window.confirm. Muestra el nombre del usuario afectado.

### [F3-002] Reemplazar window.confirm en BranchesPage con ConfirmDialog

- Descripcion: BranchesPage.tsx linea 36 usa window.confirm() para activar/desactivar sucursales.
- Impacto: ALTO | Prioridad: P1 — ALTA | Complejidad: S (1 hora) | Tiempo: 1h
- Archivos: src/pages/admin/BranchesPage.tsx
- Criterios: ConfirmDialog muestra el nombre de la sucursal afectada.

### [F3-003] Reemplazar window.confirm en BusDirectoryPage con ConfirmDialog

- Descripcion: BusDirectoryPage.tsx linea 46 usa window.confirm() para eliminar rutas de buses.
- Impacto: ALTO | Prioridad: P1 — ALTA | Complejidad: XS (45 min) | Tiempo: 45min
- Archivos: src/pages/admin/BusDirectoryPage.tsx
- Criterios: ConfirmDialog muestra el destino de la ruta. La accion es irreversible.

### [F3-004] Implementar pagina 404 personalizada

- Descripcion: El router redirige rutas invalidas a "/" silenciosamente.
  Crear pagina 404 estilizada con mensaje claro y boton de vuelta al inicio por rol.
- Impacto: BAJO | Prioridad: P2 | Complejidad: S (2 horas) | Tiempo: 2h
- Archivos: src/pages/NotFoundPage.tsx (nuevo), src/app/router.tsx
- Criterios: Pagina 404 estilizada. Boton de retorno correcto segun rol.

### [F3-005] SettingsPage — agregar soporte para avatar de usuario

- Descripcion: avatar_url existe en profiles pero no hay UI para subirla.
  Agregar campo de upload de imagen, preview del avatar actual, feedback mejorado.
- Impacto: MEDIO | Prioridad: P2 | Complejidad: M (4 horas) | Tiempo: 4h
- Archivos: src/pages/admin/SettingsPage.tsx
- Dependencias: F2-003
- Criterios: El usuario puede subir avatar. Se muestra en el header inmediatamente.

---

## ===================================================================
## FASE 4 — PROBLEMAS DE UI
## Objetivo: Consistencia visual. Eliminar inconsistencias del design system.
## ===================================================================

### [F4-001] Agregar variante "success" al Design System o documentar la decision

- Descripcion: La variante "success" se usa en SortableTaskCard pero no esta en Button.tsx.
  Decidir: agregar "success" como variante oficial (verde, semanticamente diferente de "confirm")
  o documentar que "confirm" es la variante semanticamente equivalente.
- Impacto: MEDIO | Prioridad: P2 | Complejidad: S (2 horas) | Tiempo: 2h
- Archivos: src/shared/components/ui/Button.tsx, DESIGN_SYSTEM.md
- Dependencias: F1-001

### [F4-002] Normalizar line endings CRLF a LF en database.types.ts

- Descripcion: database.types.ts tiene line endings Windows (CRLF).
  Puede causar diffs gigantes en sistemas Linux/Mac y fallos en CI/CD.
  Agregar .gitattributes para forzar LF en archivos .ts generados.
- Impacto: BAJO | Prioridad: P3 | Complejidad: XS (20 min) | Tiempo: 20min
- Archivos: src/shared/lib/database.types.ts, .gitattributes
- Dependencias: F1-002

### [F4-003] Ampliar reglas de oxlint para accesibilidad e imports

- Descripcion: .oxlintrc.json solo tiene 2 reglas basicas. Faltan:
  reglas de accesibilidad (aria-*, alt, roles), orden de imports, no-console en produccion.
- Impacto: MEDIO | Prioridad: P2 | Complejidad: S (2 horas) | Tiempo: 2h
- Archivos: .oxlintrc.json
- Criterios: npm run lint detecta problemas de accesibilidad. 0 warnings en el codigo actual.

---

## ===================================================================
## FASE 5 — SEGURIDAD
## Objetivo: Asegurar el sistema ante vectores de ataque comunes.
## ===================================================================

### [F5-001] Agregar headers de seguridad HTTP en vercel.json

- Nombre: vercel.json — Content-Security-Policy y headers de seguridad
- Descripcion: vercel.json actual solo tiene rewrites basicos. Sin headers de seguridad HTTP:
  Content-Security-Policy (CSP), X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy, Strict-Transport-Security (HSTS).
- Impacto: CRITICO — sin headers la app es vulnerable a ataques comunes
- Riesgo: SEGURIDAD ALTA
- Prioridad: P0 — CRITICA (para produccion)
- Complejidad: S (2 horas) | Tiempo: 2 horas
- Archivos involucrados: vercel.json
- Dependencias: F1-001, F1-002
- Como validarla: Deploy a Vercel + escanear con SecurityHeaders.com
- Criterios de aceptacion:
    * CSP configurado y activo
    * X-Frame-Options: DENY
    * X-Content-Type-Options: nosniff
    * SecurityHeaders.com da grado A o superior

---

### [F5-002] Verificar y documentar politicas RLS de Supabase

- Nombre: Auditoria de Row Level Security (RLS) en todas las tablas
- Descripcion: Con la anon key expuesta en el cliente, si RLS no esta bien configurado,
  cualquier usuario autenticado podria leer tareas de otras sucursales.
  Revisar cada tabla activa: RLS habilitado, politicas de SELECT por branch_id/user_id,
  politicas de INSERT/UPDATE/DELETE con restricciones adecuadas.
  Documentar en SECURITY_AUDIT_RLS.md
- Impacto: CRITICO — exposicion de datos entre clientes (multi-tenancy)
- Riesgo: SEGURIDAD CRITICA
- Prioridad: P0 — CRITICA (para produccion)
- Complejidad: XL (1-2 dias) | Tiempo: 2 dias
- Archivos: supabase/migrations/, SECURITY_AUDIT_RLS.md (nuevo)
- Como validarla: Crear usuarios de 2 sucursales. Verificar que no pueden ver datos del otro.
- Criterios de aceptacion:
    * Todas las tablas activas tienen RLS habilitado
    * Es imposible acceder a datos de otra sucursal con credenciales propias

---

### [F5-003] Agregar validacion de tipo/tamano en uploadTaskEvidence

- Nombre: Upload de evidencias — validar tipo y tamano de archivo
- Descripcion: uploadTaskEvidence sube cualquier archivo sin validacion.
  Un usuario podria subir un ejecutable o un archivo de 100MB.
  Agregar validacion: tipos permitidos (image/jpeg, image/png, image/webp, application/pdf),
  tamano maximo de 10MB, verificar que la extension coincide con el MIME type.
- Impacto: ALTO — vulnerabilidad de seguridad en el upload
- Riesgo: SEGURIDAD MEDIO
- Prioridad: P1 — ALTA
- Complejidad: S (2 horas) | Tiempo: 2 horas
- Archivos: src/modules/tasks/services/tasksService.ts (uploadTaskEvidence)
- Dependencias: F1-001
- Criterios:
    * Se rechazan archivos .txt, .exe, .js
    * Se rechazan archivos mayores a 10MB
    * El error es legible para el usuario

---

### [F5-004] Eliminar logs de consola con datos sensibles en produccion

- Nombre: Console.log verbosos — remover datos sensibles para produccion
- Descripcion: useTasksRealtime.ts y AuthContext.tsx tienen console.log/error
  que pueden revelar IDs de usuario, nombres, roles en la consola del navegador.
  Asegurar que ningun log con datos sensibles llega a produccion.
  Alternativa: integrar Sentry (ver F12-003).
- Impacto: MEDIO — revelacion de informacion a usuarios tecnicos
- Riesgo: SEGURIDAD BAJO-MEDIO
- Prioridad: P2 — MEDIA
- Complejidad: S (2 horas) | Tiempo: 2 horas
- Archivos: src/modules/tasks/hooks/useTasksRealtime.ts, src/modules/auth/AuthContext.tsx
- Criterios: En produccion, no hay console.log con datos de usuario en DevTools.

---

## ===================================================================
## FASE 6 — REALTIME
## Objetivo: Mejorar la cobertura y eficiencia del sistema en tiempo real.
## ===================================================================

### [F6-001] Agregar Realtime a tabla notifications

- Descripcion: El canal de Realtime no escucha "notifications".
  Al insertar una notificacion, el motorizado no la ve hasta recargar.
  Agregar listener en useTasksRealtime para invalidar queries de notifications.
  PREREQUISITO: F2-005 debe completarse primero.
- Impacto: MEDIO | Prioridad: P2 | Complejidad: S (2h) | Tiempo: 2h
- Archivos: src/modules/tasks/hooks/useTasksRealtime.ts
- Dependencias: F2-005 (notificaciones deben existir primero)
- Criterios: Las notificaciones nuevas aparecen en tiempo real sin recargar.

### [F6-002] Agregar Realtime a tabla workdays

- Descripcion: Cambios en jornadas no se reflejan en tiempo real para los admins.
  Si admin A entrega fondos, admin B no lo ve hasta recargar.
  Agregar listener de Realtime sobre tabla "workdays".
- Impacto: MEDIO | Prioridad: P2 | Complejidad: S (1h) | Tiempo: 1h
- Archivos: src/modules/tasks/hooks/useTasksRealtime.ts
- Dependencias: F1-001
- Criterios: Cambios en jornadas se reflejan en tiempo real para todos los admins.

### [F6-003] Optimizar useTasksRealtime — invalidacion selectiva de queries

- Descripcion: Cada evento Realtime dispara refetchAllActiveQueries() que invalida todo.
  Implementar invalidacion selectiva:
  INSERT en tasks -> invalidar tasks, dashboard-kpis
  UPDATE en tasks (assigned_courier_id) -> invalidar tasks, couriers
  DELETE en tasks -> invalidar tasks, dashboard-kpis
  INSERT en task_assignments -> invalidar query de esa tarea
- Impacto: MEDIO performance en mobile | Prioridad: P2 | Complejidad: M (4h) | Tiempo: 4h
- Archivos: src/modules/tasks/hooks/useTasksRealtime.ts
- Criterios: Requests a Supabase reducidos al menos 40%. Comportamiento Realtime correcto.

---

## ===================================================================
## FASE 7 — OPTIMIZACION
## Objetivo: Mejorar performance sin cambiar funcionalidad.
## ===================================================================

### [F7-001] Convertir updateTaskRouteOrders a RPC batch

- Nombre: Performance — updateTaskRouteOrders con N queries a 1 RPC atomica
- Descripcion: updateTaskRouteOrders usa Promise.all con N llamadas individuales.
  20 tareas reordenadas = 20 requests HTTP. Crear RPC update_task_route_orders
  que acepte array de {id, route_order} y actualice en una sola transaccion.
- Impacto: ALTO en mobile con muchas tareas | Prioridad: P1 | Complejidad: M (4h) | Tiempo: 4h
- Archivos: src/modules/tasks/services/tasksService.ts, supabase/migrations/
- Criterios: 1 request para cualquier cantidad de reordenamientos. Tiempo < 500ms con 20 tareas.

### [F7-002] Extraer hook usePrimaryBranch

- Descripcion: Patron "profile?.primary_branch_id || profile?.branch_ids[0] || ''"
  repetido en 6+ componentes. Extraer a hook usePrimaryBranch() en src/modules/auth/.
- Impacto: BAJO funcional, ALTO mantenibilidad | Prioridad: P2 | Complejidad: S (2h)
- Archivos: src/modules/auth/usePrimaryBranch.ts (nuevo), 6+ paginas afectadas
- Criterios: El patron duplicado se elimina. El hook tiene JSDoc.

### [F7-003] Extraer utilidad getTodayStr

- Descripcion: Patron "new Date().toISOString().split('T')[0]" repetido en 6+ paginas.
  Extraer a src/shared/utils/date.ts como export function getTodayStr(): string
- Impacto: BAJO | Prioridad: P2 | Complejidad: XS (30min)
- Archivos: src/shared/utils/date.ts (nuevo), 6+ paginas afectadas

### [F7-004] Memoizacion en componentes de listas grandes

- Descripcion: TasksPage, UsersPage, WorkdaysPage sin memoizacion para calculos y handlers.
  Aplicar useMemo para metricas/listas filtradas, useCallback para event handlers.
- Impacto: MEDIO performance en mobile | Prioridad: P2 | Complejidad: M (4h)
- Archivos: src/pages/admin/TasksPage.tsx, UsersPage.tsx, WorkdaysPage.tsx

### [F7-005] Refactorizar TaskFormModal (36KB) en sub-componentes

- Descripcion: TaskFormModal.tsx es demasiado grande (36KB, ~900 lineas).
  Dividir en: TaskFormBasicInfo, TaskFormContact, TaskFormFinancial, TaskFormCourier, TaskFormEvidence.
- Impacto: BAJO funcional, ALTO mantenibilidad | Prioridad: P3 | Complejidad: XL (2 dias)
- Dependencias: F1-001, F1-002, tests de regresion (F10-XXX)
- Criterios: Componente principal < 200 lineas. Cada sub-componente < 150 lineas.

---

## ===================================================================
## FASE 8 — BASE DE DATOS
## Objetivo: Completar el esquema, versionar migraciones, tablas huerfanas.
## ===================================================================

### [F8-001] Exportar y versionar el esquema SQL completo

- Nombre: Migraciones — versionar el esquema completo de la base de datos
- Descripcion: Solo existen 2 migraciones locales. El esquema completo (20+ tablas,
  indices, triggers, funciones RLS, RPCs) existe unicamente en el dashboard de Supabase.
  Si se pierde acceso al proyecto, es imposible recrear la base de datos.
  Exportar con: supabase db dump --schema public
  Guardar como: supabase/migrations/20260806000000_initial_schema_export.sql
- Impacto: CRITICO — sin esto, la base de datos no puede recrearse
- Riesgo: OPERATIVO ALTO
- Prioridad: P0 — CRITICA (para produccion)
- Complejidad: M (4 horas) | Tiempo: 4 horas
- Archivos: supabase/migrations/ (nuevo dump del esquema), .gitignore
- Dependencias: Supabase CLI instalado, acceso al proyecto
- Criterios: El esquema exportado puede recrear una BD funcional desde cero.

### [F8-002] Plan de accion para tablas huerfanas — 10 tablas sin UI

- Nombre: Tablas huerfanas — decision IMPLEMENTAR / DIFERIR / ELIMINAR
- Descripcion: Existen 10 tablas en BD sin interfaz de usuario:
  notification_preferences, app_settings, cash_transfers, courier_branch_assignments,
  daily_closures (cubierta en F2-001), destinations, bus_schedules, exchange_rates,
  financial_movements, transport_services.
  Crear DATABASE_DECISIONS.md con decision documentada para cada tabla.
- Impacto: MEDIO | Prioridad: P2 | Complejidad: M (4h decision + doc) | Tiempo: 4h
- Archivos: DATABASE_DECISIONS.md (nuevo)
- Dependencias: F8-001
- Criterios: Cada tabla tiene una decision documentada. Tablas ELIMINAR tienen migracion preparada.

### [F8-003] Implementar UI para tipo de cambio (exchange_rates)

- Nombre: Tipo de Cambio — pantalla de gestion de tasas USD/NIO
- Descripcion: La tabla exchange_rates existe pero no hay UI. La app usa campos
  expected_collection_currency y expected_payment_currency en tareas, pero sin tipo
  de cambio registrado las conversiones USD/NIO no tienen respaldo historico.
  Crear seccion en Configuracion o nueva pagina /admin/tipo-cambio.
  Formulario para tasa del dia, listado de tasas historicas, integracion con liquidaciones.
- Impacto: ALTO — operaciones multi-moneda sin respaldo
- Riesgo: FINANCIERO MEDIO
- Prioridad: P1 — ALTA | Complejidad: L (1 dia) | Tiempo: 1 dia
- Archivos: src/pages/admin/ExchangeRatesPage.tsx (nuevo), src/app/router.tsx
- Dependencias: F8-001, F1-001
- Criterios: Se ingresa la tasa del dia. Las liquidaciones usan la tasa vigente.

### [F8-004] Resolver duplicidad financial_movements vs cash_movements

- Nombre: DB — aclarar y resolver duplicidad de tablas de movimientos financieros
- Descripcion: financial_movements (robusta: idempotency_key, soft-delete, tipo de cambio)
  y cash_movements (simple) parecen cumplir funciones solapadas.
  Decidir: (A) Migrar UI a financial_movements, (B) Mantener cash_movements y eliminar
  financial_movements, (C) Usar ambas con propositos diferentes documentados.
- Impacto: MEDIO | Riesgo: FINANCIERO MEDIO | Prioridad: P1 | Complejidad: XL (2 dias)
- Archivos: src/modules/settlements/services/, supabase/migrations/, DATABASE_DECISIONS.md
- Dependencias: F8-001, F8-002
- Criterios: Solo existe UNA tabla de movimientos activa. La decision esta documentada.

---

## ===================================================================
## FASE 9 — CODIGO
## Objetivo: Mejorar calidad y mantenibilidad del codigo fuente.
## ===================================================================

### [F9-001] Tipar correctamente err: any en CourierLayout.tsx

- Descripcion: CourierLayout.tsx linea 75 tiene "catch (err: any)". En TS estricto
  debe usarse "catch (err: unknown)" y verificar el tipo con type guards.
- Impacto: BAJO | Prioridad: P2 | Complejidad: XS (15min) | Tiempo: 15min
- Archivos: src/layouts/CourierLayout.tsx (linea ~75)
- Criterios: No existe ningun "catch (err: any)" en el codigo.

### [F9-002] Reorganizar import de useAuth a bloque de imports en UsersPage

- Descripcion: UsersPage.tsx tiene import de useAuth en linea 41, fuera del bloque
  inicial de imports. Inconsistente con la convencion del proyecto.
- Impacto: MUY BAJO | Prioridad: P3 | Complejidad: XS (5min)
- Archivos: src/pages/admin/UsersPage.tsx (linea ~41)

### [F9-003] Verificar si CompleteTaskModal esta en uso o es codigo muerto

- Descripcion: CompleteTaskModal.tsx en courier/components (9,428 bytes) no tiene
  evidencia de importacion activa. Puede haber sido reemplazado por TaskStatusModal.
  Verificar con grep y eliminar si no se usa.
- Impacto: BAJO — codigo muerto aumenta el bundle | Prioridad: P3 | Complejidad: XS (30min)
- Archivos: src/modules/courier/components/CompleteTaskModal.tsx
- Criterios: Si no se usa, el archivo se elimina. Si se usa, se documenta.

### [F9-004] Eliminar dependencias instaladas sin uso

- Descripcion: @react-pdf/renderer (4.5.1) esta en package.json sin ningun componente que lo use.
  Si no se va a usar en el corto plazo, debe removerse para reducir el bundle.
  NOTA: vitest, playwright, testing-library se mantienen para Fase 10 (Tests).
- Impacto: BAJO | Prioridad: P3 | Complejidad: XS (15min)
- Archivos: package.json, package-lock.json
- Dependencias: F1-002 (primero hacer commit del trabajo actual)

### [F9-005] Ampliar uso de log_audit_event RPC en eventos criticos

- Nombre: Audit Log — registrar eventos de negocio criticos
- Descripcion: log_audit_event solo se llama en deleteTask. Muchos eventos criticos
  no quedan registrados: approveTask, rejectTask, cierre diario, aprobacion de liquidacion,
  cambio de estado, creacion de usuarios, cambio de contrasena.
  Agregar llamadas a log_audit_event en todos los servicios donde haya acciones importantes.
- Impacto: ALTO — auditoria incompleta para cumplimiento | Riesgo: MEDIO sin trazabilidad
- Prioridad: P1 — ALTA | Complejidad: M (4h) | Tiempo: 4h
- Archivos: src/modules/tasks/services/tasksService.ts, src/modules/users/services/usersService.ts
- Criterios: approveTask registra 'task_approved'. rejectTask registra 'task_rejected'.
  Cierre diario registra 'daily_closure_confirmed'. Creacion usuario registra 'user_created'.

---

## ===================================================================
## FASE 10 — TESTS
## Objetivo: Establecer base de pruebas automatizadas.
## ===================================================================

### [F10-001] Configurar entorno de testing con Vitest y testing-library

- Descripcion: vitest esta instalado pero sin configuracion ni tests escritos.
  Crear: vitest.config.ts (jsdom + path aliases), src/test/setup.ts (testing-library),
  scripts "test" y "test:coverage" en package.json.
- Impacto: ALTO — sin esto no hay pruebas automatizadas posibles
- Prioridad: P1 — ALTA | Complejidad: S (3h) | Tiempo: 3h
- Archivos: vitest.config.ts (nuevo), src/test/setup.ts (nuevo), package.json
- Dependencias: F1-001, F1-002
- Criterios: npm test ejecuta y pasa al menos 1 test. npm run test:coverage genera reporte.

### [F10-002] Tests unitarios para tasksService

- Descripcion: tasksService.ts es el servicio mas critico (613 lineas). Cubrir con mocks de Supabase:
  createTask (con y sin motorizado), deleteTask (bloqueo en estados protegidos),
  changeTaskStatus (transicion valida e invalida), assignTask (asignacion y reasignacion).
- Impacto: CRITICO — sin tests, refactorizaciones rompen el core
- Prioridad: P1 — ALTA | Complejidad: XL (2 dias) | Tiempo: 2 dias
- Archivos: src/modules/tasks/services/__tests__/tasksService.test.ts (nuevo)
- Dependencias: F10-001
- Criterios: PASS en todos los tests. Cobertura > 80% en tasksService.ts.

### [F10-003] Tests unitarios para validaciones de esquema Zod

- Descripcion: schemas.ts contiene validaciones para formularios criticos. Cubrir:
  Casos validos aceptados, campos requeridos rechazados, formatos incorrectos, valores fuera de rango.
- Impacto: ALTO — si las validaciones fallan, datos incorrectos entran a BD
- Prioridad: P2 | Complejidad: M (4h) | Tiempo: 4h
- Archivos: src/shared/validations/__tests__/schemas.test.ts (nuevo)
- Dependencias: F10-001
- Criterios: 1 test positivo + 2 tests negativos por schema. Cobertura > 90%.

### [F10-004] Tests E2E con Playwright — flujos criticos de usuario

- Descripcion: Playwright esta instalado. Crear tests E2E para:
  login exitoso/fallido, creacion de tarea, asignacion de motorizado, cambio de estado
  de tarea (motorizado), inicio de jornada, envio de liquidacion.
  Correr contra app en modo dev con BD de pruebas separada.
- Impacto: CRITICO — los E2E tests son la red de seguridad mas fuerte
- Prioridad: P1 | Complejidad: XXL (1 semana) | Tiempo: 1 semana
- Archivos: playwright.config.ts (nuevo), e2e/ (nueva carpeta)
- Dependencias: F10-001, BD de pruebas separada de produccion
- Criterios: 6+ flujos criticos cubiertos. Tests en headless mode. Screenshots en caso de fallo.

---

## ===================================================================
## FASE 11 — RESPONSIVE
## Objetivo: Verificar y corregir la experiencia en todos los dispositivos.
## ===================================================================

### [F11-001] QA manual en Android — panel del motorizado

- Descripcion: La app del motorizado esta disenada para mobile pero sin pruebas en dispositivo real.
  Probar en Android Chrome: inicio de tareas, reordenamiento DnD con TouchSensor,
  TaskFormModal en pantalla pequena, inicio de jornada, registro de gastos, liquidacion.
  Documentar bugs en QA_ANDROID_REPORT.md con screenshots.
- Impacto: CRITICO — los motorizados usaran la app en sus telefonos
- Riesgo: ALTO — puede ser inutilizable en mobile sin este QA
- Prioridad: P0 — CRITICA | Complejidad: M (1 dia) | Tiempo: 1 dia
- Archivos: QA_ANDROID_REPORT.md (nuevo), archivos que requieran correccion
- Dependencias: F1-001, F2-001, F3-001, F3-002, F3-003 (UX fixes deben estar listos)
- Criterios: Todos los flujos del motorizado funcionan. DnD funciona con touch.

### [F11-002] QA manual en iPhone/Safari — panel del motorizado

- Descripcion: Safari en iOS tiene comportamientos diferentes: eventos touch en DnD,
  barra de Safari ocupando espacio, Safe Area (notch) tapando elementos.
  Mismos flujos que F11-001 pero en Safari iOS.
  Documentar en QA_IOS_REPORT.md.
- Impacto: CRITICO | Prioridad: P1 | Complejidad: M (1 dia) | Tiempo: 1 dia
- Archivos: QA_IOS_REPORT.md (nuevo), CSS con safe-area-inset-* si necesario
- Dependencias: F11-001 (Android primero)
- Criterios: Todos los flujos funcionan en Safari iOS. Sin elementos ocultos por el notch.

### [F11-003] QA manual en Tablet — panel del administrador

- Descripcion: AdminLayout con sidebar colapsable. En Tablet, el comportamiento puede ser
  intermedio entre mobile y desktop. Verificar sidebar en landscape/portrait,
  tablas de datos legibles, modales dentro de pantalla, formularios manejables.
- Impacto: MEDIO | Prioridad: P2 | Complejidad: S (4h QA) | Tiempo: 4h
- Archivos: QA_TABLET_REPORT.md (nuevo), src/layouts/AdminLayout.tsx si necesario
- Dependencias: F11-001
- Criterios: El admin puede gestionar tareas y usuarios en una tablet correctamente.

---

## ===================================================================
## FASE 12 — PREPARACION PARA PRODUCCION
## Objetivo: Cumplir todos los requisitos para lanzar a produccion.
## ===================================================================

### [F12-001] Configurar variables de entorno en Vercel Dashboard

- Descripcion: Configurar en Vercel para el environment "Production":
  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_URL (dominio real),
  VITE_APP_NAME, VITE_APP_ENV=production, VITE_DEFAULT_TIMEZONE.
  VITE_APP_URL no debe ser localhost. VITE_APP_ENV=production desactiva logs.
- Impacto: BLOQUEANTE para deploy | Prioridad: P0 | Complejidad: XS (20min)
- Dependencias: F1-001, F5-001
- Criterios: La app deployada carga y puede hacer login correctamente.

### [F12-002] Configurar dominio personalizado en Vercel

- Descripcion: Configurar dominio propio (ej: app.bricklar.com) en Vercel Dashboard.
  Configurar DNS records, verificar SSL/TLS, actualizar VITE_APP_URL.
  Actualizar URLs de redirect en Supabase Auth para incluir el nuevo dominio.
- Impacto: ALTO — la URL final debe ser profesional | Prioridad: P1 | Complejidad: S (2h)
- Dependencias: F12-001
- Criterios: App accesible desde dominio personalizado con SSL valido.

### [F12-003] Configurar monitoreo de errores con Sentry

- Descripcion: En produccion los errores deben ser capturados automaticamente.
  Crear proyecto en Sentry.io, instalar @sentry/react, inicializar en main.tsx,
  configurar source maps para ver codigo original, agregar VITE_SENTRY_DSN a env vars.
- Impacto: CRITICO para operacion en produccion | Prioridad: P1 | Complejidad: S (3h)
- Archivos: package.json, src/main.tsx, vite.config.ts
- Dependencias: F12-001
- Criterios: Los errores de JS se capturan en Sentry con source maps correctos.

### [F12-004] Configurar backup automatico de Supabase

- Descripcion: Sin backups, una perdida de datos es irrecuperable.
  Configurar backup diario (PITR en plan Pro o backup manual en plan gratuito).
  Documentar frecuencia, ubicacion, proceso de restauracion en BACKUP_STRATEGY.md.
  Verificar que al menos 2 personas conocen el proceso.
- Impacto: CRITICO | Riesgo: FINANCIERO Y OPERATIVO CRITICO | Prioridad: P0 | Complejidad: S (3h)
- Archivos: BACKUP_STRATEGY.md (nuevo)
- Dependencias: F8-001 (esquema versionado primero)
- Criterios: Existe backup diario automatico. El proceso de restauracion esta probado.

---

## ===================================================================
## FASE 13 — FUNCIONALIDADES PREMIUM FUTURAS (Post-MVP)
## ===================================================================

### [F13-001] Horarios de buses y destinos (bus_schedules + destinations + transport_services)
- Prioridad: P3 | Complejidad: XL | Tiempo: 2-3 dias
- Descripcion: Gestion de destinos, horarios de salida por cooperativa, precios.
  Complementa el Directorio de Buses actual.

### [F13-002] Exportacion de reportes en PDF con @react-pdf/renderer
- Prioridad: P3 | Complejidad: L (1 dia por reporte) | Tiempo: 3-4 dias
- Descripcion: Reportes profesionales en PDF con logo, tablas estilizadas, totales.

### [F13-003] Confirmacion de transferencias de efectivo (cash_transfers)
- Prioridad: P2 | Complejidad: XL | Tiempo: 2 dias
- Descripcion: Flujo de confirmation_status (pending, confirmed, disputed, voided).
  Admin entrega efectivo, motorizado confirma recepcion.
- Dependencias: F8-004 (resolver duplicidad financiera)

### [F13-004] Preferencias de notificaciones por usuario (notification_preferences)
- Prioridad: P3 | Complejidad: M | Tiempo: 4h
- Descripcion: Configuracion en Settings para silenciar tipos de notificaciones.
- Dependencias: F2-005 (notificaciones funcionando)

### [F13-005] Asignacion de motorizados a sucursales adicionales (courier_branch_assignments)
- Prioridad: P3 | Complejidad: L | Tiempo: 1 dia
- Descripcion: Asignacion temporal de motorizado a sucursal diferente para cobertura o emergencias.

### [F13-006] Configuracion avanzada por sucursal (app_settings)
- Prioridad: P3 | Complejidad: L | Tiempo: 1 dia
- Descripcion: UI para configurar limites de gastos, monedas aceptadas, notificaciones por sucursal.
- Dependencias: F8-002

### [F13-007] Geolocalizacion y mapa de rutas
- Prioridad: P3 | Complejidad: XXL | Tiempo: 1 semana
- Descripcion: Mapa de Google Maps/Mapbox para visualizar rutas. Tracking GPS del motorizado.
  Boton "Abrir en maps" usando el maps_url de la tarea.

---

## ===================================================================
## MAPA DE DEPENDENCIAS CRITICAS
## ===================================================================

Las siguientes dependencias NO deben violarse:

F1-002 (commit) -> DEBE completarse ANTES de F1-001, F1-003, y cualquier otra tarea
F1-001 (build) -> DEBE completarse ANTES de F2-001, F3-001, F3-002, F3-003, F5-001
F8-001 (esquema DB) -> DEBE completarse ANTES de F8-002, F8-003, F8-004, F12-004
F10-001 (config tests) -> DEBE completarse ANTES de F10-002, F10-003, F10-004
F2-005 (notificaciones) -> DEBE completarse ANTES de F6-001
F11-001 (QA Android) -> DEBE completarse ANTES de F11-002, F11-003
F12-001 (env vars Vercel) -> DEBE completarse ANTES de F12-002, F12-003
F5-002 (RLS) -> DEBE completarse ANTES del deploy a produccion
F2-001 (Cierre Diario) -> DEBE completarse ANTES del QA del flujo completo de jornada

NO hacer deploy a produccion antes de:
- F1-001 (build limpio)
- F5-001 (headers de seguridad)
- F5-002 (RLS verificado)
- F8-001 (esquema versionado)
- F11-001 (QA mobile)
- F12-001 (env vars en Vercel)
- F12-004 (backup configurado)

---

## ===================================================================
## MAPA DE RIESGOS
## ===================================================================

### Riesgos Tecnicos
| ID | Riesgo | Probabilidad | Impacto | Mitigacion |
|----|--------|--------------|---------|------------|
| RT-01 | Build sigue fallando tras fix TypeScript | Baja | Critico | Ejecutar tsc --noEmit antes de commit |
| RT-02 | RPC batch de ruta tiene bugs de atomicidad | Media | Alto | Tests unitarios antes de deploy |
| RT-03 | Triggers de notificaciones generan race conditions | Media | Medio | Tests de carga en BD de pruebas |
| RT-04 | DnD no funciona en iOS Safari | Alta | Alto | QA obligatorio en F11-002 |
| RT-05 | Sentry source maps no apuntan al codigo correcto | Media | Medio | Verificar en staging primero |

### Riesgos Financieros
| ID | Riesgo | Probabilidad | Impacto | Mitigacion |
|----|--------|--------------|---------|------------|
| RF-01 | Cierre diario sin persistencia — perdida de trazabilidad historica | Alta | CRITICO | F2-001 es P0 |
| RF-02 | Operaciones USD/NIO sin tipo de cambio registrado | Alta | Alto | F8-003 como P1 |
| RF-03 | Liquidaciones calculadas con datos incorrectos (tareas deleted_at) | Media | Alto | F2-002 es P1 |
| RF-04 | Sin backup — perdida total de datos operativos | Baja | CATASTROFICO | F12-004 es P0 |

### Riesgos de Seguridad
| ID | Riesgo | Probabilidad | Impacto | Mitigacion |
|----|--------|--------------|---------|------------|
| RS-01 | RLS mal configurado — exposicion de datos entre sucursales | Media | CRITICO | F5-002 obligatorio antes de produccion |
| RS-02 | XSS via headers HTTP faltantes | Alta | Alto | F5-001 antes de produccion |
| RS-03 | Upload de archivo malicioso via evidencias | Media | Medio | F5-003 como P1 |
| RS-04 | Logs de consola revelan datos de usuario en produccion | Alta | Bajo | F5-004 como P2 |
| RS-05 | Secretos en .env.local commiteados accidentalmente | Baja | CRITICO | Verificar .gitignore antes de cada push |

### Riesgos Operativos
| ID | Riesgo | Probabilidad | Impacto | Mitigacion |
|----|--------|--------------|---------|------------|
| RO-01 | Perdida de 50+ archivos sin commitear | Alta | CATASTROFICO | F1-002 es la tarea #0 |
| RO-02 | Esquema BD irrecuperable si se pierde acceso a Supabase | Alta | CRITICO | F8-001 como P0 |
| RO-03 | Onboarding de nuevos usuarios falla (flujo TempPassword) | Media | Alto | F2-004 como P1 |
| RO-04 | Motorizado pierde conexion y tareas no sincronizadas | Media | Alto | useTasksRealtime resiliencia existente |

### Riesgos de UX
| ID | Riesgo | Probabilidad | Impacto | Mitigacion |
|----|--------|--------------|---------|------------|
| RU-01 | window.confirm bloquea JS en mobile browsers | Alta | Alto | F3-001, F3-002, F3-003 como P1 |
| RU-02 | Cierre diario parece funcionar pero no persiste | Alta | CRITICO | F2-001 como P0 |
| RU-03 | Notificaciones siempre vacias — perdida de confianza del usuario | Alta | Alto | F2-005 como P1 |
| RU-04 | DnD no funciona en dispositivos touch fisicos | Media | Alto | F11-001, F11-002 |

*Backlog version 1.0 — Generado el 2026-08-06*
*Total de items: 43 tareas en 13 fases*
*Tiempo estimado hasta produccion inicial (Fases 1-12): 30-40 dias de trabajo efectivo*
*Post-MVP (Fase 13): 3-4 semanas adicionales*
