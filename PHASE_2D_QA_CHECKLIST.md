# Checklist Manual de Pruebas Funcionales (QA) — Fase 2D
## Módulo del Motorizado (Bricklar Gestor)

Este documento contiene la matriz oficial de pruebas manuales de control de calidad para validar la usabilidad y flujo operativo del motorizado en dispositivos móviles.

---

### 1. Pruebas de Autenticación y Sesión

- [ ] **Prueba 1: Inicio de sesión del motorizado**
  - **Objetivo**: Verificar que el repartidor pueda autenticarse correctamente desde la pantalla de Login y ser redirigido a `/motorizado`.
  - **Pasos**:
    1. Abrir la aplicación en un dispositivo móvil o simulador (ej. 390 × 844).
    2. Ingresar credenciales del rol `courier`.
    3. Presionar "Iniciar Sesión".
  - **Resultado Esperado**: Redirección exitosa al Dashboard Móvil del Motorizado (`/motorizado`) mostrando el saludo personalizado y el estado de jornada.
  - **Estado**: **Pendiente**

- [ ] **Prueba 2: Cierre de sesión del motorizado**
  - **Objetivo**: Confirmar el cierre de sesión seguro mediante el botón en el header superior.
  - **Pasos**:
    1. Presionar el icono de salir (LogOut) en la barra superior derecha del layout.
  - **Resultado Esperado**: Destrucción de la sesión en `AuthContext` y redirección inmediata a `/login`.
  - **Estado**: **Pendiente**

---

### 2. Pruebas de Jornada y Fondos

- [ ] **Prueba 3: Apertura de jornada**
  - **Objetivo**: Validar el registro del kilometraje inicial al comenzar el turno.
  - **Pasos**:
    1. En el Dashboard (`/motorizado`), presionar "Iniciar Jornada de Hoy".
    2. En el modal `StartWorkdayModal`, ingresar el kilometraje inicial (ej. `45200`).
    3. Presionar "Confirmar Inicio".
  - **Resultado Esperado**: La tarjeta héroe se actualiza a "Jornada Activa" con el kilometraje ingresado y se habilita la recepción de entregas.
  - **Estado**: **Pendiente**

- [ ] **Prueba 4: Recepción de fondo inicial / adelantos**
  - **Objetivo**: Verificar que el dinero entregado por administración se refleje en la caja del motorizado.
  - **Pasos**:
    1. Entrar a la pestaña "Fondos" (`/motorizado/fondos`).
    2. Verificar el valor de "Fondos Recibidos".
  - **Resultado Esperado**: El saldo de efectivo neto en mano muestra la suma del fondo inicial más los adelantos otorgados en caja central.
  - **Estado**: **Pendiente**

---

### 3. Pruebas de Operación y Entregas

- [ ] **Prueba 5: Visualización del Dashboard**
  - **Objetivo**: Confirmar el despliegue correcto de las tarjetas de métricas del día.
  - **Pasos**:
    1. Navegar a la pantalla de Inicio (`/motorizado`).
  - **Resultado Esperado**: Visualización clara de "Por Entregar", "Completadas", "Recaudado" y la lista de las 3 tareas más urgentes.
  - **Estado**: **Pendiente**

- [ ] **Prueba 6: Consulta de Lista de tareas**
  - **Objetivo**: Validar la filtración por pestañas y búsqueda táctil.
  - **Pasos**:
    1. Ir a "Mis Tareas" (`/motorizado/tareas`).
    2. Alternar entre las pestañas "Pendientes", "Completadas" y "Todas".
    3. Escribir el nombre de un cliente en la barra de búsqueda.
  - **Resultado Esperado**: Filtrado instantáneo sin recargas de página mostrando las tarjetas elevadas con badges de prioridad y tipo.
  - **Estado**: **Pendiente**

- [ ] **Prueba 7: Apertura del detalle de tarea**
  - **Objetivo**: Inspeccionar la información completa de la entrega.
  - **Pasos**:
    1. Tocar una tarjeta de tarea en la lista.
  - **Resultado Esperado**: Apertura de `/motorizado/tareas/:id` mostrando la dirección, referencia, botones de contacto rápido (Llamar, WhatsApp, Waze) y footer fijo.
  - **Estado**: **Pendiente**

