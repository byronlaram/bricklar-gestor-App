# BRICKLAR GESTOR
# RESET PARA NUEVO CLIENTE — INFORME DE AUDITORÍA Y PREPARACIÓN SEGURA

> **Estado**: AUDITORÍA Y ESTRATEGIA REVISADAS CON RETENCIÓN DE 1 ADMINISTRADOR GENERAL Y SINCRONIZACIÓN DE EMAIL DE AUTENTICACIÓN. NINGÚN DATO HA SIDO ELIMINADO NI MODIFICADO.  
> **Fecha**: 9 de Agosto, 2026  
> **Proyecto**: Bricklar Gestor (`GestorDeTareasApp`)

---

# DECISIONES APROBADAS Y DEFINITIVAS

El usuario ha revisado la auditoría y ha aprobado las siguientes resoluciones definitivas para el reset de producción:

1. **Administrador General Inicial**: **CONSERVAR EXACTAMENTE 1 ADMINISTRADOR GENERAL** (`admin@gestorops.com`, ID `11d5ac93-ede7-4b86-a4bd-20939253e2d0`). Esta cuenta servirá como acceso inicial entregado al nuevo cliente.
2. **Personalización por el Cliente**: Tras la entrega, el nuevo cliente podrá personalizar en su primer ingreso su **Nombre completo**, **Apodo/Nombre corto**, **Teléfono**, **Correo electrónico** y **Contraseña** desde la pantalla de Configuración.
3. **Sucursales de Prueba**: **ELIMINAR**. Se eliminará la sucursal de prueba "Managua - MGA". Estado posterior esperado: `branches = 0`. El Administrador General creará la primera sucursal oficial en `/admin/sucursales`.
4. **Motorizados de Prueba**: **ELIMINAR**. Se eliminarán las 6 cuentas de motorizados registradas durante el desarrollo (`cristhianfisher`, `david`, `jonathan`, `byron`, `eveling`, `moto_test_01`). Estado posterior esperado: `motorizados = 0`.
5. **Audit Logs de Pruebas**: **ELIMINAR**. Limpiar completamente el historial de trazabilidad de pruebas (`audit_logs = 0`).
6. **Configuración Inicial de Kilometraje**: **ACTIVADA + PERMITIR "KILOMETRAJE NO DISPONIBLE"** (`enabled: true`, `allow_not_available: true`). Valores *factory default* editables posteriormente.
7. **Datos Base del Producto**: **CONSERVAR** los 20 destinos departamentales y las 8 rutas de buses interurbanos, confirmados como catálogo geográfico y de transporte genérico reutilizable en Nicaragua.
8. **Numeraciones Operativas**: **REINICIAR** vaciando la tabla `task_sequences` para que la primera tarea creada por el nuevo cliente comience en `0001`.

---

## 1. Resumen Ejecutivo y Aritmética del Reset

### Objetivo del Reset
Entregar una instancia limpia de **Bricklar Gestor** a un nuevo cliente comercial, conservando únicamente **1 Administrador General de acceso inicial** y eliminando el 100% de las operaciones ficticias, sucursales de pruebas y cuentas de motorizados de desarrollo, sin alterar la estructura técnica ni el código fuente.

### Desglose Aritmético Exacto del Reset
- **Registros Operativos a Eliminar**: **116 registros**
  - Tareas (`tasks`): 19
  - Asignaciones de tareas (`task_assignments`): 20
  - Historial de estados (`task_status_history`): 57
  - Jornadas de trabajo (`workdays`): 6
  - Movimientos de caja (`cash_movements`): 11
  - Logs de auditoría de pruebas (`audit_logs`): 3
- **Registros Estructurales/Usuarios a Eliminar**: **14 registros**
  - Perfiles de motorizados de pruebas (`profiles`): 6
  - Asignaciones a sucursal Managua (`user_branches`): 7
  - Sucursal de prueba Managua (`branches`): 1
  - Asignaciones de rol a eliminar (`user_roles`): **0** *(El único registro de `user_roles` pertenece al Admin General conservado)*
- **Fórmula Matemática Total a Eliminar**:  
  `116 (operativos) + 6 (perfiles) + 7 (user_branches) + 1 (sucursal) + 0 (user_roles) = 130 registros a eliminar`

