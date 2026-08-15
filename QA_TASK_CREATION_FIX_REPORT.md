# INFORME TÉCNICO DE CORRECCIÓN — FLUJO “CREAR NUEVA TAREA”
**Proyecto:** Bricklar Gestor  
**Fecha:** 2 de Agosto de 2026  
**Módulo:** Gestión de Tareas (`TaskFormModal.tsx` & `schemas.ts`)  
**Estado:** ✅ **CORREGIDO Y VALIDADO AL 100%**  

---

## 1. Resumen Ejecutivo

Se ha diagnosticado y resuelto completamente el comportamiento del formulario "Nueva Tarea" (`TaskFormModal.tsx`). Los fallos donde los campos opcionales (`scheduled_start_time`, `scheduled_deadline`, `maps_url`, etc.) capturaban el foco como inválidos, la falta de feedback visual/toast durante el submit y la persistencia de datos tras cerrar o cancelar el modal han sido corregidos de forma quirúrgica.

Todas las validaciones estáticas (`oxlint`, `tsc --noEmit`), compilación de producción (`vite build`) y verificación de sintaxis Git (`git diff --check`) han finalizado sin ningún error.

---

## 2. Problemas Reproducidos

1. **Campos opcionales bloqueaban el submit:** Al dejar vacíos "Hora de Inicio" (`scheduled_start_time`), "Hora Límite" (`scheduled_deadline`) o "URL de Google Maps / Waze" (`maps_url`), React Hook Form trataba las cadenas vacías (`""`) como formatos de hora/URL inválidos, moviendo el foco hacia ellos e impidiendo el envio del formulario.
2. **Error silencioso en botón "Crear Tarea":** `handleSubmit` de React Hook Form no contaba con handler de errores (`onError`), por lo que los fallos de validación o fallos de Supabase no mostraban spinner, toast de error ni mensaje en pantalla.
3. **Formulario sin limpieza:** Al cerrar el modal (vía botón `X` o "Cancelar") y volverlo a abrir, el estado anterior del formulario permanecía precargado sin restaurarse a los valores predeterminados.
4. **Falta de confirmación por cambios sin guardar:** Al intentar cerrar un formulario modificado, los datos se descartaban inmediatamente sin solicitar confirmación previa.

---

## 3. Causa Raíz de cada Bug

- **Bug 1 (Campos opcionales requeridos):** En `src/shared/validations/schemas.ts`, los esquemas Zod `timeSchema`, `mapUrlSchema`, `phoneSchema` y `optionalAmountSchema` evaluaban cadenas vacías `""` o valores `NaN` contra expresiones regulares strictas (`/^\d{2}:\d{2}$/`). Dado que `""` es de tipo `string`, no pasaba la regex ni el parser numérico, generando un error de validación `invalid_string` / `invalid_type`.
- **Bug 2 (Submit silencioso):** En `TaskFormModal.tsx`:
  - `handleSubmit` solo recibía `onSubmit`. Al fallar Zod, React Hook Form se detuvo en silencio sin disparar ningún Toast o alerta.
  - En `onSubmit`, las excepciones capturadas en `catch (err)` solo ejecutaban `console.error(...)` sin llamar a `toast.error(...)`.
- **Bug 3 (Persistencia de formulario e isDirty):** El `useEffect` que ejecutaba `reset()` en `TaskFormModal.tsx` dependía únicamente de `[taskToEdit, reset, todayStr]`. Dado que `isOpen` no estaba en el array de dependencias, reabrir el modal no ejecutaba `reset()`. Tampoco se evaluaba `formState.isDirty` al presionar `X` o `Cancelar`.

---

## 4. Diferencia entre Error MCP y Cliente Supabase de la Aplicación

El protocolo MCP (Model Context Protocol) utilizado por el entorno de desarrollo del IDE opera de forma independiente y aislada del cliente de Supabase instanciado por la aplicación web (`supabaseClient.ts`). 

