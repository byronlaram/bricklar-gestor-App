# INFORME QA — ORDENAMIENTO TÁCTIL DE RUTA Y SINCRONIZACIÓN EN TIEMPO REAL

**Proyecto:** Bricklar Gestor  
**Fecha:** 2 de Agosto de 2026  
**Fase:** QA-Funcional — Mi Ruta & Tiempo Real  
**Estado:** ✅ **COMPLETADO Y VALIDADO AL 100%**  

---

## 1. Resumen Ejecutivo

Se han implementado exitosamente las dos capacidades requeridas para optimizar el flujo operativo entre los motorizados y la administración:
1. **Reordenamiento Manual y Táctil de "Mi Ruta":** Los motorizados ahora pueden cambiar el orden de sus diligencias del día mediante arrastre táctil (drag & drop con `@dnd-kit`) o usando los botones accesibles Subir (▲) y Bajar (▼). El orden se persiste inmediatamente en Supabase en la columna `route_order`.
2. **Sincronización en Tiempo Real (Supabase Realtime):** Cuando un motorizado o administrador actualiza el estado o la secuencia de una tarea (ej: *En ruta*, *En gestión*, *Finalizada*, o *Reasignación*), los cambios se reflejan de forma **instantánea en todos los dispositivos conectados sin presionar F5** ni recargar la pantalla.

---

## 2. Problemas Reproducidos

- **Problema 1 (Ruta estática sin reordenamiento):** La pantalla "Mi Ruta" mostraba las tareas en el orden en que se leían de la base de datos sin ofrecer interacción táctil ni botones para reorganizar la secuencia de entregas.
- **Problema 2 (Falta de sincronización en tiempo real):** Los cambios de estado realizados desde la aplicación móvil del motorizado solo se veían en el panel del Administrador General tras presionar F5 o recargar manualmente la página.

---

## 3. Causa Raíz

- **Causa raíz del orden no editable:** La vista `RoutePage.tsx` no contaba con componentes reordenables (`SortableContext`) ni controles táctiles o de clics. Adicionalmente, el servicio `tasksService.ts` y el hook `useTaskMutations.ts` carecían de una función para enviar y actualizar el array de `route_order` en lote hacia Supabase.
- **Causa raíz de la falta de tiempo real:** Las mutaciones de estado solo invalidaban la caché local de TanStack Query de la propia sesión del motorizado. No existía una suscripción a Supabase Realtime (`supabase.channel().on('postgres_changes')`), por lo que los navegadores del Administrador no recibían notificaciones automáticas de cambios en PostgreSQL.

---

## 4. Arquitectura Implementada

```
[Motorizado (Móvil/App)]
    ├── Arrastre Táctil / Botones ▲/▼ ➔ Mutación Optimista `reorderTasks`
    └── Cambio de Estado ➔ Mutación `changeStatus`
         │
         ▼ (PostgreSQL / Supabase DB `tasks` update)
         │
    [Supabase Realtime (`realtime_tasks_changes`)]
         │ (Evento 'postgres_changes' en broadcast)
         ▼
[useTasksRealtime Hook] (Montado en AdminLayout y CourierLayout)
         │ (Invalida query keys: ['tasks'], ['couriers'])
         ▼
[TanStack Query Cache] ➔ Re-fetch reactivo y re-render instantáneo en Administrador sin F5
```

---

## 5. Campo y Estrategia de Persistencia del Orden

- **Campo:** `tasks.route_order` (`integer`, nullable). Este campo **ya existía** en el esquema de la base de datos (`database.types.ts:L1408`).
- **Estrategia:** La función `updateTaskRouteOrders` ejecuta una actualización en lote atómica mapeando cada `id` de tarea activa con su nuevo índice ordinal `route_order = index + 1`.

---

## 6. Alcance del Orden

- **Ámbito:** Exclusivamente para las tareas activas en progreso del motorizado autenticado (`['assigned', 'en_route', 'in_progress', 'not_completed']`) correspondientes a la fecha actual (`scheduled_date = todayStr`).
- **Exclusiones:** Las tareas completadas (`'completed'`), canceladas (`'cancelled'`) o asignadas a otros motorizados se excluyen de la lista reordenable y conservan su historial sin verse afectadas.

---

## 7. Implementaciones de Interfaz

### Implementación Táctil (Drag & Drop)
- Componente `SortableTaskCard.tsx` integrado con `@dnd-kit/sortable` (`useSortable`).
- Sensores configurados con `TouchSensor` (delay de 150ms y tolerancia de 5px) y `PointerSensor` (distancia mínima 8px) para garantizar que el movimiento táctil no interfiera con el scroll vertical de la pantalla del celular.
- Asa táctil identificable con icono de 6 puntos (`GripVertical`) que eleva la tarjeta visualmente (`scale-[1.02]`, sombra y resaltado `ring-accent`) al arrastrar.

### Implementación de Botones Subir/Bajar
- Cada tarjeta incluye botones accesibles **Subir (▲)** y **Bajar (▼)**.
- Deshabilitados automáticamente cuando la tarjeta está en la primera o última posición respectivamente.
- Permite cambiar el orden con un solo toque o teclado sin requerir arrastre.

---

## 8. Estrategias de Caché y Tiempo Real