### Desglose Aritmético Exacto a Conservar
- **Registros Base/Estructura a Conservar**: **38 registros**
  - Perfil del Administrador General (`profiles`): 1 (`admin@gestorops.com`)
  - Rol asignado al Administrador General (`user_roles`): 1 (`general_admin`)
  - Catálogo de roles del sistema (`roles`): 3 (`general_admin`, `junior_admin`, `courier`)
  - Catálogo de destinos/departamentos (`destinations`): 20
  - Directorio de rutas de buses (`bus_routes`): 8
  - Ajustes de versión y sistema (`app_settings`): 5 *(Restableciendo kilometraje a fábrica)*
- **Fórmula Matemática Total a Conservar**:  
  `1 (profile) + 1 (user_role) + 3 (roles) + 20 (destinations) + 8 (bus_routes) + 5 (app_settings) = 38 registros a conservar`

### Confirmación Absoluta de Seguridad
> [!IMPORTANT]
> **NO SE HA EJECUTADO NINGÚN BORRADO, TRUNCATE NI MODIFICACIÓN.**  
> El entorno de desarrollo, las credenciales actuales y la base de datos permanecen 100% intactos.

---

## 2. Inventario de Base de Datos y Proyección Post-Reset

| Tabla | Propósito | Registros Actuales | Clasificación | Estado Posterior Esperado |
| :--- | :--- | :---: | :---: | :---: |
| `tasks` | Tareas de envío/entrega | 19 | LIMPIAR | **0** |
| `task_assignments` | Asignaciones de tareas | 20 | LIMPIAR | **0** |
| `task_status_history` | Trazabilidad de estados de tarea | 57 | LIMPIAR | **0** |
| `workdays` | Jornadas operativas de motorizados | 6 | LIMPIAR | **0** |
| `cash_movements` | Movimientos de ingresos/egresos | 11 | LIMPIAR | **0** |
| `cash_transfers` | Transferencias de efectivo | 0 | LIMPIAR | **0** |
| `settlements` | Liquidaciones de jornada | 0 | LIMPIAR | **0** |
| `settlement_adjustments` | Ajustes en liquidaciones | 0 | LIMPIAR | **0** |
| `daily_closures` | Cierres diarios de sucursal | 0 | LIMPIAR | **0** |
| `financial_movements` | Movimientos contables | 0 | LIMPIAR | **0** |
| `exchange_rates` | Histórico de tasa de cambio | 0 | LIMPIAR | **0** |
| `notifications` | Notificaciones internas | 0 | LIMPIAR | **0** |
| `notification_preferences` | Preferencias de notificación | 0 | LIMPIAR | **0** |
| `audit_logs` | Logs de auditoría de pruebas | 3 | LIMPIAR | **0** |
| `profiles` | Perfiles de usuario de desarrollo | 7 | LIMPIAR 6 / CONSERVAR 1 | **1** (Admin General) |
| `user_roles` | Permisos asignados | 1 | CONSERVAR 1 | **1** (Admin General) |
| `user_branches` | Relaciones usuario-sucursal | 7 | LIMPIAR | **0** |
| `courier_branch_assignments` | Asignaciones de motorizados | 0 | LIMPIAR | **0** |
| `branches` | Sucursales de prueba ("Managua") | 1 | LIMPIAR | **0** |
| `task_sequences` | Secuencias de códigos por sucursal | 0 | LIMPIAR | **0** |
| `app_settings` | Ajustes del sistema | 5 | CONSERVAR | **5** (Valores reset) |
| `roles` | Catálogo de roles del sistema | 3 | CONSERVAR | **3** |
| `destinations` | Departamentos y municipios de Nicaragua | 20 | CONSERVAR | **20** |
| `bus_routes` | Directorio de rutas interurbanas | 8 | CONSERVAR | **8** |
| `bus_schedules` | Horarios de salida de buses | 0 | CONSERVAR | **0** |
| `transport_services` | Empresas de transporte | 0 | CONSERVAR | **0** |

---

## 3. Usuarios y Profiles (Retención del Admin General)

Se conservará únicamente el perfil del Administrador General:
- **`admin@gestorops.com`** (ID: `11d5ac93-ede7-4b86-a4bd-20939253e2d0` | Role: `general_admin`)

Se eliminarán los 6 perfiles de motorizados de pruebas:
- `cristhianfisher@gmail.com`
- `david@gestorops.com`
- `jonathan@gestorops.com`
- `byron@gestorops.com`
- `eveling@gestorops.com`
- `moto_test_01@gestorops.com`

