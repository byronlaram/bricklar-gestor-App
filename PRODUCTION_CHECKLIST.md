# PRODUCTION_CHECKLIST — Bricklar Gestor
# Checklist Completo para Salida a Produccion
#
# Fecha de creacion: 2026-08-06
# Version: 1.0
# Instrucciones: Marcar cada item como [x] cuando este completado y verificado.
# NO hacer deploy a produccion hasta que TODOS los items criticos esten marcados.
#
# Niveles: [CRITICO] = bloqueante | [ALTO] = muy recomendado | [MEDIO] = recomendado | [BAJO] = opcional

---

## RESUMEN EJECUTIVO DEL CHECKLIST

Total de items: 78
Items criticos (P0): 28
Items altos (P1): 26
Items medios (P2): 16
Items bajos (P3): 8

Para MINIMO VIABLE de produccion: todos los items [CRITICO] deben estar marcados.
Para produccion CONFIABLE: todos los items [CRITICO] y [ALTO] deben estar marcados.

---

## ===================================================================
## SECCION 1 — BUILD Y CODIGO
## ===================================================================

### 1.1 TypeScript
- [ ] [CRITICO] npm run build completa sin ningun error
- [ ] [CRITICO] npx tsc --noEmit retorna 0 errores
- [ ] [ALTO] No existen "catch (err: any)" en el codigo — todos estan tipados como unknown
- [ ] [ALTO] No existen "as any" sin justificacion documentada
- [ ] [MEDIO] noUnusedLocals y noUnusedParameters configurados en tsconfig
- [ ] [MEDIO] strict: true esta habilitado en tsconfig

### 1.2 Linting
- [ ] [CRITICO] npm run lint retorna 0 errores
- [ ] [ALTO] npm run lint retorna 0 warnings
- [ ] [MEDIO] Las reglas de accesibilidad estan configuradas en .oxlintrc.json
- [ ] [BAJO] El orden de imports es consistente en todo el proyecto

### 1.3 Dependencias
- [ ] [CRITICO] No existen dependencias con vulnerabilidades criticas (npm audit)
- [ ] [ALTO] No existen dependencias instaladas sin uso activo
- [ ] [MEDIO] Todas las dependencias tienen versiones fijadas (no "latest")
- [ ] [BAJO] Se ha revisado la licencia de todas las dependencias criticas

### 1.4 Git
- [ ] [CRITICO] git status retorna "nothing to commit, working tree clean"
- [ ] [CRITICO] La rama main esta actualizada en el repositorio remoto (git push)
- [ ] [ALTO] El historial de commits tiene mensajes descriptivos
- [ ] [ALTO] tsconfig.app.tsbuildinfo esta en .gitignore
- [ ] [MEDIO] El .env.local esta en .gitignore y NO fue commiteado accidentalmente
- [ ] [MEDIO] No existen secretos en el historial de git

---

## ===================================================================
## SECCION 2 — BASE DE DATOS
## ===================================================================

### 2.1 Esquema y Migraciones
- [ ] [CRITICO] El esquema completo de la base de datos esta exportado en supabase/migrations/
- [ ] [CRITICO] Las migraciones pueden recrear la BD completa desde cero en un nuevo proyecto
- [ ] [CRITICO] Las 2 migraciones de aplicacion estan aplicadas a la BD de produccion:
      - 20260803000000_enable_realtime_tasks.sql
      - 20260803000001_courier_new_gestion_approval.sql
- [ ] [ALTO] Todas las nuevas migraciones del Sprint 3 estan aplicadas a produccion
- [ ] [ALTO] Las migraciones son idempotentes (se pueden ejecutar 2 veces sin error)
- [ ] [MEDIO] Cada migracion tiene un comentario descriptivo de lo que hace
- [ ] [MEDIO] El orden de las migraciones es cronologico y sin conflictos

