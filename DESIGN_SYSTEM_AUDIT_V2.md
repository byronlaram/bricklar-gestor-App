# Informe de Auditoría Técnica y Arquitectura UX/UI (V2)
## Design System Bricklar v1 — Evaluación Senior de Arquitectura y Escalabilidad

> **Fecha:** 1 de Agosto de 2026  
> **Autor:** Arquitectura de Software & UX/UI Lead  
> **Proyecto:** Bricklar Gestor  
> **Estado:** Documentación Técnica de Evaluación — **Sin Modificación de Código**

---

# 1. Resumen Ejecutivo

## 1.1 Calificación General del Design System: 8.5 / 10

El **Design System Bricklar v1** presenta una base conceptual sólida, alineada con los estándares modernos de la industria SaaS (Stripe, Linear, Notion, Revolut). La eliminación del magenta en favor de la combinación de **Azul Marino (`#26326B` / `#181D43`)** como primario estructural y **Celeste (`#0284C7`)** como secundario de interacción proporciona una estética profesional, sobria y de alta confianza.

Sin embargo, para garantizar una escalabilidad empresarial sin deuda técnica ni regresiones en producción, la propuesta v1 requiere formalizar especificaciones de **accesibilidad (WCAG 2.1 AA)**, **tokens de diseño de nivel micro**, **componentes complejos de campo móvil (Bottom Sheet / Drawer)** y **patrones de diseño defensivo financiero**.

```
┌────────────────────────────────────────────────────────────────────────┐
│               EVALUACIÓN DE ARQUITECTURA DESIGN SYSTEM v1              │
├───────────────────┬───────────────────┬────────────────────────────────┤
│   FORTALEZAS: 9.0 │  DEBILIDADES: 7.5 │     ESCALABILIDAD: 8.5        │
│  Paleta limpia,   │ Faltan tokens de  │ Arquitectura semántica lista   │
│  Mobile-First     │ micro-espaciado y │ para Dark Mode e i18n          │
│  ergonómico       │ componentes async │                                │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

## 1.2 Fortalezas
* **Identidad Visual Sobria y Clara:** La transición a tarjetas blancas (`#FFFFFF`) sobre lienzo gris ultra claro (`#F8FAFC`) maximiza el espacio en blanco y reduce la fatiga visual.
* **Ergonomía Móvil para Motorizados:** El componente `.btn-touch-hero` (48px+) y la ubicación inferior de acciones principales respetan la operación táctil a una sola mano.
* **Semántica Estricta de Estado:** Asignación inflexible de Verde (Éxito), Naranja (Advertencia) y Rojo (Error/Destructivo), evitando el uso de colores decorativos confusos.
* **Compatibilidad Nativa con Tailwind CSS v4:** El uso del bloque `@theme` facilita el mantenimiento global mediante variables CSS declarativas.

## 1.3 Debilidades
* **Ausencia de Componentes de Feedback Asíncrono Estandarizados:** Falta de un sistema centralizado de Toasts, Skeleton Loaders y Skeletons de tabla.
* **Falta de Especificación de Tokens de Capas (Z-Index) y Opacidad:** Inexistencia de una escala formal de z-index y transparencias para modales, overlays y barras flotantes.
* **Patrones de Confirmación Financiera Indefinidos:** No se especifican diálogos de doble confirmación táctil para transacciones en Dólares (USD) o Córdobas (NIO).

## 1.4 Riesgos Principales
* **Acoplamiento de Estilos Inline en Pantallas Secundarias:** Si la migración se realiza sin extraer sub-componentes, se corre el riesgo de mantener clases duplicadas en modales extensos.
* **Incompatibilidad de Foco para Navegación por Teclado:** Falta de estandarización del anillo de foco (`focus-visible`) en botones secundarios e iconos interactivos.

## 1.5 Puntos Críticos de Intervención
1. Formalización del **Catálogo Completo de Tokens Faltantes** (Z-Index, Opacidad, Micro-espaciado, Breakpoints).
2. Creación del **Sistema Oficial de Componentes Asíncronos** (`ToastCenter`, `TableSkeleton`, `ConfirmDialog`).
3. Definición del **Patrón Formateador Multimoneda (C$ / US$)** con `JetBrains Mono`.

---

# 2. Auditoría Detallada

A continuación se clasifican todas las observaciones técnicas bajo la escala: **Crítica**, **Alta**, **Media**, **Baja** o **Mejora Recomendada**.

