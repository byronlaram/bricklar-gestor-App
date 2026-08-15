# Auditoría Técnica de Código Existente: Bricklar Gestor (V1)

> **Evaluación de Código Fuente, Componentes, Layouts, Estilos y Arquitectura UI**  
> **Fecha de Auditoría:** 1 de Agosto de 2026  
> **Evaluador:** Arquitecto Senior de Software, Tech Lead Frontend  
> **Estado:** Documentación Técnica de Código — **Sin Modificación de Archivos**

---

## 1. Árbol Completo del Proyecto

```
GESTOR DE TAREAS/
├── .env.example
├── .env.local
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vercel.json
├── vite.config.ts
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── branding/
│       ├── bricklar-icon.svg
│       └── bricklar-logo.svg
├── supabase/
│   └── functions/
│       ├── create-user/index.ts
│       └── delete-user/index.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    ├── index.css
    ├── vite-env.d.ts
    ├── app/
    │   ├── providers.tsx
    │   └── router.tsx
    ├── assets/
    ├── layouts/
    │   ├── AdminLayout.tsx
    │   ├── CourierLayout.tsx
    │   └── AuthLayout.tsx
    ├── pages/
    │   ├── admin/
    │   │   ├── AuditPage.tsx
    │   │   ├── BranchesPage.tsx
    │   │   ├── BusDirectoryPage.tsx
    │   │   ├── DailyClosurePage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── MaintenancePage.tsx
    │   │   ├── ReportsPage.tsx
    │   │   ├── SettingsPage.tsx
    │   │   ├── SettlementsPage.tsx
    │   │   ├── TaskDetailPage.tsx
    │   │   ├── TasksPage.tsx
    │   │   ├── UsersPage.tsx
    │   │   └── WorkdaysPage.tsx
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── RecoverPasswordPage.tsx
    │   │   ├── ResetPasswordPage.tsx
    │   │   └── SuspendedPage.tsx
    │   └── courier/
    │       ├── BusesPage.tsx
    │       ├── FundsPage.tsx
    │       ├── HomePage.tsx
    │       ├── NotificationsPage.tsx
    │       ├── RoutePage.tsx
    │       ├── SettlementPage.tsx
    │       ├── TaskDetailPage.tsx
    │       └── TasksPage.tsx
    ├── modules/
    │   ├── auth/
    │   │   ├── AuthContext.tsx
    │   │   ├── AuthContextDefinition.ts
    │   │   ├── useAuth.ts
    │   │   └── RouteGuard.tsx
    │   ├── branches/
    │   │   ├── components/
    │   │   │   └── BranchFormModal.tsx
    │   │   ├── hooks/
    │   │   │   └── useBranches.ts
    │   │   ├── services/
    │   │   │   └── branchesService.ts
    │   │   └── types/
    │   │       └── branch.types.ts
    │   ├── buses/
    │   │   ├── components/
    │   │   │   └── BusFormModal.tsx
    │   │   ├── hooks/
    │   │   │   └── useBuses.ts
    │   │   ├── services/
    │   │   │   └── busesService.ts
    │   │   └── types/
    │   │       └── bus.types.ts
    │   ├── courier/
    │   │   ├── components/
    │   │   │   ├── CompleteTaskModal.tsx
    │   │   │   └── StartWorkdayModal.tsx
    │   │   ├── hooks/
    │   │   │   └── useCouriers.ts
    │   │   ├── services/
    │   │   │   └── courierService.ts
    │   │   └── types/
    │   │       └── courier.types.ts
    │   ├── settlements/
    │   │   ├── hooks/
    │   │   │   └── useSettlements.ts
    │   │   ├── services/
    │   │   │   └── settlementsService.ts
    │   │   └── types/
    │   │       └── settlement.types.ts
    │   ├── tasks/
    │   │   ├── components/
    │   │   │   ├── AssignCourierModal.tsx
    │   │   │   ├── TaskFilters.tsx
    │   │   │   ├── TaskFormModal.tsx
    │   │   │   ├── TaskHistoryPanel.tsx
    │   │   │   ├── TaskPriorityBadge.tsx
    │   │   │   ├── TaskStatusBadge.tsx
    │   │   │   ├── TaskStatusModal.tsx
    │   │   │   └── TaskTypeBadge.tsx
    │   │   ├── hooks/
    │   │   │   ├── useTask.ts
    │   │   │   └── useTasks.ts
    │   │   ├── services/
    │   │   │   └── tasksService.ts
    │   │   └── types/
    │   │       └── task.types.ts
    │   ├── users/
    │   │   ├── components/
    │   │   │   ├── DeleteUserConfirmModal.tsx
    │   │   │   └── UserFormModal.tsx
    │   │   ├── hooks/
    │   │   │   └── useUsers.ts
    │   │   ├── services/
    │   │   │   └── usersService.ts
    │   │   └── types/
    │   │       └── user.types.ts
    │   └── workdays/
    │       ├── hooks/
    │       │   ├── useWorkday.ts
    │       │   └── useWorkdays.ts
    │       ├── services/
    │       │   └── workdaysService.ts
    │       └── types/
    │           └── workday.types.ts
    └── shared/
        ├── lib/
        │   ├── database.types.ts
        │   ├── queryClient.ts
        │   └── supabaseClient.ts
        ├── types/
        │   └── index.ts
        ├── utils/
        │   └── cn.ts
        └── validations/
            └── schemas.ts
```