### 2.2 Row Level Security (RLS)
- [ ] [CRITICO] RLS esta habilitado en la tabla "tasks"
- [ ] [CRITICO] RLS esta habilitado en la tabla "profiles"
- [ ] [CRITICO] RLS esta habilitado en la tabla "workdays"
- [ ] [CRITICO] RLS esta habilitado en la tabla "settlements"
- [ ] [CRITICO] RLS esta habilitado en la tabla "cash_movements"
- [ ] [CRITICO] RLS esta habilitado en la tabla "financial_movements"
- [ ] [CRITICO] RLS esta habilitado en la tabla "notifications"
- [ ] [CRITICO] RLS esta habilitado en la tabla "daily_closures"
- [ ] [CRITICO] RLS esta habilitado en la tabla "audit_logs"
- [ ] [ALTO] Un usuario de una sucursal NO puede ver tareas de otra sucursal
- [ ] [ALTO] Un motorizado NO puede ver las tareas de otros motorizados que no le corresponden
- [ ] [ALTO] Un admin junior NO puede realizar acciones reservadas para general_admin
- [ ] [ALTO] Las politicas de INSERT verifican que el branch_id del usuario coincide
- [ ] [MEDIO] Las politicas de UPDATE tienen restricciones adecuadas
- [ ] [MEDIO] Las politicas de DELETE estan restringidas a los roles correctos
- [ ] [MEDIO] El documento SECURITY_AUDIT_RLS.md existe y cubre todas las tablas activas

### 2.3 Funciones RPC
- [ ] [ALTO] La RPC generate_task_code() funciona correctamente en produccion
- [ ] [ALTO] La RPC get_my_profile() retorna el perfil correcto para cada rol
- [ ] [ALTO] La RPC log_audit_event() registra eventos correctamente
- [ ] [MEDIO] La RPC update_task_route_orders (si se implemento en Sprint 3) es atomica
- [ ] [MEDIO] Todas las RPCs tienen restricciones de permisos (SECURITY DEFINER o INVOKER segun caso)

### 2.4 Backups
- [ ] [CRITICO] Existe una estrategia de backup documentada en BACKUP_STRATEGY.md
- [ ] [CRITICO] El backup automatico esta configurado y activo (PITR o backup manual diario)
- [ ] [CRITICO] Se ha probado exitosamente la restauracion desde un backup
- [ ] [ALTO] Al menos 2 personas del equipo conocen el proceso de restauracion
- [ ] [ALTO] Los backups se guardan en una ubicacion diferente al servidor de produccion
- [ ] [MEDIO] Existe un plan de recuperacion ante desastres (RPO y RTO definidos)

### 2.5 Realtime
- [ ] [ALTO] Realtime esta habilitado para la tabla "tasks" en el proyecto Supabase
- [ ] [ALTO] Realtime esta habilitado para la tabla "task_assignments"
- [ ] [MEDIO] Realtime esta habilitado para la tabla "workdays" (si se implemento en Sprint 3)
- [ ] [MEDIO] Realtime esta habilitado para la tabla "notifications" (si se implemento en Sprint 3)
- [ ] [BAJO] El limite de eventsPerSecond (10) es adecuado para el numero esperado de usuarios

---

## ===================================================================
## SECCION 3 — AUTENTICACION Y SESION
## ===================================================================

### 3.1 Configuracion de Auth
- [ ] [CRITICO] Las URLs de redirect de Supabase Auth incluyen el dominio de produccion
- [ ] [CRITICO] Las URLs de redirect NO incluyen localhost (o si incluyen, es solo en desarrollo)
- [ ] [CRITICO] El email de recuperacion de contrasena funciona en produccion (verificar con email real)
- [ ] [ALTO] El flujo de reset de contrasena funciona end-to-end en produccion
- [ ] [ALTO] El tiempo de expiracion del JWT es adecuado para el caso de uso
- [ ] [ALTO] autoRefreshToken: true esta configurado en el cliente de Supabase

### 3.2 Flujos de Usuario
- [ ] [CRITICO] El login con email/contrasena funciona en produccion
- [ ] [CRITICO] El logout funciona correctamente (sesion se limpia)
- [ ] [CRITICO] El RouteGuard redirige correctamente segun el rol del usuario
- [ ] [CRITICO] Un usuario con must_change_password=true es redirigido a /reset-password
- [ ] [ALTO] El flujo de onboarding de usuarios nuevos funciona (TempPasswordModal -> login -> cambio)
- [ ] [ALTO] La pagina de cuenta suspendida se muestra correctamente para usuarios inactivos
- [ ] [MEDIO] La sesion persiste correctamente tras cerrar y reabrir el navegador (localStorage)

---

## ===================================================================
## SECCION 4 — VARIABLES DE ENTORNO
## ===================================================================

