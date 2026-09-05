# Registro de Cambios (Changelog) - Bricklar Gestor

Todos los cambios notables en este proyecto se documentan en este archivo. El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [1.3.0] - 2026-09-05

### Añadido
* **Monitoreo GPS en Vivo y Mapeo Avanzado:**
  * Integración completa de mapas interactivos con Leaflet, soporte multicapa (Esri Callejero, OpenStreetMap) y sin dependencias comerciales costosas ni marcas de agua.
  * Filtros interactivos por estado en tiempo real (`En Ruta`, `En Gestión`, `Pendiente`, `Completada`, `Todos`) con auto-centrado dinámico y cálculo automático de límites (`fitBounds`).
  * Visualización de rastro GPS histórico con trazado de polilíneas y puntos cronológicos de recorrido.
  * Modo Pantalla Completa con panel de telemetría flotante para salas de operaciones y control logístico.
* **Extractor Universal de Coordenadas Geográficas:**
  * Motor inteligente en `geoHelper.ts` que extrae automáticamente coordenadas de cualquier formato de enlace de Google Maps y Waze (`!3d...!4d...`, `@lat,lng`, `q=lat,lng`, `query=`, `destination=`, `daddr=`, etc.) y pares decimales directos.
  * Extracción y asignación automática de coordenadas en `tasksService.ts` tanto en creación como en actualización de tareas.
  * Indicador visual en tiempo real en el formulario de creación de tareas (`TaskFormModal.tsx`) que confirma la detección de coordenadas para visualización en el mapa web.
* **Sincronización en Tiempo Real de Hoja de Ruta:**
  * Reordenamiento táctil con Drag & Drop en la app del motorizado sincronizado instantáneamente al panel administrativo con persistencia en base de datos.
  * Avisos informativos optimizados sin solapamientos en pantalla.

---

## [1.2.0] - 2026-08-25

### Añadido
* **Módulo de Flota y Mantenimiento:**
  * Control de inventario de vehículos (motos, camionetas), registro de kilometraje inicial y actual.
  * Programación de mantenimientos preventivos y correctivos con alertas de vencimiento por kilometraje o fecha.
* **Directorio Interurbano de Buses:**
  * Catálogo de cooperativas, terminales de salida/llegada, horarios de salidas y tarifas.
  * Botón de llamada telefónica de un toque para coordinación logística de encomiendas.
* **PWA v1.3.0 con Soporte Offline:**
  * Service Worker con precache de activos estáticos (107 entradas).
  * Cola de peticiones offline (`offlineQueue.ts`) en IndexedDB para sincronización diferida al recuperar conexión.

---

## [1.1.0] - 2026-08-15

### Añadido
* **Control Financiero Multimoneda y Arqueo en Vivo:**
  * Liquidaciones con soporte nativo para Córdobas (NIO) y Dólares estadounidenses (USD).
  * Detección de saldos arrastrados de días anteriores (`pending_balances`).
  * Registro clasificado de motivos de ajuste contable (*Faltante en nómina*, *A reponer mañana*, *Sobrante por propina*, *Redondeo de cambio*).
  * Liquidación forzosa por contingencia administrativa (`AdminForceSettlementModal`).
  * Generación y descarga de comprobantes de liquidación en formato PDF con `@react-pdf/renderer` y exportación a CSV.

---

## [1.0.0] - 2026-08-01

### Añadido
* **Lanzamiento Base de Bricklar Gestor:**
  * Design System oficial con Tailwind CSS v4 y variables CSS globales (`src/index.css`).
  * Módulo de autenticación con RBAC (`general_admin`, `junior_admin`, `courier`) y recuperación de contraseña.
  * Edge Functions de Supabase (`create-user`, `delete-user`) y RPCs de base de datos (`generate_task_code`, `compute_settlement`).
  * Módulo de gestión de tareas con formularios inteligentes por tipo de servicio.
  * Panel de motorizado optimizado para dispositivos móviles con tarjeta de siguiente destino y barra flotante de efectivo.
