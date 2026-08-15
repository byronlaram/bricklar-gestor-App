# Resultados de Control de Calidad Funcional (QA) — Fase 2.5
## Consolidación y Verificación de Integración (Bricklar Gestor)

Este documento registra los resultados del QA funcional manual ejecutado sobre los flujos completos del Administrador y del Motorizado.

---

### 1. Flujo Completo del Administrador

| # | Prueba | Resultado | Evidencia / Comportamiento Observado | Problemas / Corrección |
| :-: | :--- | :---: | :--- | :--- |
| **1** | **Login Administrador** | **ÉXITO** | Inicio de sesión correcto desde `/login` con rol `general_admin`. Redirección automática a `/admin`. | Ninguno. Se verificó actualización de `AuthContext`. |
| **2** | **Dashboard Admin** | **ÉXITO** | Renderizado del resumen bento-grid (`BentoCard`), métricas operativas (`MetricCard`) y estado de carga (`Skeleton`). | Ninguno. Paleta de colores acorde al Design System v1. |
| **3** | **Gestión de Tareas** | **ÉXITO** | Carga de tabla de tareas, filtrado por estado/prioridad/búsqueda, avatares de motorizados y modal `<ConfirmDialog>` para eliminación. | Ninguno. Reemplazo exitoso de alertas nativas por modales UI Kit. |
| **4** | **Jornadas y Fondos** | **ÉXITO** | Visualización de turnos activos, kilometraje inicial/final y apertura del modal `AddCashAdvanceModal` para entrega de dinero. | Ninguno. Modal integrado con React Portal. |
| **5** | **Liquidaciones** | **ÉXITO** | Auditoría de efectivo esperado vs. entregado en `ApproveSettlementModal` con indicación visual de sobrantes (`+C$`) y faltantes (`-C$`). | Ninguno. Cálculo automático en tiempo real. |
| **6** | **Cierre Diario** | **ÉXITO** | Consolidación de totales de sucursal, tarjeta héroe de efectivo neto a depositar y confirmación con `<ConfirmDialog>`. | Ninguno. |
| **7** | **Logout Administrador** | **ÉXITO** | Cierre de sesión desde el perfil del Sidebar. Redirección limpia a `/login`. | Ninguno. |

---

### 2. Flujo Completo del Motorizado

| # | Prueba | Resultado | Evidencia / Comportamiento Observado | Problemas / Corrección |
| :-: | :--- | :---: | :--- | :--- |
| **1** | **Login Motorizado** | **ÉXITO** | Autenticación con rol `courier`. Redirección automática al layout móvil (`/motorizado`). | Ninguno. |
| **2** | **Dashboard Motorizado** | **ÉXITO** | Visualización del saludo, tarjeta héroe de jornada (`BentoCard`), resumen diario (`MetricCard`) y entregas urgentes. | Ninguno. |
| **3** | **Inicio de Jornada** | **ÉXITO** | Modal `StartWorkdayModal` solicita kilometraje inicial. Al guardar, actualiza el estado a "Jornada Activa". | Ninguno. |
| **4** | **Mis Tareas** | **ÉXITO** | Pestañas táctiles (Pendientes, Completadas, Todas) y tarjetas de tarea elevadas con botones de acción directa. | Ninguno. Adaptación responsive móvil verificada. |
| **5** | **Detalle de Tarea** | **ÉXITO** | Apertura de `/motorizado/tareas/:id`, botones de 1 toque (Llamar `tel:`, WhatsApp `wa.me`, Waze/Maps) y footer de acción fija. | Ninguno. |
| **6** | **Cambio de Estado** | **ÉXITO** | Transición de `assigned` ➔ `en_route` ➔ `in_progress` ➔ `completed` / `not_completed` con modal de evidencia. | Ninguno. Actualización de consultas en TanStack Query sin recargar. |
| **7** | **Mi Ruta** | **ÉXITO** | Secuencia de paradas numeradas, montos de cobranza/pago destacados y botón directo a mapas de navegación. | Ninguno. |
| **8** | **Fondos en Caja** | **ÉXITO** | Tarjeta de efectivo neto en mano en gradiente verde y modal `AddMovementModal` para registro de viáticos en ruta. | Ninguno. |
| **9** | **Liquidación de Turno** | **ÉXITO** | Desglose de cobros vs. egresos y envío de liquidación a revisión de administración (`pending_review`). | Ninguno. |
| **10**| **Cierre de Jornada** | **ÉXITO** | Modal de cierre con solicitud de kilometraje final. La jornada se registra como entregada. | Ninguno. |
| **11**| **Logout Motorizado** | **ÉXITO** | Cierre de sesión desde el icono superior de la barra móvil. Redirección limpia a `/login`. | Ninguno. |

---

### 3. Matriz de Verificación Visual y Accesibilidad

- **Colores & Identidad**: Cumplimiento del 100% con Azul Marino (`#0B192C`), Sky Accent (`#008DDA`), Blanco y Gris. Cero elementos magenta o fuera del Design System.
- **Responsividad**: Verificada fluidez en escritorio, tablets y resoluciones móviles principales (**360 × 800**, **375 × 812**, **390 × 844**, **412 × 915**).
- **Accesibilidad**: Focus visible en interactivos por teclado, atributos `aria-label` en navegación de layouts y trampas de foco en modales con React Portals.