### 4.1 Variables en Vercel
- [ ] [CRITICO] VITE_SUPABASE_URL apunta al proyecto Supabase de produccion (no a localhost)
- [ ] [CRITICO] VITE_SUPABASE_ANON_KEY es la clave anonima de produccion (no la de desarrollo)
- [ ] [CRITICO] VITE_APP_URL apunta al dominio de produccion (no a localhost:5173)
- [ ] [CRITICO] VITE_APP_ENV esta configurado como "production"
- [ ] [ALTO] VITE_APP_NAME esta configurado con el nombre correcto de la aplicacion
- [ ] [ALTO] VITE_DEFAULT_TIMEZONE esta configurado con el timezone correcto (America/Managua)
- [ ] [MEDIO] Las variables estan configuradas en el environment correcto ("Production") en Vercel
- [ ] [MEDIO] Si se integro Sentry, VITE_SENTRY_DSN esta configurado

### 4.2 Secretos
- [ ] [CRITICO] El archivo .env.local NO fue commiteado al repositorio
- [ ] [CRITICO] La SERVICE_ROLE_KEY de Supabase NO esta en ninguna variable del cliente (VITE_*)
- [ ] [ALTO] Los secretos del servidor (si existen en Edge Functions) estan en Supabase Secrets, no en el cliente

---

## ===================================================================
## SECCION 5 — SEGURIDAD
## ===================================================================

### 5.1 Headers HTTP
- [ ] [CRITICO] vercel.json tiene configurados los headers de seguridad:
      Content-Security-Policy
      X-Frame-Options: DENY
      X-Content-Type-Options: nosniff
      Referrer-Policy: strict-origin-when-cross-origin
      Permissions-Policy
      Strict-Transport-Security (HSTS)
- [ ] [CRITICO] SecurityHeaders.com da grado A o A+ para la URL de produccion
- [ ] [ALTO] El CSP no usa "unsafe-inline" ni "unsafe-eval" en script-src
- [ ] [MEDIO] Se ha verificado que el CSP no bloquea funcionalidades de la app

### 5.2 HTTPS
- [ ] [CRITICO] La app solo es accesible via HTTPS (HTTP redirige a HTTPS)
- [ ] [CRITICO] El certificado SSL es valido y no esta por vencer en los proximos 30 dias
- [ ] [ALTO] HSTS esta configurado con includeSubDomains

### 5.3 Uploads y Archivos
- [ ] [CRITICO] La funcion uploadTaskEvidence valida el tipo MIME del archivo
- [ ] [CRITICO] La funcion uploadTaskEvidence valida el tamano maximo del archivo (10MB)
- [ ] [ALTO] El bucket de storage "task-evidences" tiene politicas de acceso correctas
- [ ] [ALTO] Solo los usuarios autenticados pueden subir archivos al bucket
- [ ] [MEDIO] Los archivos en el bucket tienen nombres unicos (no son predecibles/enumerables)

### 5.4 Consola y Logs
- [ ] [ALTO] No hay console.log con datos sensibles (IDs, emails, roles) en modo produccion
- [ ] [ALTO] VITE_APP_ENV=production desactiva los logs de desarrollo en useTasksRealtime
- [ ] [MEDIO] Los mensajes de error al usuario son genericos (no revelan detalles tecnicos)

---

## ===================================================================
## SECCION 6 — FUNCIONALIDADES CRITICAS
## ===================================================================

### 6.1 Gestion de Tareas (Admin)
- [ ] [CRITICO] Se puede crear una tarea con todos los campos requeridos
- [ ] [CRITICO] Se puede asignar un motorizado a una tarea
- [ ] [CRITICO] Los cambios de estado de tarea funcionan con las transiciones permitidas
- [ ] [CRITICO] El soft-delete de tareas funciona (la tarea desaparece de la lista pero no de la BD)
- [ ] [ALTO] Los filtros de tareas (fecha, estado, motorizado) funcionan correctamente
- [ ] [ALTO] La paginacion o infinite scroll funciona con muchas tareas
- [ ] [ALTO] El historial de estados de una tarea es visible y correcto
- [ ] [MEDIO] La aprobacion/rechazo de gestiones creadas por motorizado funciona

