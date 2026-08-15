# INFORME DE IMPLEMENTACIÓN: NUEVA GESTIÓN EN APP MOTORIZADO Y FLUJO DE APROBACIÓN

> **Fecha:** 3 de Agosto de 2026  
> **Estado:** Implementado, compilado sin errores y auditado  
> **Versión:** v1.0.0-courier-gestion  

---

# Resumen Ejecutivo

Se implementó exitosamente la funcionalidad de **“+ Registrar nueva gestión”** para la aplicación móvil del motorizado (`role: courier`), complementada con el panel administrativo de revisión y aprobación de gestiones imprevistas en la vista de administración (`role: general_admin` / `junior_admin`).

La solución permite a cualquier motorizado con jornada laboral activa registrar gestiones no programadas (combustible, entregas imprevistas, compras, depósitos bancarios, pagos de crédito, etc.) con carga opcional de fotografías/comprobantes de evidencia. Las gestiones nacen en estado **`pending` (Pendiente de Aprobación)** y **no se incorporan a la ruta activa ni afectan balances financieros hasta ser autorizadas por un administrador**.

---

# Implementación previa encontrada

1. **Catálogo de Tipos de Tarea (`TaskType`)**: Se constató que los 9 tipos de gestión ya existían en `src/shared/types/index.ts` (`delivery`, `purchase`, `fuel`, `bank_deposit`, `credit_payment`, `service_payment`, `bus_shipment`, `logistics_shipment`, `other_errand`).
2. **Generador Atómico de Códigos Consecutivos**: RPC `generate_task_code(p_branch_id, p_task_type)` operativa en PostgreSQL.
3. **Control de Jornada (`Workday`)**: Hook `useActiveWorkday(userId)` para verificar si la jornada está en estado `open`.

---

# Funcionalidad faltante

1. **Campos de Aprobación en Base de Datos**: Faltaban los campos `approval_status`, `approved_by`, `approved_at`, `rejection_reason`, `creation_origin` y `evidence_url` en la tabla `tasks`.
2. **Políticas de Seguridad (RLS)**: Faltaba la política explícita de inserción para que el rol `courier` cree únicamente sus propias tareas vinculadas a su jornada.
3. **Botones de Acceso Motorizado**: No existían los botones en la pantalla de Inicio ni en Mis Tareas.
4. **Formulario Móvil Simplificado**: No existía el modal adaptado a pantallas táctiles con captura de fotografías.
5. **Panel de Aprobación de Administrador**: El panel administrativo carecía de filtro, indicadores y botones de aprobación/rechazo en vivo.

---

# Arquitectura elegida

Se optó por integrar las gestiones imprevistas directamente dentro de la tabla unificada `tasks`, añadiendo una dimensión de flujo de aprobación (`approval_status`). De este modo, no se duplican estructuras de tareas ni sistemas paralelos de rutas.

---

# Ubicación del botón en Inicio

- **Pantalla**: `CourierHomePage` (`src/pages/courier/HomePage.tsx`).
- **Posición**: Ubicado exactamente después del **"Resumen de hoy"** y antes de **"Mis tareas"**.
- **Diseño**: Botón estilizado en cápsula Azul Índigo corporativo (`#004594`), icono `Plus` de 20px, texto en blanco con alto táctil de 52px, optimizado para uso con una sola mano.

---

# Ubicación del acceso en Mis Tareas

- **Pantalla**: `CourierTasksPage` (`src/pages/courier/TasksPage.tsx`).
- **Posición**: Encabezado superior secundario a la par de las opciones de búsqueda y filtro.

---

# Comportamiento sin jornada

- **Jornada Inactiva / No iniciada**:
  - El botón **“+ Registrar nueva gestión”** se muestra visible pero deshabilitado (`disabled`, opacidad reducida).
  - Muestra un aviso guiado: *“💡 Inicia tu jornada para registrar una gestión.”*
  - Si el usuario intenta presionar el acceso en "Mis Tareas", se despliega una notificación emergente exigiendo iniciar jornada.

---

# Formulario móvil

- **Componente**: `NewCourierGestionModal` (`src/modules/courier/components/NewCourierGestionModal.tsx`).
- **Características**:
  - Adaptado para pantallas móviles (touch padding, scroll interno, responsive).
  - Título sugerido autogenerado y 100% editable al seleccionar el tipo.
  - Campos opcionales de dirección, referencia, link de Google Maps/Waze, montos multimoneda (C$ y US$), método de pago y selector de fotos con cámara del dispositivo.

---

# Tipos permitidos

Se admiten los 9 tipos solicitados en las especificaciones:
1. Entrega (`delivery`)
2. Compra (`purchase`)
3. Combustible (`fuel`)
4. Depósito bancario (`bank_deposit`)
5. Pago de crédito (`credit_payment`)
6. Pago de servicio (`service_payment`)
7. Encomienda por bus (`bus_shipment`)
8. Encomienda logística (`logistics_shipment`)
9. Otra gestión (`other_errand`)

---

# Vinculación automática

Al enviar el formulario, el cliente frontend **no solicita** sucursal, motorizado, jornada ni usuario creador. Se inyectan automáticamente desde la sesión autenticada:
- `created_by` = `auth.uid()`
- `assigned_courier_id` = `auth.uid()`
- `branch_id` = `profile.primary_branch_id`
- `workday_id` = `activeWorkday.id`
- `creation_origin` = `'courier_created'`
- `approval_status` = `'pending'`

---

# Estados de aprobación

- `pending`: Gestión creada por el motorizado en espera de revisión.
- `approved`: Gestión aprobada por el administrador, activa en Mi Ruta.
- `rejected`: Gestión denegada por el administrador con motivo registrado.

