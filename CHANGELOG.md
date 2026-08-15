# Registro de Cambios (Changelog) - Bricklar Gestor

Todos los cambios notables en este proyecto se documentan en este archivo. El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [1.0.0-rc] - 2026-08-01

### Añadido
* **Branding Oficial Bricklar:**
  * Logotipo e isotipo oficial en formato SVG (`public/branding/bricklar-logo.svg` y `public/branding/bricklar-icon.svg`).
  * Definición del Design System oficial con variables CSS globales (`src/index.css`) y configuración `@theme` de Tailwind CSS v4.
  * Componentes visuales centralizados: `.btn-saas-primary`, `.btn-saas-secondary`, `.btn-touch-hero`, `.card-saas`, `.bento-card`, `.metric-card`, `.table-saas`, `.cash-summary-bar`.
* **Módulo de Autenticación y Cuentas:**
  * Pantalla de Iniciar Sesión rediseñada con branding de Bricklar.
  * Flujos de recuperación y restablecimiento de contraseña.
  * Vista para cuentas suspendidas y guardias de seguridad por roles (`general_admin`, `junior_admin`, `courier`).
* **Backend y Edge Functions (Supabase):**
  * Edge Function `create-user` para la creación segura de usuarios mediante Supabase Service Role API.
  * Edge Function `delete-user` para la desactivación y anonimización de cuentas de usuario.
  * RPC PostgreSQL `generate_task_code` para generación atómica de códigos de tareas secuenciales por sucursal.
  * RPC PostgreSQL `compute_settlement` para cálculo consolidado de liquidaciones multimoneda (NIO/USD).
* **Módulo de Operaciones y Motorizados:**
  * Dashboard de Administrador con métricas KPI, gráficos y accesos rápidos.
  * Dashboard de Motorizado adaptado a dispositivos móviles con tarjeta de siguiente destino y barra flotante de saldo en efectivo.
  * Control de jornadas de trabajo (apertura, entregas de fondos, devoluciones de caja y cierre).
  * Módulo de directorio de buses interurbanos con horarios, rutas y función de llamada rápida de un toque.
  * Sistema de notificaciones internas para motorizados con marcador de lectura.
* **Módulo Financiero y Reportes:**
  * Control de liquidaciones con soporte nativo para Córdobas (NIO) y Dólares (USD).
  * Cierre diario consolidado por sucursal y general.
  * Generación de reportes operacionales en formato PDF con `@react-pdf/renderer` y exportación de datos a CSV.
  * Historial de auditoría de eventos del sistema (`audit_logs`).

### Cambiado
* Actualización de encabezados y barras laterales (`AdminLayout.tsx`, `CourierLayout.tsx`) a la nueva identidad de marca **Bricklar Gestor**.
* Cambio del nombre global de la aplicación a `Bricklar Gestor` en metadatos y cliente de Supabase.

### Verificado
* Verificación tipada mediante `npx tsc --noEmit` completada sin errores (0 errores).
* Compilación de producción con `npm run build` ejecutada exitosamente.