### 6.2 Panel del Motorizado
- [ ] [CRITICO] El motorizado puede ver sus tareas del dia correctamente
- [ ] [CRITICO] El motorizado puede cambiar el estado de sus tareas
- [ ] [CRITICO] El reordenamiento de ruta (DnD) guarda el orden correctamente en la BD
- [ ] [ALTO] El motorizado puede subir evidencias de una tarea
- [ ] [ALTO] El motorizado puede registrar gastos en Fondos
- [ ] [ALTO] El motorizado puede crear una nueva gestion (courier_created)
- [ ] [MEDIO] El motorizado puede ver el historial de sus notificaciones

### 6.3 Jornadas y Fondos
- [ ] [CRITICO] El administrador puede registrar la entrega de fondos a un motorizado
- [ ] [ALTO] El motorizado puede ver los fondos recibidos en el dia
- [ ] [ALTO] Los gastos registrados por el motorizado se reflejan en su jornada
- [ ] [MEDIO] El status de la jornada cambia correctamente (open -> pending_settlement -> closed)

### 6.4 Liquidaciones
- [ ] [CRITICO] El motorizado puede enviar su liquidacion del dia
- [ ] [CRITICO] El administrador puede ver y aprobar/rechazar liquidaciones
- [ ] [ALTO] Los totales de la liquidacion son correctos (cobros - pagos - gastos)
- [ ] [MEDIO] La liquidacion muestra el tipo de cambio usado para conversiones USD/NIO

### 6.5 Cierre Diario
- [ ] [CRITICO] El boton "Confirmar Cierre Diario" escribe un registro en la tabla daily_closures
- [ ] [CRITICO] Los totales calculados en el cierre son correctos
- [ ] [CRITICO] No se puede hacer un doble cierre del mismo dia/sucursal
- [ ] [ALTO] El ConfirmDialog aparece antes de confirmar el cierre
- [ ] [ALTO] El historial de cierres diarios es visible

### 6.6 Notificaciones
- [ ] [ALTO] Las notificaciones se crean automaticamente al asignar una tarea
- [ ] [ALTO] Las notificaciones se crean automaticamente cuando se reasigna una tarea
- [ ] [MEDIO] Las notificaciones se marcan como leidas correctamente
- [ ] [BAJO] Las preferencias de notificaciones por usuario funcionan

---

## ===================================================================
## SECCION 7 — REALTIME
## ===================================================================

- [ ] [CRITICO] El canal de Realtime se suscribe correctamente al iniciar sesion
- [ ] [CRITICO] Los cambios en tareas se reflejan en tiempo real sin recargar la pagina
- [ ] [ALTO] El toast de "nueva tarea asignada" aparece en el dispositivo del motorizado
- [ ] [ALTO] El sistema reconecta automaticamente si se pierde la conexion (visibilitychange, online)
- [ ] [ALTO] El estado del canal es visible en los logs cuando isDev=true
- [ ] [MEDIO] Los cambios en workdays se reflejan en tiempo real (si se implemento en Sprint 3)
- [ ] [MEDIO] Las notificaciones nuevas aparecen en tiempo real (si se implemento en Sprint 3)
- [ ] [BAJO] El limite de eventsPerSecond no causa throttling con el numero de usuarios esperado

---

## ===================================================================
## SECCION 8 — PERFORMANCE
## ===================================================================

### 8.1 Tiempos de Carga
- [ ] [CRITICO] La pagina de login carga en menos de 3 segundos en 4G movil
- [ ] [ALTO] El dashboard del admin carga en menos de 4 segundos en 4G movil
- [ ] [ALTO] La lista de tareas del motorizado carga en menos de 3 segundos
- [ ] [MEDIO] Los chunks de JavaScript estan correctamente separados (vendor, router, query, supabase, dnd)
- [ ] [MEDIO] Las imagenes (si existen) estan optimizadas (WebP, tamano adecuado)

### 8.2 Build Size
- [ ] [ALTO] El bundle total (sin lazy-loaded chunks) es menor a 500KB gzipado
- [ ] [ALTO] El chunk de vendor (React + ReactDOM) es menor a 200KB gzipado
- [ ] [MEDIO] El Lighthouse Performance Score es mayor a 70 en mobile

### 8.3 Lazy Loading
- [ ] [CRITICO] Todas las rutas usan React.lazy() con Suspense — verificar en router.tsx
- [ ] [ALTO] Los componentes pesados cargan con skeleton mientras se obtienen los datos

---

## ===================================================================
## SECCION 9 — RESPONSIVE Y UX
## ===================================================================