- [ ] **Prueba 8: Cambio de estado a "En Ruta"**
  - **Objetivo**: Notificar a administración que el motorizado va en camino hacia la dirección.
  - **Pasos**:
    1. En el detalle o en la lista, presionar el botón "Iniciar Ruta".
  - **Resultado Esperado**: El estado de la tarea cambia a `en_route` y la insignia visual se actualiza a tono celeste.
  - **Estado**: **Pendiente**

- [ ] **Prueba 9: Cambio de estado a "En Gestión"**
  - **Objetivo**: Confirmar la llegada del repartidor al lugar de entrega.
  - **Pasos**:
    1. Cuando la tarea esté `en_route`, presionar "Llegué al Lugar (En Gestión)".
  - **Resultado Esperado**: El estado cambia a `in_progress` y el botón del footer cambia a "Finalizar Gestión / Registrar Resultado".
  - **Estado**: **Pendiente**

- [ ] **Prueba 10: Confirmación de entrega y registro de cobro**
  - **Objetivo**: Registrar el resultado exitoso de la entrega y el dinero cobrado.
  - **Pasos**:
    1. Presionar "Finalizar Gestión".
    2. En el modal `CompleteTaskModal`, seleccionar "Completada".
    3. Si requiere cobro, ingresar el monto cobrado y método de pago (Efectivo / Transferencia).
    4. Adjuntar nota u observación si aplica y presionar "Guardar Resultado".
  - **Resultado Esperado**: La tarea pasa a `completed`, el dinero ingresado suma al total recaudado en el Dashboard y la tarea se traslada a la pestaña "Completadas".
  - **Estado**: **Pendiente**

- [ ] **Prueba 11: Registro de incidencias (No Completada)**
  - **Objetivo**: Registrar el fallo en la entrega si el cliente no se encuentra o rechaza el paquete.
  - **Pasos**:
    1. En `CompleteTaskModal`, seleccionar "No Completada".
    2. Seleccionar el motivo de falla (ej. "Cliente ausente").
    3. Guardar el resultado.
  - **Resultado Esperado**: La tarea cambia a `not_completed` y se notifica la incidencia a administración.
  - **Estado**: **Pendiente**

---

### 4. Pruebas de Arqueo y Cierre

- [ ] **Prueba 12: Solicitud de liquidación**
  - **Objetivo**: Enviar el resumen del cuadre financiero a revisión.
  - **Pasos**:
    1. Ir a "Liquidación" (`/motorizado/liquidacion`).
    2. Revisar el desglose de cobros esperados vs. gastos en ruta.
    3. Ingresar notas adicionales y presionar "Enviar Liquidación a Revisión".
  - **Resultado Esperado**: La liquidación cambia su estado a `pending_review` y muestra una alerta amarilla informando que debe presentarse en caja.
  - **Estado**: **Pendiente**

- [ ] **Prueba 13: Cierre de jornada**
  - **Objetivo**: Entregar el turno registrando el kilometraje final.
  - **Pasos**:
    1. En el Dashboard (`/motorizado`), presionar "Solicitar Cierre".
    2. Ingresar el kilometraje final registrado en el velocímetro.
    3. Confirmar el cierre.
  - **Resultado Esperado**: La jornada pasa a estado `pending_settlement` o `closed` y finaliza la operación diaria del motorizado.
  - **Estado**: **Pendiente**

---

### 5. Matriz de Compatibilidad de Resoluciones Móviles

| Resolución | Dispositivo de Referencia | Criterio de Aceptación | Estado |
| :--- | :--- | :--- | :---: |
| **360 × 800** | Android Económico (Samsung A12 / Xiaomi) | Sin desbordamientos horizontales, botones visibles. | **Pendiente** |
| **375 × 812** | iPhone X / 11 Pro / 12 Mini | Ajuste correcto con barra de gestos inferior (`pb-safe`). | **Pendiente** |
| **390 × 844** | iPhone 13 / 14 / 15 Standard | Excelente jerarquía de texto y áreas táctiles de 44px. | **Pendiente** |
| **412 × 915** | Samsung Galaxy S22+ / Pixel 7 | Renderizado fluido y tarjetas centradas. | **Pendiente** |
