# Arquitectura del Sistema: Bricklar Gestor

> **Documentación Técnica de la Arquitectura de Software, Datos y Despliegue**

---

## 1. Stack Tecnológico

* **Frontend UI Framework:** React 18.3 + TypeScript 6.0
* **Build Tool & Dev Server:** Vite 8.2 (con división manual de chunks)
* **Estilos & UI System:** Tailwind CSS v4 + Variables CSS (Design Tokens Bricklar)
* **Iconografía:** Lucide React
* **Gestión de Formularios:** React Hook Form + Validaciones Zod
* **Estado Async & Caché:** TanStack Query v5 (React Query)
* **Enrutamiento:** React Router v7 con Carga Perezosa (`React.lazy`)
* **Generación de Reportes:** `@react-pdf/renderer` + Exportador CSV
* **Backend BaaS:** Supabase (PostgreSQL 14.5 + Auth + Edge Functions)
* **Seguridad BD:** Row Level Security (RLS) basado en roles y sucursales
* **Despliegue Frontend:** Vercel / SPA Routing Rewrite

---

## 2. Estructura del Proyecto

```
GESTOR DE TAREAS/
├── .env.example              # Plantilla de variables de entorno
├── index.html                # HTML entrypoint con meta-tags móviles
├── package.json              # Dependencias y scripts de construcción
├── vite.config.ts            # Configuración de Vite y optimización de chunks
├── vercel.json               # Reglas de enrutamiento SPA para Vercel
├── public/
│   └── branding/             # Logotipos e isotipos SVG de Bricklar
├── supabase/
│   └── functions/            # Edge Functions de Supabase (TypeScript / Deno)
│       ├── create-user/      # Función para creación de usuarios via Admin API
│       └── delete-user/      # Función para desactivación/anonimización
└── src/
    ├── main.tsx              # Punto de entrada de React
    ├── index.css             # Design Tokens corporativos y utilidades CSS
    ├── app/                  # Proveedores globales y AppRouter
    ├── layouts/              # Layouts principales (AdminLayout, CourierLayout)
    ├── pages/                # Vistas principales (Admin, Auth, Courier)
    ├── modules/              # Módulos de dominio (Auth, Tasks, Users, Workdays, Settlements, Buses, Branches)
    └── shared/               # Utilidades, componentes UI base, tipos globales y cliente de Supabase
```

---

## 3. Modelo de Autenticación y Control de Acceso por Roles (RBAC)

La aplicación utiliza Supabase Auth integrado con la tabla `profiles` y la función personalizada `get_my_role()`.

### Roles del Sistema

1. **`general_admin` (Administrador General):**
   * Acceso total sin restricciones a todos los módulos, reportes, usuarios, sucursales, auditoría, cierres y mantenimiento.
2. **`junior_admin` (Administrador Junior / Operativo):**
   * Acceso a gestión de tareas, control de jornadas, directorio de buses y liquidaciones de sucursal. Restringido de gestión de usuarios, auditoría y sucursales.
3. **`courier` (Motorizado / Repartidor):**
   * Acceso exclusivo al panel móvil (`/motorizado`), vista de tareas asignadas, ruta diaria, recepción/entrega de fondos y firma de liquidaciones.

### Guardia de Rutas (`RouteGuard.tsx`)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant R as Router Guard
    participant A as AuthContext
    participant S as Supabase Session

    U->>R: Solicita acceder a /admin/usuarios
    R->>A: Consulta usuario y rol activo
    alt No autenticado
        A-->>R: Sesión nula
        R-->>U: Redirige a /login
    alt Rol no autorizado (ej. courier)
        A-->>R: Rol = courier
        R-->>U: Redirige a /motorizado
    else Rol Autorizado (general_admin)
        A-->>R: Rol = general_admin
        R-->>U: Renderiza AdminUsersPage
    end
```

---

## 4. Base de Datos y Políticas RLS

La base de datos PostgreSQL en Supabase opera con políticas de seguridad a nivel de filas (**RLS - Row Level Security**).

### Tablas Principales

| Tabla | Descripción |
| :--- | :--- |
| `profiles` | Perfiles de usuario vinculados a `auth.users` |
| `branches` | Sucursales de operación |
| `tasks` | Registro de tareas y entregas |
| `task_status_history` | Trazabilidad e historial de cambios de estado |
| `workdays` | Registro de jornadas laborales de motorizados |
| `cash_movements` | Movimientos de efectivo (adelantos, devoluciones, cobros, gastos) |
| `settlements` | Liquidaciones consolidadas multimoneda (NIO/USD) |
| `daily_closures` | Cierres diarios consolidando efectivo por sucursal |
| `bus_companies`, `bus_routes` | Directorio de empresas de transporte y rutas |
| `audit_logs` | Eventos de auditoría del sistema |

### Funciones Almacenadas RPC (PostgreSQL)

1. **`generate_task_code(p_branch_code, p_task_type, p_branch_id)`**: Genera de forma atómica el código secuencial de tarea (ej: `MGA-ENT-00142`).
2. **`compute_settlement(p_workday_id)`**: Consolida matemáticamente los cobros, gastos, adelantos y devoluciones de la jornada, calculando el saldo final en NIO y USD.
3. **`log_audit_event(...)`**: Registra eventos de auditoría de forma inmutable.

---

## 5. Edge Functions

Ubicadas en `supabase/functions/`:

* **`create-user/index.ts`**: Invoca `supabase.auth.admin.createUser()` utilizando la clave Service Role para registrar un nuevo usuario con credenciales iniciales y crear su perfil y asignaciones de sucursal sin cerrar la sesión del administrador actual.
* **`delete-user/index.ts`**: Invoca `supabase.auth.admin.deleteUser()` para remover o desactivar la cuenta del usuario, garantizando la anonimización de datos sensibles en el perfil.

---

## 6. Variables de Entorno

Configuradas en `.env.local` (y en el proveedor de hosting Vercel):

```env
# Públicas (Expuestas en Cliente)
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_APP_URL=https://gestor.bricklar.com
VITE_APP_NAME=Bricklar Gestor
VITE_DEFAULT_TIMEZONE=America/Managua

# Secretas (Exclusivas de Supabase Edge Functions Secrets)
# SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
```