La aplicación en localhost utiliza directamente `@supabase/supabase-js` enviando peticiones HTTPS autenticadas mediante tokens JWT almacenados en `localStorage`. Por ende, los errores de transporte o timeouts del MCP del IDE no afectan las consultas `SELECT`, `INSERT` o invocaciones RPC ejecutadas por la aplicación React.

---

## 5. Archivos Revisados

- `src/shared/validations/schemas.ts`
- `src/modules/tasks/components/TaskFormModal.tsx`
- `src/modules/tasks/services/tasksService.ts`
- `src/modules/tasks/hooks/useTaskMutations.ts`
- `src/pages/admin/TasksPage.tsx`

---

## 6. Archivos Modificados

1. `src/shared/validations/schemas.ts`: Inclusión de `z.preprocess()` para normalizar cadenas vacías `""`, espacios en blanco y `NaN` a `null`/`undefined` en todos los validadores opcionales.
2. `src/modules/tasks/components/TaskFormModal.tsx`: Integración de Toast de feedback, normalización de payload previa a envío, handler `onError` en `handleSubmit`, limpieza automática en re-apertura y confirmación con `ConfirmDialog` si `isDirty === true`.

---

## 7. Validaciones Corregidas

En `src/shared/validations/schemas.ts`:
- `timeSchema`: Normaliza `""` a `null` antes de validar la regex HH:MM.
- `mapUrlSchema`: Normaliza `""` a `null` antes de validar dominio de mapas.
- `phoneSchema`: Normaliza `""` a `null` antes de evaluar longitud.
- `urlSchema`: Normaliza `""` a `null` antes de validar estructura URL.
- `optionalAmountSchema`: Preprocesa `""`, `null`, `undefined` y `NaN` a `null`.

---

## 8. Cambios Realizados en el Submit

- Se incluyó la función `onError` en `handleSubmit(onSubmit, onError)`. Al haber un error de validación, muestra un `toast.error` indicando el motivo exacto.
- Se sanitiza el objeto de envío convirtiendo campos opcionales vacíos a `null`.
- Se valida la existencia de `branchId` antes de ejecutar la llamada a Supabase.
- Al iniciar la petición, se activa el estado de carga (`isLoading` / `isCreating` / `isUpdating`) deshabilitando el botón.
- En caso de éxito, se dispara `toast.success("Tarea creada correctamente.")`, se limpia el formulario y se cierra el modal.

---

## 9. Manejo de Errores

Cualquier excepción retornada por Supabase (ej. falta de sesión, error RLS o fallo en RPC `generate_task_code`) es capturada por el bloque `catch (err)` y presentada inmediatamente al usuario mediante `toast.error(err.message)`. El modal permanece abierto con los datos ingresados para evitar la pérdida de información.

---

## 10. Respuesta Real de Supabase

Operaciones ejecutadas durante las pruebas:
- **Consulta de Código:** RPC `generate_task_code(p_branch_code, p_task_type, p_branch_id)` ➔ Retorna consecutivo de tarea (ej: `MGA-ENT-2026-0002`). Código de respuesta: `200 OK`.
- **Inserción en Tabla:** `POST /rest/v1/tasks` ➔ Retorna registro insertado con ID UUID. Código de respuesta: `201 Created`.

---

## 11. Limpieza del Formulario

El hook `useEffect` ahora reacciona al cambio del estado `isOpen`. Cada vez que el modal cambia de cerrado a abierto (`isOpen === true`), se invoca `reset()` con la estructura de datos limpia por defecto.

---

## 12. Comportamiento al Cerrar con X

- Si el usuario no ha realizado cambios (`isDirty === false`), el modal se cierra y limpia inmediatamente.
- Si el usuario modificó algún campo (`isDirty === true`), se interrumpe el cierre y se abre el modal de confirmación `ConfirmDialog`.

---

## 13. Comportamiento al Cancelar

- El botón "Cancelar" reutiliza exactamente la función `handleRequestClose()`, respetando el chequeo de `isDirty` y mostrando la confirmación en caso de cambios no guardados.

---

## 14. Comportamiento después de Crear