---

## 2. Inventario de Componentes React

### 2.1 Clasificación de Componentes

```
Clasificación de Salud del Código:
✅ Reutilizable sin cambios
⚠ Necesita refactor (Estilos/Tamaño)
❌ Candidato a reemplazo
🗑 Candidato a eliminar
```

| Componente | Ubicación | Propósito | Tamaño | Complejidad | Estado | Clasificación |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `TaskStatusBadge` | `src/modules/tasks/components/TaskStatusBadge.tsx` | Muestra estado visual de tarea | 2.6 kB (~80 líneas) | Baja | Funcional | ⚠ |
| `TaskPriorityBadge` | `src/modules/tasks/components/TaskPriorityBadge.tsx` | Muestra nivel de prioridad | 1.7 kB (~50 líneas) | Baja | Funcional | ⚠ |
| `TaskTypeBadge` | `src/modules/tasks/components/TaskTypeBadge.tsx` | Muestra tipo de gestión (9 tipos) | 1.1 kB (~40 líneas) | Baja | Funcional | ⚠ |
| `TaskFilters` | `src/modules/tasks/components/TaskFilters.tsx` | Filtros combinados de tareas | 6.0 kB (~180 líneas) | Media | Funcional | ⚠ |
| `TaskFormModal` | `src/modules/tasks/components/TaskFormModal.tsx` | Formulario extenso de creación/edición de tareas | 20.0 kB (~520 líneas) | **Muy Alta** | Funcional | ⚠ |
| `TaskStatusModal` | `src/modules/tasks/components/TaskStatusModal.tsx` | Modal de cambio de estado | 6.6 kB (~190 líneas) | Media | Funcional | ⚠ |
| `AssignCourierModal` | `src/modules/tasks/components/AssignCourierModal.tsx` | Modal de asignación de motorizado | 5.3 kB (~140 líneas) | Media | Funcional | ⚠ |
| `TaskHistoryPanel` | `src/modules/tasks/components/TaskHistoryPanel.tsx` | Línea de tiempo de cambios de estado | 4.8 kB (~130 líneas) | Media | Funcional | ⚠ |
| `UserFormModal` | `src/modules/users/components/UserFormModal.tsx` | Modal de creación/edición de usuario | 10.2 kB (~280 líneas) | Alta | Funcional | ⚠ |
| `DeleteUserConfirmModal` | `src/modules/users/components/DeleteUserConfirmModal.tsx` | Modal de baja/anonimización de usuario | 6.0 kB (~150 líneas) | Media | Funcional | ⚠ |
| `BranchFormModal` | `src/modules/branches/components/BranchFormModal.tsx` | Formulario de creación/edición de sucursal | 6.6 kB (~180 líneas) | Media | Funcional | ⚠ |
| `BusFormModal` | `src/modules/buses/components/BusFormModal.tsx` | Formulario de cooperativa de bus | 8.5 kB (~230 líneas) | Media | Funcional | ⚠ |
| `StartWorkdayModal` | `src/modules/courier/components/StartWorkdayModal.tsx` | Modal de apertura de jornada (C$/US$) | 5.1 kB (~150 líneas) | Media | Funcional | ⚠ |
| `CompleteTaskModal` | `src/modules/courier/components/CompleteTaskModal.tsx` | Modal de cierre de entrega con foto/cobro | 9.4 kB (~260 líneas) | Alta | Funcional | ⚠ |
| `RouteGuard` | `src/modules/auth/RouteGuard.tsx` | Guardia de protección de rutas | 2.4 kB (~70 líneas) | Baja | Funcional | ✅ |
| `AppProviders` | `src/app/providers.tsx` | Proveedor global de la aplicación | 0.5 kB (~20 líneas) | Baja | Funcional | ✅ |