---

## 4. Supabase Auth — Limpieza de Cuentas de Pruebas

Para garantizar que no queden identidades huérfanas en `auth.users`:
1. El script SQL borra los 6 `profiles` de motorizados de pruebas sin afectar el ID del Administrador General (`WHERE id != '11d5ac93-ede7-4b86-a4bd-20939253e2d0'`).
2. Se eliminan las 6 cuentas correspondientes de `auth.users` utilizando el Dashboard de Supabase (**Authentication → Users → Delete User**) o la API de Administración excluyendo explícitamente el UUID del Administrador General (`11d5ac93-ede7-4b86-a4bd-20939253e2d0`).

---

## 5. Auditoría Técnica de la Sincronización del Cambio de Email

Se auditó el mecanismo de actualización de correo electrónico para asegurar que **Supabase Auth** sea la fuente autoritativa sin generar estados inconsistentes entre `auth.users.email` y `public.profiles.email`:

### Mecanismo de Sincronización Real
1. **Frontend (`SecuritySettingsTab.tsx`)**: Invoca la API oficial `supabase.auth.updateUser({ email: newEmail.trim() })`.
2. **Confirmación Supabase Auth**: Supabase genera una solicitud de actualización en `auth.users` y envía un correo con enlace de confirmación a la nueva dirección (respetando la configuración de seguridad del proyecto).
3. **Manejador de Eventos Frontend (`AuthContext.tsx`)**: Se implementó la escucha del evento `USER_UPDATED` en el listener `onAuthStateChange`:
   ```typescript
   else if (event === 'USER_UPDATED' && s?.user) {
     if (s.user.email) {
       await supabase.from('profiles').update({ email: s.user.email }).eq('id', s.user.id)
     }
     await loadProfile(s.user.id)
   }
   ```
4. **Comportamiento Post-Confirmación**:
   - Una vez que el usuario confirma el correo en su bandeja de entrada, Supabase Auth actualiza `auth.users.email`.
   - Al renovarse la sesión o recargar la app, `onAuthStateChange` detecta `USER_UPDATED`, actualiza automáticamente `public.profiles.email = s.user.email` y refresca el perfil del usuario.
   - El correo anterior deja de ser válido como credencial de acceso. El Administrador General podrá cerrar sesión e iniciar sesión únicamente utilizando el **NUEVO correo electrónico**.

---

## 6. Procedimiento Definitivo de Entrega (12 Fases)

```
FASE 1: Backup completo (`supabase db dump -f backup_pre_reset.sql`)
   ↓
FASE 2: Ejecución del script Dry-Run de verificación (`reset_for_new_client_dry_run.sql`)
   ↓
FASE 3: Confirmación del ID del Administrador General conservado (`11d5ac93...`)
   ↓
FASE 4: Ejecución del script de reset SQL (`reset_for_new_client.sql`)
   ↓
FASE 5: Eliminación de las 6 cuentas de motorizados de prueba en Supabase Auth
   ↓
FASE 6: Verificación de estado limpio (1 Admin, 0 Sucursales, 0 Tareas, 0 Motorizados)
   ↓
FASE 7: Entrega de credenciales temporales del Administrador General al cliente
   ↓
FASE 8: Primer inicio de sesión del Administrador General del nuevo cliente
   ↓
FASE 9: Personalización del cliente en Configuración (Correo, Nombre, Teléfono, Contraseña)
   ↓
FASE 10: Registro de la primera sucursal oficial del cliente en `/admin/sucursales`
   ↓
FASE 11: Registro de nuevos usuarios y motorizados reales en `/admin/usuarios`
   ↓
FASE 12: Validación funcional completa de operación
```

---

## 7. Sucursales (Soporte de 0 Sucursales)

Se eliminará la sucursal de prueba "Managua" (`branches = 0` y `user_branches = 0`).  
Se validó en código (`BranchesPage.tsx` L65) que el Administrador General puede ingresar a la plataforma con `0` sucursales, ver el Dashboard sin colapsos y navegar directamente a `/admin/sucursales` para registrar la primera sucursal oficial de la empresa.

---

## 8. Configuraciones Operativas

