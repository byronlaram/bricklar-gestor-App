# PROJECT_STATUS — Bricklar Gestor

> **Ultima actualizacion:** 2026-08-06 (Auditoria Integral)
> **Version:** 0.0.0
> **Estado general:** EN DESARROLLO ACTIVO — BUILD BLOQUEADO

---

## Estado Critico (Requiere Atencion Inmediata)

| Problema | Severidad | Archivo |
|---|---|---|
| Build de produccion FALLA | CRITICO | src/modules/tasks/components/SortableTaskCard.tsx:252 |
| Cierre Diario no persiste en DB | CRITICO | src/pages/admin/DailyClosurePage.tsx |
| 50+ archivos sin commitear | CRITICO | (todo el workspace) |

---

## Validaciones Tecnicas

| Validacion | Resultado |
|---|---|
| npm run lint (oxlint) | PASA — 0 errores, 0 warnings |
| npx tsc --noEmit | FALLA — 1 error de tipo |
| npm run build | FALLA — bloqueado por TypeScript |
| git status | 50+ archivos modificados sin commit |

---

## Modulos — Estado Real

### Panel Administrador

| Modulo | Estado | Produccion? |
|---|---|---|
| Dashboard | Parcialmente Funcional | No — query sin filtro deleted_at |
| Gestion de Tareas | Funcional | Si (si build pasa) |
| Detalle de Tarea | Funcional | Si |
| Gestion de Usuarios | Funcional | Si |
| Gestion de Sucursales | Funcional | Si |
| Jornadas y Fondos | Funcional | Si |
| Liquidaciones | Funcional | Si |
| Cierre Diario | NO FUNCIONAL | No — no escribe en DB |
| Directorio de Buses | Funcional | Si |
| Reportes | Parcialmente Funcional | No — solo CSV, sin graficos |
| Auditoria | Funcional | Si |
| Configuracion | Parcialmente Funcional | No — no refresca perfil |
| Mantenimiento | Funcional | Si |

### Panel Motorizado (Courier)

| Modulo | Estado | Produccion? |
|---|---|---|
| Inicio / Mis Tareas | Funcional | Si |
| Mi Ruta (DnD) | Funcional | Requiere prueba en mobile real |
| Fondos | Funcional | Si |
| Liquidacion | Funcional | Requiere prueba de flujo completo |
| Buses | Funcional | Si |
| Nueva Gestion | Funcional | Requiere aprobacion de admin |
| Notificaciones | Solo lectura — siempre vacio | No — sin backend productor |

### Autenticacion

| Modulo | Estado | Produccion? |
|---|---|---|
| Login | Funcional | Si |
| Recuperar Contrasena | Funcional | Si |
| Resetear Contrasena | Funcional | Si |
| Cuenta Suspendida | Funcional | Si |
| Cambio obligatorio de contrasena | Parcial | Requiere prueba |

---

## Base de Datos

| Tablas activas con UI | 14 |
|---|---|
| Tablas sin UI (huerfanas) | 8 |
| Migraciones versionadas localmente | 2 |
| Esquema principal versionado | NO |

### Tablas Huerfanas (sin interfaz)
- notification_preferences
- app_settings
- cash_transfers
- courier_branch_assignments
- daily_closures (tabla existe pero no recibe datos)
- destinations
- bus_schedules
- exchange_rates
- financial_movements
- transport_services

---

## Realtime

| Aspecto | Estado |
|---|---|
| Canal por usuario | Implementado |
| Listener tabla tasks | Implementado |
| Listener tabla task_assignments | Implementado |
| Toasts contextuales para courier | Implementado |
| Resiliencia (visibilitychange, online) | Implementado |
| Realtime sobre notifications | No implementado |
| Realtime sobre workdays | No implementado |

---

## Seguridad

| Aspecto | Estado |
|---|---|
| .env.local en .gitignore | OK |
| Mensajes de error genericos en auth | OK |
| Validacion de transiciones de estado | OK |
| Soft-delete con reglas de integridad | OK |
| Route guards por rol | OK |
| Headers de seguridad HTTP (vercel.json) | FALTANTE |
| RLS de Supabase | No verificado localmente |
| Validacion de tipo en upload de evidencias | FALTANTE |

---

## Dependencias

| Paquete | Version | Estado |
|---|---|---|
| react | ^19.2.8 | Actualizada |
| vite | ^8.2.0 | Actualizada |
| typescript | ~6.0.2 | Actualizada |
| @supabase/supabase-js | ^2.111.0 | Actualizada |
| @tanstack/react-query | ^5.101.4 | Actualizada |
| tailwindcss | ^4.3.3 | Actualizada |
| react-router-dom | ^7.11.0 | Actualizada |
| @react-pdf/renderer | ^4.5.1 | Sin uso detectado |
| vitest + playwright + testing-library | instaladas | Sin tests escritos |

---

## Deuda Tecnica Acumulada

| Prioridad | Item |
|---|---|
| CRITICA | Corregir error TypeScript SortableTaskCard.tsx:252 |
| CRITICA | Implementar persistencia real en Cierre Diario |
| CRITICA | Commitear 50+ archivos de trabajo acumulado |
| ALTA | Reemplazar window.confirm con ConfirmDialog (3 paginas) |
| ALTA | Agregar headers de seguridad en vercel.json |
| ALTA | Filtrar deleted_at en query del Dashboard |
| ALTA | Llamar refreshProfile() en SettingsPage |
| MEDIA | Implementar UI para exchange_rates |
| MEDIA | Crear mecanismo de produccion de notificaciones |
| MEDIA | RPC batch para updateTaskRouteOrders |
| MEDIA | Escribir tests automatizados |
| BAJA | Refactorizar TaskFormModal.tsx (36KB) |
| BAJA | Extraer usePrimaryBranch() y getTodayStr() |
| BAJA | Eliminar dependencias sin uso |
| BAJA | Versionar esquema SQL completo en migraciones |

---

## Madurez del Proyecto

**Nivel general: ~57% listo para produccion**

Con una semana de estabilizacion prioritaria se puede llegar al 70%.
Para produccion confiable se requieren: tests automatizados + modulos faltantes + QA en mobile real.

---

*Estado generado por Auditoria Integral del 2026-08-06.*
*No modificar manualmente este archivo — actualizar tras cada sprint completado.*