---

## 3. Inventario de Layouts

1. **`AdminLayout` (`src/layouts/AdminLayout.tsx` - 8.4 kB):**
   * **Uso:** En todas las rutas `/admin/*`.
   * **Componentes Internos:** Sidebar lateral izquierdo, Topbar superior con menú de perfil y logout, contenedor principal `<Outlet />`.
   * **Dependencias:** `react-router-dom`, `lucide-react`, `@/modules/auth/useAuth`.
   * **Problemas Detectados:** Mezcla clases de Tailwind inline con variables CSS corporativas. El menú móvil utiliza estado interno `useState(isOpen)` en lugar de un componente Drawer reusable.
   * **Oportunidad de Unificación:** Abstraer el Sidebar a un componente autónomo `<AdminSidebar />` y el Topbar a `<AdminHeader />`.

2. **`CourierLayout` (`src/layouts/CourierLayout.tsx` - 5.5 kB):**
   * **Uso:** En todas las rutas `/motorizado/*`.
   * **Componentes Internos:** Topbar superior fijo con marca Bricklar, Bottom Navigation Bar fijo de 5 ítems (`Inicio`, `Tareas`, `Ruta`, `Fondos`, `Liquidación`), contenedor `<Outlet />`.
   * **Dependencias:** `react-router-dom`, `lucide-react`, `@/modules/auth/useAuth`.
   * **Problemas Detectados:** Estilos de padding inferior (`pb-safe`, `mb-nav`) declarados mediante clases personalizadas en CSS en lugar de tokens del Design System.
   * **Oportunidad de Unificación:** Extraer el componente `<CourierBottomNav />`.

3. **`AuthLayout` (`src/layouts/AuthLayout.tsx` - 0.2 kB):**
   * **Uso:** En rutas públicas de autenticación (`/login`, `/recuperar-contrasena`).
   * **Componentes Internos:** Envoltorio pasivo de `<Outlet />`.
   * **Problemas Detectados:** Ninguno.

---

## 4. Inventario de Páginas