### 9.1 Dispositivos
- [ ] [CRITICO] La app del motorizado funciona en Android Chrome (version < 2 anios)
- [ ] [CRITICO] La app del motorizado funciona en iPhone Safari (version < 2 anios)
- [ ] [ALTO] La app del administrador funciona en Tablet (paisaje y retrato)
- [ ] [ALTO] La app del administrador funciona en desktop Chrome, Firefox, Safari, Edge

### 9.2 Experiencia de Usuario
- [ ] [CRITICO] No existen dialogs nativos de window.confirm() en ninguna pagina
- [ ] [CRITICO] Todos los errores de red muestran un toast o mensaje claro al usuario
- [ ] [ALTO] Todos los estados de carga tienen Skeleton o Spinner apropiado
- [ ] [ALTO] Todos los estados vacios tienen EmptyState con mensaje informativo
- [ ] [ALTO] El usuario puede retroceder con el boton "Atras" del navegador sin perder datos
- [ ] [MEDIO] La pagina 404 existe y muestra un mensaje amigable
- [ ] [MEDIO] El timeout de sesion muestra un mensaje claro y redirige al login
- [ ] [BAJO] Las animaciones son fluidas (60fps) en dispositivos de gama media

### 9.3 Accesibilidad
- [ ] [ALTO] Todos los botones tienen texto descriptivo o aria-label
- [ ] [ALTO] Las imagenes tienen atributo alt (si existen)
- [ ] [MEDIO] El contraste de texto cumple WCAG AA (ratio > 4.5:1 para texto normal)
- [ ] [BAJO] La app es navegable por teclado (Tab, Enter, Escape)

---

## ===================================================================
## SECCION 10 — MONITOREO Y OBSERVABILIDAD
## ===================================================================

- [ ] [CRITICO] Sentry (o equivalente) esta instalado y recibiendo eventos de la app
- [ ] [CRITICO] Se ha verificado que Sentry captura errores (error intencional enviado)
- [ ] [ALTO] Los source maps de Sentry apuntan al codigo fuente original
- [ ] [ALTO] Las alertas de Sentry estan configuradas para errores con alta frecuencia
- [ ] [ALTO] Existe al menos una persona del equipo recibiendo alertas de Sentry
- [ ] [MEDIO] El performance monitoring de Sentry esta activo (opcional segun plan)
- [ ] [BAJO] Existe un dashboard de metricas de uso (Supabase Analytics o Google Analytics)

---

## ===================================================================
## SECCION 11 — DOMINIO Y DESPLIEGUE
## ===================================================================

### 11.1 Vercel
- [ ] [CRITICO] El deploy de produccion en Vercel esta activo y sin errores
- [ ] [CRITICO] La URL de produccion es accesible desde internet
- [ ] [ALTO] El dominio personalizado esta configurado y apunta al deploy correcto
- [ ] [ALTO] Los deploys automaticos en push a main estan configurados
- [ ] [MEDIO] Existe un ambiente de staging separado del de produccion
- [ ] [MEDIO] El deploy no incluye sourcemaps publicamente accesibles (solo Sentry)

### 11.2 Supabase
- [ ] [CRITICO] El proyecto Supabase es de tipo "Production" (no "Free tier" si hay datos criticos)
- [ ] [ALTO] El plan de Supabase es adecuado para el numero de usuarios esperados
- [ ] [MEDIO] Las cuotas de Supabase (requests, storage, bandwidth) son monitoreadas
- [ ] [BAJO] Existe un plan de escalamiento si el numero de usuarios crece rapidamente

---

## ===================================================================
## SECCION 12 — TESTS Y CALIDAD
## ===================================================================

- [ ] [ALTO] Al menos los tests unitarios de tasksService estan escritos y pasan (npm test)
- [ ] [ALTO] Al menos los tests de schemas Zod estan escritos y pasan
- [ ] [ALTO] Al menos 6 flujos E2E criticos estan cubiertos con Playwright
- [ ] [MEDIO] La cobertura de tests es mayor al 60% en los servicios criticos
- [ ] [BAJO] Los tests se ejecutan automaticamente en CI/CD (GitHub Actions o Vercel CI)

---

## ===================================================================
## SECCION 13 — DOCUMENTACION
## ===================================================================