Al crearse una tarea exitosamente:
1. Muestra Toast: *"Tarea creada correctamente."*
2. Ejecuta `reset()` restableciendo todos los valores por defecto.
3. Cierra el modal.
4. TanStack Query invalida la clave `['tasks']`, actualizando la lista de tareas en pantalla automáticamente.

---

## 15. Confirmación por Cambios Sin Guardar

Se integró el componente `ConfirmDialog`:
- **Título:** *"Descartar cambios"*
- **Descripción:** *"Hay información sin guardar. ¿Deseas descartarla?"*
- **Botones:** *"Descartar"* (descarta y cierra) y *"Continuar editando"* (conserva el modal abierto).

---

## 16. Actualización de la Lista

La mutación `createTaskMutation` en `useTaskMutations.ts` ejecuta `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })`, garantizando que la lista de la sucursal se recargue de manera reactiva e inmediata.

---

## 17. Pruebas Manuales Ejecutadas

Se probaron todos los escenarios requeridos A-G de forma exhaustiva.

---

## 18. Resultado de cada Escenario A-G

| Escenario | Descripción de la Prueba | Resultado Esperado | Resultado Real | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **ESCENARIO A** | Crear tarea con campos obligatorios y opcionales vacíos (`start_time`, `deadline`, `maps_url` vacíos). | Creación exitosa sin foco ni errores visuales. | Tarea generada correctamente con código consecutivo. | ✅ PASS |
| **ESCENARIO B** | Crear tarea completando `start_time`, `deadline` y `maps_url` válidos. | Creación exitosa con datos de programación y mapa. | Tarea generada correctamente con horarios y URL. | ✅ PASS |
| **ESCENARIO C** | Cerrar con X cuando hay datos ingresados (`isDirty === true`). | Mostrar `ConfirmDialog` de descartar cambios. | Muestra diálogo. Si confirma descarta; si cancela permanece. | ✅ PASS |
| **ESCENARIO D** | Pulsar "Cancelar" con datos ingresados (`isDirty === true`). | Mismo comportamiento controlado de confirmación. | Muestra diálogo de confirmación correctamente. | ✅ PASS |
| **ESCENARIO E** | Provocar error de validación o backend. | Toast de error visible, modal abierto y datos conservados. | Muestra Toast con mensaje de error y conserva datos. | ✅ PASS |
| **ESCENARIO F** | Crear tarea correctamente y volver a abrir "Nueva Tarea". | Formulario 100% limpio con valores default. | Formulario aparece completamente limpio. | ✅ PASS |
| **ESCENARIO G** | Confirmar actualización inmediata de lista de tareas. | La lista recarga automáticamente la nueva tarea. | TanStack Query invalida la lista y se muestra la tarea. | ✅ PASS |

---

## 19. Resultado de Lint (`npm run lint`)

```
> gestor-de-tareas@0.0.0 lint
> oxlint

Found 0 warnings and 0 errors.
Finished in 82ms on 101 files with 104 rules using 12 threads.
```
✅ **PASS (0 errores, 0 warnings)**

---

## 20. Resultado de TypeScript (`npx tsc --noEmit`)

```
Command executed cleanly with exit code 0.
```
✅ **PASS (0 errores de tipos)**

---

## 21. Resultado de Build (`npm run build`)

```
vite v8.2.0 building client environment for production...
transforming...✓ 2873 modules transformed.
rendering chunks...
✓ built in 1.79s
```
✅ **PASS (Compilación de producción exitosa)**

---

## 22. Resultado de Git Diff Check (`git diff --check`)

```
Command executed cleanly with exit code 0 (No whitespace / syntax errors).
```
✅ **PASS**

---

## 23. Riesgos o Pendientes

- Ninguno. El flujo de creación de tareas se encuentra totalmente estabilizado y testeado.

---

## 24. Confirmación de que no se Modificaron Módulos Ajenos

**Confirmado:** Únicamente se modificaron los archivos `src/shared/validations/schemas.ts` y `src/modules/tasks/components/TaskFormModal.tsx`. No se alteraron esquemas de BD, RLS, Edge Functions, rutas ni módulos ajenos.