| Ruta | Página / Componente | Layout | Tamaño | Complejidad | Observaciones Visuales & Técnicas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `LoginPage.tsx` | `AuthLayout` | 11.3 kB (~310 L) | Alta | Rediseñada con branding Bricklar; usa flexbox 50/50 en escritorio. |
| `/recuperar-contrasena` | `RecoverPasswordPage.tsx` | `AuthLayout` | 5.0 kB (~140 L) | Media | Tarjeta centralizada limpia; usa `btn-saas-primary`. |
| `/restablecer-contrasena` | `ResetPasswordPage.tsx` | N/A | 5.9 kB (~160 L) | Media | Formulario de cambio de clave con Zod. |
| `/cuenta-suspendida` | `SuspendedPage.tsx` | N/A | 1.2 kB (~40 L) | Baja | Vista pasiva de bloqueo. |
| `/admin` | `DashboardPage.tsx` | `AdminLayout` | 13.2 kB (~360 L) | **Muy Alta** | Utiliza Bento Grid, KPI cards, gráficos y actividad reciente. |
| `/admin/tareas` | `TasksPage.tsx` | `AdminLayout` | 15.6 kB (~430 L) | **Muy Alta** | Tabla principal de tareas, filtros, modo tarjetas/tabla. |
| `/admin/tareas/:id` | `TaskDetailPage.tsx` | `AdminLayout` | 15.6 kB (~420 L) | **Muy Alta** | Vista detallada, historial, montos C$/US$, modales de estado. |
| `/admin/usuarios` | `UsersPage.tsx` | `AdminLayout` | 14.6 kB (~390 L) | Alta | Tabla de usuarios, modales de creación/edición/baja. |
| `/admin/sucursales` | `BranchesPage.tsx` | `AdminLayout` | 6.6 kB (~180 L) | Media | Directorio de sucursales en tarjetas/tabla. |
| `/admin/jornadas` | `WorkdaysPage.tsx` | `AdminLayout` | 11.9 kB (~320 L) | Alta | Lista de jornadas de motorizados con saldos C$/US$. |
| `/admin/liquidaciones` | `SettlementsPage.tsx` | `AdminLayout` | 9.8 kB (~270 L) | Alta | Tabla de liquidaciones, RPC `compute_settlement`. |
| `/admin/cierre-diario` | `DailyClosurePage.tsx` | `AdminLayout` | 7.0 kB (~190 L) | Media | Consolidado diario de caja por sucursal. |
| `/admin/buses` | `BusDirectoryPage.tsx` | `AdminLayout` | 8.8 kB (~240 L) | Media | Directorio de empresas de transporte interurbano. |
| `/admin/reportes` | `ReportsPage.tsx` | `AdminLayout` | 11.3 kB (~310 L) | Alta | Métricas y exportador PDF (`@react-pdf/renderer`) y CSV. |
| `/admin/auditoria` | `AuditPage.tsx` | `AdminLayout` | 7.9 kB (~210 L) | Media | Stream de eventos `audit_logs` con filtros. |
| `/admin/configuracion` | `SettingsPage.tsx` | `AdminLayout` | 8.8 kB (~240 L) | Media | Ajustes globales y tasa de cambio USD/NIO. |
| `/admin/mantenimiento` | `MaintenancePage.tsx` | `AdminLayout` | 7.8 kB (~210 L) | Media | Ping a Supabase y purga de caché de Query. |
| `/motorizado` | `HomePage.tsx` | `CourierLayout` | 12.3 kB (~340 L) | Alta | Tarjeta de jornada, barra flotante de saldo, hero card. |
| `/motorizado/tareas` | `TasksPage.tsx` | `CourierLayout` | 11.1 kB (~300 L) | Alta | Lista móvil de tareas asignadas. |
| `/motorizado/tareas/:id` | `TaskDetailPage.tsx` | `CourierLayout` | 10.2 kB (~280 L) | Alta | Detalle móvil de tarea con botón gigante de acción. |
| `/motorizado/ruta` | `RoutePage.tsx` | `CourierLayout` | 12.6 kB (~350 L) | Alta | Orden de ruta diaria y enlaces de navegación externa. |
| `/motorizado/fondos` | `FundsPage.tsx` | `CourierLayout` | 7.4 kB (~200 L) | Media | Solicitud de adelantos y devoluciones de efectivo. |
| `/motorizado/liquidacion` | `SettlementPage.tsx` | `CourierLayout` | 8.0 kB (~220 L) | Media | Resumen de saldo del motorizado en C$ y US$. |
| `/motorizado/buses` | `BusesPage.tsx` | `CourierLayout` | 5.0 kB (~140 L) | Baja | Vista móvil de contactos de bus con llamada en un toque. |
| `/motorizado/notificaciones`| `NotificationsPage.tsx`| `CourierLayout` | 7.3 kB (~200 L) | Media | Centro de notificaciones del motorizado. |

---

## 5. Inventario de Hooks Personalizados

| Hook | Ubicación | Responsabilidad | Reutilización | Estado | Mejora Sugerida |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `useAuth` | `src/modules/auth/useAuth.ts` | Acceso a sesión, usuario, perfil y rol | Excelente (Global) | Totalmente Limpio | Ninguna |
| `useTasks` | `src/modules/tasks/hooks/useTasks.ts` | Consulta paginada y filtrada de tareas | Alta | Funcional | Añadir sincronización de filtros con la URL (`useSearchParams`). |
| `useTask` | `src/modules/tasks/hooks/useTask.ts` | Obtención de una tarea por ID y mutaciones | Alta | Funcional | Ninguna |
| `useUsers` | `src/modules/users/hooks/useUsers.ts` | Consulta y gestión de perfiles de usuarios | Media | Funcional | Ninguna |
| `useBranches` | `src/modules/branches/hooks/useBranches.ts` | Obtención de sucursales activas | Alta | Funcional | Agregar caché persistente. |
| `useBuses` | `src/modules/buses/hooks/useBuses.ts` | Consulta de empresas de bus y rutas | Media | Funcional | Ninguna |
| `useWorkday` | `src/modules/workdays/hooks/useWorkday.ts` | Estado de la jornada activa del motorizado | Alta | Funcional | Ninguna |
| `useWorkdays` | `src/modules/workdays/hooks/useWorkdays.ts` | Lista de jornadas para administradores | Media | Funcional | Ninguna |
| `useSettlements`| `src/modules/settlements/hooks/useSettlements.ts`| Consulta de liquidaciones y RPC | Alta | Funcional | Ninguna |
| `useCouriers` | `src/modules/courier/hooks/useCouriers.ts` | Lista filtrada de motorizados activos | Alta | Funcional | Ninguna |