La clave `odometer_settings` en `app_settings` se restablecerá a fábrica:
`{"enabled": true, "allow_not_available": true}`.  
El nuevo Administrador General podrá ajustar este control en cualquier momento desde `Configuración → Operación`.

---

## 9. Catálogos Base del Producto

Permanecen intactos:
- **`destinations` (20)**: Departamentos y municipios de Nicaragua.
- **`bus_routes` (8)**: Cooperativas y terminales de buses interurbanos.

---

## 10. Numeraciones Operativas

La tabla `task_sequences` se vacía a `0` registros. Al crear la primera sucursal real, el generador asignará el código inicial `0001`.

---

## 11. Resultados del Dry-Run

La ejecución del script `supabase/scripts/reset_for_new_client_dry_run.sql` reporta:

```text
========================================================================
   BRICKLAR GESTOR - DRY-RUN (CONSERVAR 1 ADMIN GENERAL INICIAL)       
========================================================================
1. REGISTROS OPERATIVOS A ELIMINAR (PRUEBAS):
   - tasks                     : Actual 19 | Se eliminarán 19 | Permanecerían 0
   - task_assignments          : Actual 20 | Se eliminarán 20 | Permanecerían 0
   - task_status_history       : Actual 57 | Se eliminarán 57 | Permanecerían 0
   - workdays                  : Actual 6  | Se eliminarán 6  | Permanecerían 0
   - cash_movements            : Actual 11 | Se eliminarán 11 | Permanecerían 0
   - audit_logs                : Actual 3  | Se eliminarán 3  | Permanecerían 0
------------------------------------------------------------------------
2. USUARIOS Y ASIGNACIONES (CONSERVANDO 1 ADMIN GENERAL):
   - profiles                  : Actual 7  | Se eliminarán 6 (Motorizados) | Conservar 1 (Admin General)
   - user_roles                : Actual 1  | Se eliminarán 0 | Conservar 1 (Rol Admin General)
   - user_branches             : Actual 7  | Se eliminarán 7 (Vínculos a Managua) | Permanecerían 0
   - branches (Managua)        : Actual 1  | Se eliminarán 1 | Permanecerían 0
   - task_sequences            : Actual 0  | Se eliminarán 0 | Permanecerían 0
------------------------------------------------------------------------
3. ESTRUCTURA Y CATÁLOGOS BASE A CONSERVAR (PRODUCTO REUTILIZABLE):
   - app_settings              : Actual 5  | Conservar 5 (Kilometraje reset a true/true)
   - roles (Catálogo)          : Actual 3  | Conservar 3
   - destinations (Catálogo)   : Actual 20 | Conservar 20
   - bus_routes (Directorio)   : Actual 8  | Conservar 8
========================================================================
TOTAL DE REGISTROS A ELIMINAR  : 130
TOTAL DE REGISTROS A CONSERVAR : 38
========================================================================
```

---

## 12. Ubicación de Scripts Preparados

- **Diagnóstico (Dry-Run)**: [reset_for_new_client_dry_run.sql](file:///c:/Users/MSI%20Gamer/Documents/ANTIGRAVITY/GESTOR%20DE%20TAREAS/supabase/scripts/reset_for_new_client_dry_run.sql)
- **Script de Eliminación (Reset)**: [reset_for_new_client.sql](file:///c:/Users/MSI%20Gamer/Documents/ANTIGRAVITY/GESTOR%20DE%20TAREAS/supabase/scripts/reset_for_new_client.sql)

---

## 13. Criterios de Aceptación Cumplidos

- [x] La aritmética de registros a eliminar (130) y conservar (38) es exacta y matemáticamente consistente.
- [x] El Administrador General se conserva intacto (`admin@gestorops.com`).
- [x] `user_roles` indica 0 eliminados y 1 conservado (Admin General).
- [x] Las 6 cuentas de motorizados de prueba están marcadas para eliminación.
- [x] La interfaz funciona con `0` sucursales y permite crear la primera sucursal.
- [x] Formulario de cambio de correo electrónico implementado en `SecuritySettingsTab.tsx`.
- [x] Manejador del evento `USER_UPDATED` implementado en `AuthContext.tsx` para sincronización automática de `auth.users.email` → `public.profiles.email`.
- [x] El Dry-Run refleja exactamente las cifras proyectadas.
- [x] El informe y los scripts fueron actualizados.
- [x] **NO se ejecutó el reset ni se eliminó ningún dato.**