| ID | Área | Categoría | Observación | Clasificación |
| :--- | :--- | :--- | :--- | :---: |
| **AUD-01** | Tokens | Faltante | Ausencia de escala formal de Z-Index (`z-dropdown: 10`, `z-sticky: 20`, `z-fixed: 30`, `z-modal-backdrop: 40`, `z-modal: 50`, `z-toast: 100`). | **Alta** |
| **AUD-02** | Componentes | Faltante | Falta componente `<BottomDrawer />` / `<BottomSheet />` para acciones móviles del motorizado en pantallas pequeñas. | **Alta** |
| **AUD-03** | Accesibilidad | Deficiencia | No se especifica el comportamiento de `prefers-reduced-motion` para usuarios con sensibilidad al movimiento. | **Media** |
| **AUD-04** | UI / Formularios | Faltante | Inexistencia de un componente estandarizado de entrada monetaria `<CurrencyInput />` con máscara automática NIO/USD. | **Crítica** |
| **AUD-05** | Feedback | Faltante | No se definió el centro global de notificaciones tipo Toast para confirmación de acciones rápidas. | **Alta** |
| **AUD-06** | UX Motorizado | Fortaleza | La barra flotante de saldo en efectivo (`.cash-summary-bar`) es excelente para reducir la ansiedad financiera del motorizado. | **Excelente** |
| **AUD-07** | Arquitectura | Mejora | Preparación de variables semánticas (`--bg-surface`, `--color-foreground`) facilita Dark Mode futuro sin refactorizar HTML. | **Mejora** |
| **AUD-08** | Navegación | Faltante | No se especificó el estado de persistencia de filtros en la URL (`useSearchParams`) para la vista de tareas del administrador. | **Media** |

---

# 3. Componentes Faltantes

La siguiente es la lista oficial de componentes UI/UX que **deben crearse formalmente** dentro del Design System antes o durante la migración:

1. **`<CurrencyInput />`**: Input especializado con sufijo automático (C$ / US$), formateo de miles en tiempo real y tipografía monoespaciada `JetBrains Mono`.
2. **`<BottomSheet />`**: Panel desplegable desde el borde inferior para dispositivos móviles, reemplazando modales centrados en pantallas `< 768px`.
3. **`<ToastProvider />` / `<Toast />`**: Sistema de alertas flotantes temporales (éxito, error, advertencia) con autohide configurable (3000ms).
4. **`<Skeleton />` / `<TableSkeleton />`**: Componente de carga progresiva con animación *shimmer* para simular la estructura de filas y tarjetas mientras TanStack Query resuelve la petición.
5. **`<ConfirmDialog />`**: Modal de confirmación de alta seguridad para acciones financieras destructivas (cierre diario, anulación de cobro, eliminación de usuario).
6. **`<EmptyState />`**: Contenedor estándar para vistas sin datos, con ilustración minimalista, mensaje motivador y botón de acción.
7. **`<StatusTimeline />`**: Componente de línea de tiempo vertical para mostrar el historial de estados de una tarea con usuario, fecha y notas.
8. **`<SegmentedControl />`**: Selector de pestañas compacto para conmutar entre vistas (ej: Vista Tabla vs Vista Tarjetas, o NIO vs USD).
9. **`<DateRangePicker />`**: Selector de rango de fechas para reportes y liquidaciones históricas.
10. **`<BulkActionBar />`**: Barra flotante inferior para administradores cuando seleccionan múltiples filas en una tabla (ej: "3 tareas seleccionadas -> [Asignar Motorizado]").

---

# 4. Tokens Faltantes

Se identifican los siguientes **Design Tokens** que deben incorporarse al bloque `@theme` de Tailwind v4 en `src/index.css`:

### 4.1 Escala de Capas (Z-Index Tokens)
```css
--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-fixed: 300;
--z-modal-backdrop: 400;
--z-modal: 500;
--z-popover: 600;
--z-toast: 700;
--z-tooltip: 800;
```

### 4.2 Escala de Opacidad (Opacity Tokens)
```css
--opacity-disabled: 0.5;
--opacity-hover-subtle: 0.08;
--opacity-backdrop: 0.6;
--opacity-focus-ring: 0.18;
```

### 4.3 Micro-Espaciados
```css
--space-0-5: 0.125rem; /* 2px - Micro separadores */
--space-1-5: 0.375rem; /* 6px - Badges pequeños */
```

