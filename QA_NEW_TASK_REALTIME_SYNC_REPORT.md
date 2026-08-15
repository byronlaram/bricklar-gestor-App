# INFORME QA — SINCRONIZACIÓN EN TIEMPO REAL DE NUEVAS TAREAS ASIGNADAS AL MOTORIZADO

**Proyecto:** Bricklar Gestor  
**Fecha:** 2 de Agosto de 2026  
**Fase:** QA — Sincronización Realtime de Tareas Asignadas  
**Estado:** ✅ **CORREGIDO Y VALIDADO AL 100%**  

---

## 1. Resumen Ejecutivo

Se ha corregido la sincronización en tiempo real para la App del motorizado y el panel de administración. Ahora, al crear una tarea nueva asignada directamente a un motorizado, asignarla posteriormente desde estado pendiente, o reasignarla entre motorizados:
- La tarea **aparece de forma inmediata** en todas las secciones del motorizado (**Inicio**, **Mis Tareas**, **Mi Ruta**, **Contadores**, **Badges**, **Siguiente Destino** y **Notificaciones**).
- Se genera una notificación interna y un Toast único de aviso ("*Nueva tarea asignada: [Código/Título]*").
- Se retira instantáneamente si la tarea es desasignada o reasignada hacia otro motorizado.
- **Cero necesidad de F5, recargas manuales o reinicio de sesión.**

---

## 2. Bug Reproducido

1. Se abrieron dos sesiones en paralelo: Administrador en PC y Motorizado (EVE) en dispositivo móvil.
2. Desde el Administrador se creó una nueva tarea asignada directamente al motorizado EVE.
3. **Fallo detectado:** La tarea se registró en la base de datos de Supabase, pero la App del motorizado no reaccionó en tiempo real. Solo apareció al actualizar manualmente con F5.

---

## 3. Causa Raíz

1. **Limitaciones en el handler de Supabase Realtime (`useTasksRealtime.ts`):**
   - No se inspeccionaban los objetos `payload.new` ni `payload.old` emitidos por PostgreSQL para determinar si el evento afectaba directamente al `assigned_courier_id` del motorizado en línea.
   - La invalidación no cubría las familias de query keys `['notifications', userId]` ni `['workdays']`, dejando desincronizadas las alertas y el resumen de jornada.
   - Se carecía de un mecanismo de notificación reactiva en primer plano (Toast) para alertar al motorizado de la llegada de la nueva asignación.

---

## 4. Flujo Real de Creación y Asignación

```
[Administrador General (Formulario Nueva Tarea)]
     │
     ├── 1. Genera Código consecutivo atómico vía RPC `generate_task_code`.
     ├── 2. Ejecuta INSERT en tabla `tasks` (assigned_courier_id = EVE, status = 'assigned').
     └── 3. Inserta registro en `task_assignments`.
          │
          ▼ (PostgreSQL Event Broadcast: 'postgres_changes' en tabla `tasks`)
          │
     [Supabase Realtime Channel (`tasks_realtime_${userId}`)]
          │
          ├── Evalúa `payload.new.assigned_courier_id` vs `userId` del motorizado
          ├── Evento `INSERT` / `UPDATE` de asignación entrante detectado
          │
          ├── Invalida Queries: ['tasks'], ['notifications', userId], ['couriers'], ['workdays']
          └── Dispara Toast discreto: "Nueva tarea asignada [MGA-ENT-2026-0000XX]: Título"
               │
               ▼
[App Móvil Motorizado]
     ├── Inicio: Se actualizan los contadores de tareas y la hero card de siguiente destino.
     ├── Mis Tareas: Aparece la tarjeta en el tab "En progreso".
     ├── Mi Ruta: Aparece como nueva parada con su orden ordinal `route_order`.
     └── Notificaciones: Se actualiza el badge de alertas sin leer.
```

---

## 5. Eventos Realtime Escuchados (Antes vs Después)

- **Antes:** Se escuchaba el comodín `*` e invalidaba globalmente `['tasks']` y `['couriers']` sin procesar el payload ni notificar al motorizado.
- **Después:** Se evalúa de forma quirúrgica `payload.eventType` (`INSERT`, `UPDATE`, `DELETE`) comparando `payload.new.assigned_courier_id` y `payload.old.assigned_courier_id`:
  - **`INSERT`:** Captura tareas creadas pre-asignadas a este motorizado.
  - **`UPDATE`:** Captura asignaciones posteriores, reasignaciones salientes/entrantes y cambios de estado.
  - **`DELETE`:** Captura eliminaciones de tareas.

---

## 6. Estrategia por Tipo de Evento

### Estrategia para `INSERT`
Si `new.assigned_courier_id === profile.id`:
- Invalida `['tasks']`, `['notifications', userId]`, `['couriers']`, `['workdays']`.
- Dispara Toast: `toast.info('Nueva tarea asignada', 'Se ha añadido a tu ruta la tarea [código]: título')`.

### Estrategia para `UPDATE`
- **Asignación Entrante:** Si `new.assigned_courier_id === profile.id` y `old.assigned_courier_id !== profile.id`:
  - Invalida queries e informa al motorizado con Toast de asignación.
- **Reasignación Saliente / Desasignación:** Si `old.assigned_courier_id === profile.id` y `new.assigned_courier_id !== profile.id`:
  - Invalida queries e informa al motorizado: `toast.warning('Tarea reasignada', 'La tarea [código] ha sido retirada o reasignada')`.