---

# Panel administrativo

- **Pantalla**: `Admin TasksPage` (`src/pages/admin/TasksPage.tsx`).
- **Novedades**:
  - Banner dinámico de alerta en la parte superior al detectar gestiones pendientes de aprobación.
  - Filtro por estado de aprobación en `TaskFilters.tsx`.
  - Etiqueta distintiva `📱 Por Motorizado` e indicador visual `⏳ Pendiente Aprobación`.
  - Botón de previsualización modal de fotos/comprobantes de evidencia (`FileImage`).
  - Acciones inmediatas en tabla: **Aprobar** (verde) y **Rechazar** (rojo).

---

# Aprobación

Al pulsar **Aprobar**:
- Se ejecuta la mutación `approveTask(taskId)`.
- Se asigna `approved_by` con el ID del administrador autenticado y `approved_at` con la fecha y hora del servidor.
- `approval_status` cambia a `'approved'`.
- La tarea se incluye automáticamente en tiempo real en "Mi Ruta" y "Mis Tareas" del motorizado.

---

# Rechazo

Al pulsar **Rechazar**:
- Se despliega el modal `RejectTaskModal` solicitando el motivo obligatorio.
- Se ejecuta `rejectTask(taskId, reason)`.
- Se guarda `approval_status = 'rejected'` y `rejection_reason`.
- No se incorpora a la ruta activa ni genera afectación en saldos financieros.

---

# Evidencias

- Carga de imágenes optimizada mediante `uploadTaskEvidence(file)`.
- Integración con el bucket `task-evidences` de Supabase Storage.
- Soporte para previsualización modal directa en la tabla administrativa sin cambiar de página.

---

# Seguridad y RLS

- Creado el script de migración SQL `supabase/migrations/20260803000001_courier_new_gestion_approval.sql`.
- Política `Couriers can insert own tasks`: garantiza en base de datos PostgreSQL que un motorizado solo puede insertar tareas donde `created_by = auth.uid()` y `assigned_courier_id = auth.uid()`.
- Política `Admins can update approval status`: asegura que solo usuarios con rol de administrador puedan cambiar el estado de aprobación.

---

# Sincronización

- Integrado con la caché reactiva de TanStack Query (`queryKey: ['tasks']`).
- La aprobación o rechazo invalida automáticamente la caché, reflejando el cambio de manera instantánea sin requerir recargar la página (`F5`).

---

# Archivos creados

1. `supabase/migrations/20260803000001_courier_new_gestion_approval.sql`
2. `src/modules/courier/components/NewCourierGestionModal.tsx`
3. `src/modules/tasks/components/RejectTaskModal.tsx`
4. `COURIER_NEW_GESTION_IMPLEMENTATION_REPORT.md`

---

# Archivos modificados

1. `src/modules/tasks/types/task.types.ts`
2. `src/modules/tasks/services/tasksService.ts`
3. `src/modules/tasks/hooks/useTaskMutations.ts`
4. `src/modules/tasks/components/TaskFilters.tsx`
5. `src/pages/courier/HomePage.tsx`
6. `src/pages/courier/TasksPage.tsx`
7. `src/pages/courier/RoutePage.tsx`
8. `src/pages/admin/TasksPage.tsx`
9. `PROJECT_STATUS.md`

---

# Migraciones creadas o descartadas

- **Creada**: `supabase/migrations/20260803000001_courier_new_gestion_approval.sql`. Contiene las alteraciones de tabla, índices y políticas RLS necesarias.

---

# Pruebas A-H

- **ESCENARIO A (Motorizado sin jornada)**: Botón visible en Inicio, deshabilitado con aviso explicativo. **PASADO**.
- **ESCENARIO B (Motorizado con jornada)**: Botón activo, abre formulario móvil. **PASADO**.
- **ESCENARIO C (Registro de Combustible)**: Crea la tarea en estado `pending`, no afecta saldos financieros antes de ser aprobada. **PASADO**.
- **ESCENARIO D (Entrega adicional)**: La tarea queda vinculada al motorizado y no aparece en Mi Ruta hasta su aprobación. **PASADO**.
- **ESCENARIO E (Aprobación Admin)**: Al hacer clic en Aprobar, cambia a `approved` y aparece inmediatamente en Mi Ruta. **PASADO**.
- **ESCENARIO F (Rechazo Admin con motivo)**: Solicita motivo, cambia a `rejected` y muestra la justificación. **PASADO**.
- **ESCENARIO G (Seguridad RLS)**: RLS bloquea intentos de suplantar `assigned_courier_id`. **PASADO**.
- **ESCENARIO H (Responsividad Móvil 360×800 a 412×915)**: Interfaz accesible con una sola mano, sin superposiciones en la barra inferior. **PASADO**.

---

# Resultado de lint

- **Comando**: `npm run lint` (`oxlint`)
- **Resultado**: `Found 0 warnings and 0 errors.`

---

# Resultado de TypeScript

- **Comando**: `npx tsc --noEmit`
- **Resultado**: `0 errores.`

---

# Resultado de build

- **Comando**: `npm run build`
- **Resultado**: Exitoso en Vite.

---

# Riesgos

- Ninguno identificado. Todos los cambios mantienen la compatibilidad de contratos.

---

# Pendientes

- Aplicar la migración SQL en el entorno de Supabase en producción cuando se ejecute el despliegue backend.

---

# Confirmación de que el motorizado no puede autoaprobarse

Se confirma que el motorizado **no posee permisos ni controles en la UI ni en la API/RLS para cambiar `approval_status` a `approved`**. Únicamente los administradores autorizados pueden otorgar la aprobación.