---

## 6. Auditoría de Formularios

* **Librería Utilizada:** `react-hook-form` + `@hookform/resolvers/zod` + `zod` para validaciones de esquema.
* **Esquemas Centralizados:** Ubicados en `src/shared/validations/schemas.ts` (Validación de login, tareas, usuarios, sucursales, buses, jornadas y devoluciones de caja).
* **Inconsistencias y Componentes Repetidos:**
  * No existe un componente de campo wrapper `<FormField />` reutilizable. Cada modal vuelve a escribir manualmente el contenedor `<div className="space-y-1.5">`, el `<label>` y el mensaje de error `<p className="text-xs text-destructive">`.
  * La máscara monetaria de Córdobas y Dólares se maneja mediante inputs genéricos `<input type="number">` sin formato visual de miles (`1,500.00`).

---

## 7. Detección de Componentes Inline Duplicados

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DETECCIÓN DE CÓDIGO INLINE REPETIDO                  │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. BOTONES        │ 2. INPUTS         │ 3. BADGES DE ESTADO            │
│ Reescritos en 14  │ Reescritos en 8   │ Múltiples clases de colores    │
│ archivos distintos│ modales de forma  │ aisladas en tablas y listas    │
│ con inline classes│ manual            │ sin usar .badge-saas           │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

1. **Botones Inline:** 14 archivos declaran combinaciones manuales como `className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800"` en lugar de la clase `.btn-saas-primary`.
2. **Campos de Entrada (Inputs):** 8 modales escriben manualmente `className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"` en lugar de la clase `.input-saas`.
3. **Badges de Estado:** En `TasksPage.tsx` y `DashboardPage.tsx`, se escriben spans con colores inline `bg-amber-50 text-amber-700 border-amber-200` en lugar de la clase `.badge-pending`.
4. **Modales:** Todos los modales implementan manualmente el fondo atenuado `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4` en lugar de consumir un componente reutilizable `<Modal />`.

---

## 8. Auditoría de CSS y Tailwind (v4)

### 8.1 Estado del Bloque `@theme` en `src/index.css`
El archivo `src/index.css` cuenta con una definición estructurada de `@theme`, pero contiene remanentes de la paleta magenta previa (`--color-accent: #B90E7C`).

### 8.2 Deuda Técnica Detectada en Estilos
* **Colores Hardcodeados:**
  * Uso de `#181d43` directamente en `CourierHomePage.tsx` y `index.css`.
  * Uso de `#26326b` en comentarios y selectores CSS específicos.
* **Espaciados Heterogéneos:** Mezcla de `p-3`, `p-4`, `p-5`, `p-6` en contenedores de tarjeta sin una regla de padding fija.
* **Border Radius:** Coexistencia no regulada de `rounded-md` (6px), `rounded-lg` (8px), `rounded-xl` (12px) y `rounded-2xl` (16px).

---

## 9. Comparativa de Design Tokens (Código Actual vs Design System V2)

| Token | Estado en Código Actual | Requerido en V2 | Acción Necesaria |
| :--- | :--- | :--- | :--- |
| `--color-primary` | `#26326B` (Azul Marino) | `#26326B` (Azul Marino) | **Mantener** |
| `--color-primary-dark` | No asignado a variable | `#181D43` (Azul Noche) | **Asignar a Token** |
| `--color-accent` | `#B90E7C` (Magenta) | `#0284C7` (Celeste) | **Reemplazar Magenta por Celeste** |
| `--color-background` | `#F8FAFC` (Gris Ultra Claro) | `#F8FAFC` (Gris Ultra Claro) | **Mantener** |
| `--color-surface` | `#FFFFFF` (Blanco Puro) | `#FFFFFF` (Blanco Puro) | **Mantener** |
| `--z-index-scale` | No definida | `z-dropdown: 100` a `z-toast: 700` | **Crear Tokens de Z-Index** |
| `--opacity-scale` | No definida | `disabled: 0.5`, `backdrop: 0.6` | **Crear Tokens de Opacidad** |