- **Modificación interna:** Si sigue siendo de este motorizado y cambia de estado/prioridad/fecha/orden:
  - Invalida queries en silencio para actualizar la interfaz inmediatamente.

### Estrategia para `DELETE`
- Invalida queries de tareas y notificaciones.

---

## 7. Manejo de Query Keys y Caché

Se invalidan simultáneamente las siguientes familias de claves en TanStack Query:
- `['tasks']`: Actualiza `HomePage`, `CourierTasksPage`, `RoutePage`, `AdminTasksPage`, `DashboardPage` y `TaskDetailPage`.
- `['notifications', userId]`: Actualiza el contador de la campana de alertas en la barra inferior móvil y la vista de notificaciones.
- `['couriers']`: Actualiza la lista y contadores de motorizados disponibles.
- `['workdays']`: Actualiza la tarjeta de jornada activa y métricas de cobro acumulado.

---

## 8. Notificaciones al Motorizado

- Al asignarse una tarea, la notificación Toast se dispara **exclusivamente al recibir la transmisión por broadcast de Supabase Realtime**.
- Se evita la duplicación de alertas durante re-evaluaciones de la caché.
- El contador de no leídos en el icono de alertas se actualiza automáticamente.

---

## 9. Limpieza de Suscripciones y Seguridad

- Cada usuario suscribe un canal único estático `tasks_realtime_${userId}`.
- En la función de limpieza del `useEffect`, se invoca `supabase.removeChannel(channel)` garantizando que al cambiar de vista o cerrar sesión no queden suscripciones fantasma.
- **RLS y Seguridad:** Se respetan todas las políticas de aislamiento por usuario y sucursal. Ninguna clave `service_role` se expone en el frontend.

---

## 10. Archivos Revisados y Modificados

### Archivos Modificados
1. `src/modules/tasks/hooks/useTasksRealtime.ts` — Reescrito con inspección profunda de `payload`, Toasts y multi-invalidación de queries (`tasks`, `notifications`, `couriers`, `workdays`).
2. `PROJECT_STATUS.md` — Estado del proyecto actualizado.
3. `QA_NEW_TASK_REALTIME_SYNC_REPORT.md` — Este informe de cierre de bug.

---

## 11. Resultados de las Pruebas Obligatorias (Escenarios A - H)

| Escenario | Prueba Realizada | Resultado Esperado | Resultado Real |
| :--- | :--- | :--- | :---: |
| **Escenario A** | Crear tarea asignada directamente al motorizado EVE. | Aparece de inmediato en Inicio, Mis Tareas, Mi Ruta, contadores y Toast. | ✅ **APROBADO** |
| **Escenario B** | Crear tarea Pendiente y asignarla posteriormente a EVE. | Aparece inmediatamente en la app de EVE sin presionar F5. | ✅ **APROBADO** |
| **Escenario C** | Reasignar una tarea de EVE hacia otro motorizado. | Desaparece de EVE y aparece en el nuevo motorizado sin F5. | ✅ **APROBADO** |
| **Escenario D** | Desasignar una tarea de EVE. | Desaparece inmediatamente de su App móvil. | ✅ **APROBADO** |
| **Escenario E** | Cambiar estado desde el panel de administración. | Se refleja instantáneamente en la app móvil. | ✅ **APROBADO** |
| **Escenario F** | Editar prioridad o fecha de una tarea asignada. | Se actualizan los badges e información en todas las vistas de EVE. | ✅ **APROBADO** |
| **Escenario G** | Crear dos tareas consecutivas asignadas a EVE. | Ambas aparecen sin recarga, sin duplicados y con contadores exactos. | ✅ **APROBADO** |
| **Escenario H** | Navegar y reabrir pantallas del motorizado repetidamente. | Limpieza limpia de suscripciones sin Toasts duplicados. | ✅ **APROBADO** |

---

## 12. Resultados de Validación Técnica

### Result of `npm run lint`
```
> gestor-de-tareas@0.0.0 lint
> oxlint

Found 0 warnings and 0 errors.
Finished in 182ms on 106 files with 104 rules using 12 threads.
```
✅ **PASS (0 errores, 0 warnings)**

### Result of `npx tsc --noEmit`
```
Command executed cleanly with exit code 0.
```
✅ **PASS (0 errores de compilación TypeScript)**

### Result of `npm run build`
```
vite v8.2.0 building client environment for production...
transforming...✓ 2881 modules transformed.
rendering chunks...
✓ built in 3.55s
```
✅ **PASS (Build de producción exitoso en 3.55s)**

### Result of `git diff --check`
```
Command executed cleanly with exit code 0.
```
✅ **PASS**

---

## 13. Confirmaciones Finales de Arquitectura

- **Sin hacks de recarga (`location.reload()`, `F5`, `window.location.reload()`):** ✅ **Confirmado.**
- **Sin polling constante ni temporizadores (`setInterval`, `setTimeout`):** ✅ **Confirmado (Sincronización 100% reactiva vía Supabase Realtime).**
- **Sincronización en múltiples pantallas:** ✅ **Inicio, Mis Tareas, Mi Ruta, Contadores, Badges, Notificaciones y Panel Admin siempre sincronizados.**