### 4.4 Tokens de Animación y Tiempos
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--ease-out-cubic: cubic-bezier(0.33, 1, 0.68, 1);
--ease-in-out-smooth: cubic-bezier(0.65, 0, 0.35, 1);
```

---

# 5. Layouts Faltantes

Para cubrir la totalidad de casos de uso de la plataforma, se definen los siguientes patrones de estructura:

1. **`AuthSplitLayout`**: Layout de pantalla dividida (50/50 en escritorio, 100% en móvil) con panel lateral de branding y formulario centrado.
2. **`MasterDetailLayout`**: Vista de dos paneles (Lista de tareas a la izquierda 35%, Detalle de tarea a la derecha 65%) para administración rápida sin cambiar de página.
3. **`SettingsLayout`**: Layout con sub-navegación lateral izquierda para pantallas de configuración (General, Tasa de cambio, Notificaciones, Seguridad).
4. **`FullscreenPrintLayout`**: Layout optimizado exclusivamente para la vista previa e impresión de liquidaciones y cierres diarios en PDF/impresora térmica.

---

# 6. Reglas UX/UI Faltantes

1. **Prevención de Doble Clic en Transacciones Financieras:** Todos los botones de envío en formularios con movimientos de efectivo deben deshabilitarse automáticamente al primer clic (`isSubmitting`) mostrando estado visual de procesando.
2. **Persistencia de Filtros en la Navegación:** Los filtros aplicados en tablas (fecha, sucursal, motorizado) deben sincronizarse con la URL para permitir compartir enlaces o recargar la página sin perder el estado de búsqueda.
3. **Mapeo Riguroso de Formato Moneda:** Toda cantidad en Córdobas debe incluir el prefijo `C$` y toda cantidad en Dólares el prefijo `US$`, formateados mediante `Intl.NumberFormat('es-NI')` y renderizados en fuente monoespaciada `JetBrains Mono`.
4. **Resguardo de Carga Móvil:** En el panel del motorizado, la barra flotante de efectivo (`.cash-summary-bar`) debe permanecer fijada en la parte superior sin tapar el contenido activo mediante un padding de compensación (`pt-20`).

---

# 7. Accesibilidad (WCAG 2.1 AA)

* **Contraste de Color:** El texto principal `#0F172A` sobre fondo `#FFFFFF` cumple con un contraste de **15.8:1** (supera holgadamente el mínimo de 4.5:1). El texto secundario `#64748B` cumple con **4.6:1**.
* **Foco Teclado (`Focus Ring`):** Todos los botones, enlaces e inputs deben contar con la regla `:focus-visible { outline: 2px solid #0284C7; outline-offset: 2px; }`.
* **Reducción de Movimiento:** Implementación obligatoria del media query:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
* **Compatibilidad con Lectores de Pantalla:** Indicadores de estado numéricos (ej. saldo en caja) deben contar con `aria-live="polite"` para anunciar actualizaciones en tiempo real.

---

# 8. Riesgos de Escalabilidad

1. **Acoplamiento de Lógica de Negocio con Estilos:** Evitar que hooks de UI (como modales o drawer states) dependan de la respuesta directa de llamadas RPC a Supabase.
2. **Soporte Futuro Multi-Tema / Dark Mode:** Al utilizar tokens semánticos en `@theme`, el cambio a tema oscuro se logrará simplemente redefiniendo las variables bajo la clase `.dark` sin tocar los archivos de componentes.
3. **Internacionalización (i18n):** Los textos de la UI deben organizarse en archivos de constantes o diccionarios para permitir la localización rápida si la plataforma se expande fuera de Nicaragua.

---

# 9. Recomendaciones Arquitectónicas (Priorizadas)

1. **Prioridad 1 (Crítica):** Crear la carpeta `src/shared/components/ui/` para alojar componentes atómicos puros (`Button`, `Input`, `Badge`, `Card`, `Modal`, `Toast`, `Skeleton`).
2. **Prioridad 2 (Alta):** Registrar todos los tokens faltantes (Z-Index, Opacidad, Micro-espaciados) en `src/index.css`.
3. **Prioridad 3 (Alta):** Implementar el helper centralizado de formateo monetario `formatCurrency(amount, currency)`.
4. **Prioridad 4 (Media):** Refactorizar `TaskFormModal.tsx` descomponiendo sus 9 tipos de tarea en sub-formularios modulares.
5. **Prioridad 5 (Mejora):** Añadir soporte de gestos táctiles deslizar-para-cerrar (*swipe-to-dismiss*) en el componente `<BottomSheet />` móvil.

---

# 10. Roadmap Recomendado Pre-Migración

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ROADMAP PRE-MIGRACIÓN OBLIGATORIO                    │
├────────────────────────────────────────────────────────────────────────┤
│ PASO 1: Creación de la biblioteca de componentes atómicos en          │
│        src/shared/components/ui/                                       │
│ PASO 2: Registro completo de Tokens en src/index.css                   │
│ PASO 3: Validación del sistema de alertas Toast y Skeletons           │
│ PASO 4: Inicio de la Migración Incremental (Fase 1 a Fase 7)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

> ✋ **Conclusión del Arquitecto:** El Design System Bricklar v1 se encuentra maduro para su ejecución. Se recomienda incorporar las especificaciones de tokens faltantes y componentes atómicos en `src/shared/components/ui/` durante la Fase 1 de la migración.