- [ ] [ALTO] El README.md tiene instrucciones claras para configurar el entorno de desarrollo
- [ ] [ALTO] ARCHITECTURE.md documenta la arquitectura general del sistema
- [ ] [ALTO] DESIGN_SYSTEM.md documenta todos los componentes del design system y sus variantes
- [ ] [MEDIO] SECURITY_AUDIT_RLS.md existe y cubre todas las tablas activas
- [ ] [MEDIO] DATABASE_DECISIONS.md existe con la decision para cada tabla huerfana
- [ ] [MEDIO] BACKUP_STRATEGY.md existe con el proceso de backup y restauracion
- [ ] [BAJO] Los servicios principales (tasksService, usersService) tienen JSDoc en funciones criticas

---

## ===================================================================
## SECCION 14 — LANZAMIENTO
## ===================================================================

### Pre-lanzamiento (24 horas antes)
- [ ] [CRITICO] Se ha notificado a los usuarios piloto sobre la fecha de lanzamiento
- [ ] [CRITICO] El equipo de soporte sabe como responder a los errores mas comunes
- [ ] [ALTO] Se ha creado al menos 1 cuenta de administrador en produccion
- [ ] [ALTO] Se ha verificado el flujo completo de onboarding con la cuenta de prod
- [ ] [MEDIO] Existe un canal de comunicacion urgente (WhatsApp, Slack) para el dia de lanzamiento

### Dia del lanzamiento
- [ ] [CRITICO] Verificar que el deploy de produccion es el correcto (git log en Vercel)
- [ ] [CRITICO] Hacer smoke test rapido: login -> crear tarea -> asignar -> cambiar estado
- [ ] [ALTO] Verificar que Sentry no muestra errores criticos en los primeros 30 minutos
- [ ] [ALTO] Verificar que el Realtime funciona en produccion
- [ ] [MEDIO] Monitorear el tiempo de respuesta de Supabase en el dashboard

### Post-lanzamiento (72 horas despues)
- [ ] [ALTO] Revisar todos los errores capturados en Sentry
- [ ] [ALTO] Revisar el feedback de los usuarios piloto
- [ ] [MEDIO] Verificar que los backups automaticos se ejecutaron correctamente
- [ ] [BAJO] Documentar las lecciones aprendidas del lanzamiento

---

## ===================================================================
## FIRMA DE APROBACION PARA PRODUCCION
## ===================================================================

Este checklist debe ser revisado y aprobado antes del deploy a produccion.

Items criticos completados:    [ ] / 28
Items altos completados:       [ ] / 26
Items medios completados:      [ ] / 16
Items bajos completados:       [ ] / 8

Aprobado por: ___________________________
Fecha de aprobacion: ___________________
Version del build aprobado: ____________
Commit SHA aprobado: ___________________

NOTA: Para el deploy minimo viable de produccion, TODOS los items [CRITICO] deben
estar marcados. Los items [ALTO] deben estar marcados antes del lanzamiento general.

---

## ===================================================================
## REFERENCIAS CRUZADAS
## ===================================================================

| Seccion del Checklist | ID en MASTER_BACKLOG.md | Sprint en SPRINT_PLANNING.md |
|-----------------------|------------------------|------------------------------|
| 1.1 TypeScript        | F1-001                 | Sprint 0                     |
| 1.4 Git               | F1-002, F1-003         | Sprint 0                     |
| 2.1 Migraciones       | F8-001                 | Sprint 3                     |
| 2.2 RLS               | F5-002                 | Sprint 2                     |
| 2.4 Backups           | F12-004                | Sprint 3                     |
| 3.1 Auth              | F2-004                 | Sprint 1                     |
| 4.1 Variables         | F12-001                | Sprint 7                     |
| 5.1 Headers HTTP      | F5-001                 | Sprint 2                     |
| 5.3 Uploads           | F5-003                 | Sprint 2                     |
| 6.5 Cierre Diario     | F2-001                 | Sprint 1                     |
| 7. Realtime           | F6-001, F6-002, F6-003 | Sprint 3                     |
| 9.2 UX                | F3-001, F3-002, F3-003 | Sprint 2                     |
| 10. Monitoreo         | F12-003                | Sprint 7                     |
| 11.1 Vercel           | F12-001, F12-002       | Sprint 7                     |
| 12. Tests             | F10-001 a F10-004      | Sprint 5                     |

*Checklist version 1.0 — Generado el 2026-08-06*
*Actualizar al completar cada sprint. No modificar los criterios sin aprobacion del equipo.*