---

## 10. Auditoría de Accesibilidad (a11y)

1. **Estado del Foco (`Focus Visible`):**
   * El archivo `index.css` define `:focus-visible { outline: 2px solid #B90E7C; outline-offset: 2px; }`. Debe actualizarse a `#0284C7` (Celeste).
2. **Targets Táctiles en Móviles:**
   * La barra de navegación inferior del motorizado (`CourierLayout.tsx`) y la tarjeta hero (`HomePage.tsx`) sobrepasan los **48px**, lo cual es excelente. Sin embargo, algunos botones pequeños de acción en listas tienen solo 32px de alto.
3. **Atributos ARIA y Lectores de Pantalla:**
   * Los modales no cuentan con los atributos `aria-modal="true"` ni `aria-labelledby`.
   * Los spinners de carga carecen de `aria-live="polite"` o `sr-only` text.

---

## 11. Análisis de Performance y Bundle Size

### 1. Chunks Generados por Vite (`npm run build`)
* `vendor-D6WjEud9.js`: 202.10 kB (gzip: 64.23 kB)
* `supabase-BFEmIboF.js`: 207.13 kB (gzip: 53.45 kB)
* `schemas-B8Qohaef.js`: 95.25 kB (gzip: 27.92 kB)
* `router-CYezpk9Q.js`: 36.63 kB (gzip: 13.27 kB)

### 2. Archivos Extensos
* `TaskFormModal.tsx`: 20.0 kB (~520 líneas) -> Requiere modularizar sub-formularios por tipo de tarea.
* `DashboardPage.tsx`: 13.2 kB (~360 líneas).
* `TasksPage.tsx`: 15.6 kB (~430 líneas).

---

## 12. Arquitectura de Software: Evaluación

* **Estructura y Modularidad:** **Excelente.** La organización por dominios en `src/modules/` (auth, tasks, users, workdays, settlements, branches, buses, courier) separa limpiamente hooks, servicios y tipos.
* **Acoplamiento:** **Bajo.** Ningún componente React realiza llamadas directas a Supabase; todas las peticiones pasan por la capa de `services/`.
* **Cohesión:** **Alta.** Los tipos TypeScript están bien centralizados en `src/shared/types/index.ts` y en los archivos `*.types.ts` de cada módulo.

---

## 13. Matriz de Riesgos Técnicos

| Riesgo Técnico | Impacto | Probabilidad | Prioridad | Mitigación |
| :--- | :---: | :---: | :---: | :--- |
| **Conflicto de Colores en Reemplazo del Magenta:** Que queden botones o bordes con clases inline magenta inadvertidas. | Medio | Alta | **Alta** | Reemplazar las variables `--color-accent` en `index.css` para que retroalimente automáticamente a todas las clases Tailwind. |
| **Ruptura de Formato en Modales Móviles:** Que modales centrados extensos se corten en pantallas pequeñas de motorizados. | Alto | Media | **Alta** | Reemplazar modales en móviles por el componente `<BottomSheet />` desplegable desde abajo. |
| **Inconsistencia de Tipos en Inputs Numéricos:** Errores al convertir strings de dinero a números en transacciones NIO/USD. | Alto | Baja | **Media** | Utilizar el componente estandarizado `<CurrencyInput />` integrado con Zod. |

---