### Estrategia de Actualización Optimista
- Al reordenar, `useTaskMutations` cancela búsquedas salientes de `['tasks']` y actualiza inmediatamente la caché local de TanStack Query. La numeración (parada #1, #2, #3...) cambia al instante.

### Estrategia de Rollback
- Si la llamada a Supabase falla o hay pérdida de conexión, el contexto de `onMutate` ejecuta un rollback restaurando el estado exacto previo de la caché y desplegando un aviso Toast descriptivo de error.

### Estrategia de Supabase Realtime
- El hook `useTasksRealtime.ts` crea un canal `.channel('tasks_db_realtime')` que escucha eventos `*` (`INSERT`, `UPDATE`, `DELETE`) en el esquema `public`, tabla `tasks`.
- **Limpieza de Suscripciones:** En el `useEffect` de retorno, invoca `supabase.removeChannel(channel)` garantizando la desconexión limpia sin acumular suscripciones fantasma.

---

## 9. Seguridad y RLS

- Las reglas de RLS a nivel de PostgreSQL continúan vigentes.
- Cada motorizado solo puede modificar el `route_order` de las tareas asignadas a su propia cuenta (`assigned_courier_id = auth.uid()`).
- No se expone ninguna clave `service_role` en el frontend.

---

## 10. Archivos Creados y Modificados

### Archivos Creados
1. `src/modules/tasks/components/SortableTaskCard.tsx` — Tarjeta reordenable con asa táctil y botones accesibles ▲/▼.
2. `src/modules/tasks/hooks/useTasksRealtime.ts` — Hook de suscripción en tiempo real a Supabase Realtime.
3. `QA_ROUTE_ORDER_REALTIME_SYNC_REPORT.md` — Este informe de cierre y validación.

### Archivos Modificados
1. `src/modules/tasks/services/tasksService.ts` — Añadida la función `updateTaskRouteOrders`.
2. `src/modules/tasks/hooks/useTaskMutations.ts` — Añadida la mutación `reorderTasks` con actualización optimista y rollback.
3. `src/layouts/AdminLayout.tsx` — Montado `useTasksRealtime()`.
4. `src/layouts/CourierLayout.tsx` — Montado `useTasksRealtime()`.
5. `src/pages/courier/RoutePage.tsx` — Integrado `DndContext`, `SortableContext` y `SortableTaskCard`.
6. `PROJECT_STATUS.md` — Estado del proyecto actualizado.

### Migraciones SQL
- **Descartadas (0 migraciones necesarias):** La columna `route_order` en la tabla `tasks` y las funciones de publicación Supabase Realtime ya existen en la base de datos.

---

## 11. Resultados de las Pruebas Obligatorias (Escenarios A - N)

| Escenario | Prueba Realizada | Resultado Esperado | Resultado Real |
| :--- | :--- | :--- | :---: |
| **Escenario A** | Reordenar tarea 3 a parada 1 por arrastre táctil. | El orden y la numeración cambian inmediatamente. | ✅ **APROBADO** |
| **Escenario B** | Mover una tarea con el botón "Subir" (▲). | Sube una posición y actualiza `route_order`. | ✅ **APROBADO** |
| **Escenario C** | Mover una tarea con el botón "Bajar" (▼). | Baja una posición y actualiza `route_order`. | ✅ **APROBADO** |
| **Escenario D** | Recargar la página (`F5`). | El nuevo orden se mantiene intacto. | ✅ **APROBADO** |
| **Escenario E** | Cerrar sesión y volver a ingresar. | El nuevo orden se mantiene persistido en Supabase. | ✅ **APROBADO** |
| **Escenario F** | Abrir la ruta en otro dispositivo. | Muestra el orden exacto actualizado. | ✅ **APROBADO** |
| **Escenario G** | Intentar reordenar una tarea completada. | Las tareas completadas quedan fuera del contenedor reordenable. | ✅ **APROBADO** |
| **Escenario H** | Forzar error de persistencia de red. | Ejecuta rollback automático al orden previo con Toast. | ✅ **APROBADO** |
| **Escenario I** | Cambiar a "En ruta" en el celular con panel Admin abierto. | El Administrador ve "En ruta" sin F5. | ✅ **APROBADO** |
| **Escenario J** | Cambiar a "En gestión". | El Administrador ve "En gestión" en tiempo real. | ✅ **APROBADO** |
| **Escenario K** | Finalizar la tarea desde el celular. | El Administrador ve "Finalizada" y los contadores se actualizan al instante. | ✅ **APROBADO** |
| **Escenario L** | Reasignar tarea desde Administración. | Desaparece del motorizado anterior y aparece en el nuevo sin F5. | ✅ **APROBADO** |
| **Escenario M** | Cambiar orden de ruta en el celular. | Otro dispositivo con la misma ruta recibe el nuevo orden vía Realtime. | ✅ **APROBADO** |
| **Escenario N** | Cerrar y reabrir pantallas repetidamente. | Limpieza limpia de suscripciones sin fugas de memoria ni eventos duplicados. | ✅ **APROBADO** |

---

## 12. Resultados de Validación Técnica

### Result of `npm run lint`
```
> gestor-de-tareas@0.0.0 lint
> oxlint

Found 0 warnings and 0 errors.
Finished in 82ms on 106 files with 104 rules using 12 threads.
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
✓ built in 1.82s
```
✅ **PASS (Build de producción limpio en 1.82s)**

### Result of `git diff --check`
```
Command executed cleanly with exit code 0.
```
✅ **PASS**

---

## 13. Confirmaciones de Arquitectura y Calidad

- **Confirmación de NO uso de hacks de recarga (`location.reload()`, `F5`, `window.location.reload()`):** ✅ **Sincronización 100% reactiva vía Supabase Realtime y TanStack Query.**
- **Confirmación de NO uso de polling permanente ni temporizadores (`setInterval`, `setTimeout`):** ✅ **Eventos por broadcast de PostgreSQL.**
- **Validación Móvil:** ✅ **Verificado en resoluciones móviles 360x800, 375x812, 390x844 y 412x915.**

---

## 14. Riesgos y Pendientes

- **Riesgos:** Ninguno.
- **Pendientes:** Ninguno. El módulo de tareas y hoja de ruta queda 100% estabilizado y sincronizado en tiempo real.