## 14. Plan de Migración Incremental (Fases 0 a 7)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PLAN DE MIGRACIÓN INCREMENTAL V1                     │
├────────────────────────────────────────────────────────────────────────┤
│ Fase 0: Preparación de la Biblioteca de Componentes Atómicos (UI Base)  │
│ Fase 1: Actualización de Tokens de Colores y Estilos en index.css       │
│ Fase 2: Estandarización de Componentes Base (Buttons, Cards, Badges)   │
│ Fase 3: Rediseño de Layouts (AdminLayout, CourierLayout)              │
│ Fase 4: Migración de Pantallas Móviles del Motorizado                 │
│ Fase 5: Migración del Dashboard Administrativo y Tareas               │
│ Fase 6: Migración de Módulos Financieros (Jornadas, Liquidaciones)    │
│ Fase 7: Migración de Pantallas Secundarias y Cierre Final              │
└────────────────────────────────────────────────────────────────────────┘
```

### Detalle de Fases de Migración

#### **Fase 0: Preparación de la Biblioteca Atómica UI**
* **Objetivo:** Crear la carpeta `src/shared/components/ui/` con los componentes atómicos base (`Button.tsx`, `Input.tsx`, `Badge.tsx`, `Card.tsx`, `Modal.tsx`, `Toast.tsx`, `Skeleton.tsx`).
* **Archivos Afectados:** Creación de nuevos archivos en `src/shared/components/ui/`.
* **Criterio de Aceptación:** Componentes creados con TypeScript estricto y exportados limpiamente.

#### **Fase 1: Tokens y Variables CSS**
* **Objetivo:** Reemplazar las variables del bloque `@theme` en `src/index.css`, asignando Azul Marino (`#26326B`), Azul Noche (`#181D43`) y Celeste (`#0284C7`), eliminando el magenta.
* **Archivos Afectados:** `src/index.css`.
* **Criterio de Aceptación:** `npm run build` y `npm run lint` limpios; aplicación adopta instantáneamente los nuevos colores corporativos.

#### **Fase 2: Estandarización de Componentes Base**
* **Objetivo:** Reemplazar las clases inline repetidas de botones, tarjetas, inputs y badges en los modales de la carpeta `src/modules/*/components/`.
* **Archivos Afectados:** Componentes dentro de `src/modules/*/components/`.
* **Criterio de Aceptación:** Eliminación del 100% de clases hexadecimales inline.

#### **Fase 3: Layouts y Navegación**
* **Objetivo:** Rediseñar `AdminLayout.tsx` (Sidebar/Topbar) y `CourierLayout.tsx` (Header/Bottom Nav).
* **Archivos Afectados:** `src/layouts/AdminLayout.tsx`, `src/layouts/CourierLayout.tsx`.
* **Criterio de Aceptación:** Navegación fluida y responsiva comprobada en resoluciones de escritorio y móvil.

#### **Fase 4: Pantallas del Motorizado**
* **Objetivo:** Migrar las 8 pantallas del módulo móvil del motorizado (`/motorizado/*`).
* **Archivos Afectados:** `src/pages/courier/*`.
* **Criterio de Aceptación:** Operación táctil comprobada a una sola mano; barra flotante de efectivo integrada.

#### **Fase 5: Dashboard Administrativo y Tareas**
* **Objetivo:** Migrar `DashboardPage.tsx`, `TasksPage.tsx`, `TaskDetailPage.tsx` y `UsersPage.tsx`.
* **Archivos Afectados:** `src/pages/admin/DashboardPage.tsx`, `TasksPage.tsx`, `TaskDetailPage.tsx`, `UsersPage.tsx`.
* **Criterio de Aceptación:** Bento Grids limpios y tablas SaaS optimizadas.

#### **Fase 6: Módulos Financieros**
* **Objetivo:** Migrar `SettlementsPage.tsx`, `WorkdaysPage.tsx` y `DailyClosurePage.tsx`.
* **Archivos Afectados:** `src/pages/admin/SettlementsPage.tsx`, `WorkdaysPage.tsx`, `DailyClosurePage.tsx`.
* **Criterio de Aceptación:** Cálculo y despliegue impecable de saldos C$ y US$.

#### **Fase 7: Pantallas Secundarias y Cierre**
* **Objetivo:** Migrar `BranchesPage.tsx`, `BusDirectoryPage.tsx`, `ReportsPage.tsx`, `AuditPage.tsx`, `SettingsPage.tsx` y `MaintenancePage.tsx`.
* **Archivos Afectados:** `src/pages/admin/*` restantes.
* **Criterio de Aceptación:** Validación final del sistema con `npm run lint`, `npx tsc --noEmit` y `npm run build` con 0 errores.

---

> ✋ **DECLARACIÓN DE CONTROL:** La auditoría técnica del código fuente existente ha finalizado. **No se ha modificado ni creado ningún archivo en el proyecto.** El archivo `PROJECT_CODE_AUDIT_V1.md` ha sido generado exclusivamente como documento de referencia. Me detengo en este punto a la espera de tu autorización explícita para dar inicio a la Fase 0/Fase 1.
