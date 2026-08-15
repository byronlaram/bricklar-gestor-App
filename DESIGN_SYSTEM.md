# Sistema de Diseño y Guía de Estilo: Bricklar Gestor

> **Identidad Visual Oficial y Manual de Componentes UI**  
> *Versión 1.0.0 — Modificado para Priorizar Simplicidad, Espacio en Blanco e Interfaz Premium*

---

## 1. Filosofía de Diseño y Principios UX

El Sistema de Diseño de **Bricklar Gestor** se rige por los siguientes principios fundamentales:

1. **Simplicidad Absoluta como Prioridad:** La interfaz debe ser limpia, libre de elementos decorativos innecesarios y enfocada en facilitar el trabajo operativo rápido.
2. **Claridad Visual y Ample White Space (Espacio en Blanco):** Uso generoso de márgenes y espaciados para evitar la fatiga visual de administradores y motorizados.
3. **Tarjeta Blanca sobre Gris Muy Claro:** Fondo de aplicación en gris ultra claro (`#F8FAFC`) con contenedores y tarjetas en blanco puro (`#FFFFFF`), delimitados por bordes finos e imperceptibles (`#E2E8F0`).
4. **Uso Estricto y Semántico del Color:**
   * **Azul Marino (`#26326B`):** Color Primario Estructural (marcas, encabezados, navegación principal).
   * **Celeste / Azul Claro (`#0284C7`):** Color Secundario de Interacción (focos, enlaces, estados activos).
   * **Sin Magenta Principal:** Se elimina el magenta como color de acento primario para mantener una estética profesional y limpia.
   * **Verde (`#16A34A`):** Exclusivo para estados de **Éxito** o transacciones completadas.
   * **Naranja (`#D97706`):** Exclusivo para estados de **Advertencia**, pendientes o alertas.
   * **Rojo (`#DC2626`):** Exclusivo para errores, acciones **Destructivas** o cancelaciones.
5. **Ergonomía Táctil (Fat-Finger Friendly):** Para el motorizado en campo, todos los elementos interactivos móviles deben tener un área de toque mínima de **44px x 44px** (recomendado 48px).

---

## 2. Paleta de Colores Oficial

```css
:root {
  /* Fondo y Superficies */
  --bg-app: #F8FAFC;            /* Gris Ultra Claro */
  --bg-surface: #FFFFFF;        /* Blanco Puro */
  --border-subtle: #E2E8F0;     /* Borde Gris Suave */

  /* Identidad Primaria y Secundaria */
  --color-primary: #26326B;     /* Azul Marino Oficial Bricklar */
  --color-primary-dark: #181D43;/* Azul Noche Encabezados/Sidebar */
  --color-secondary: #0284C7;   /* Celeste de Interacción */
  --color-secondary-hover: #0369A1;

  /* Texto */
  --text-main: #0F172A;         /* Slate 900 */
  --text-muted: #64748B;        /* Slate 500 */
  --text-subtle: #94A3B8;       /* Slate 400 */

  /* Colores Semánticos */
  --semantic-success: #16A34A;  /* Verde (Completado / Éxito) */
  --semantic-warning: #D97706;  /* Naranja (Pendiente / Advertencia) */
  --semantic-error: #DC2626;    /* Rojo (Error / Cancelado / Destructivo) */
  --semantic-info: #0284C7;     /* Celeste (En Proceso / Info) */
}
```

---

## 3. Tipografía

El sistema tipográfico utiliza dos fuentes optimizadas para legibilidad:

* **Fuente Sans-Serif Principal:** `Inter`, system-ui, -apple-system, sans-serif.
* **Fuente Monoespaciada (Valores y Códigos):** `JetBrains Mono`, monospace (para números de guía, montos monetarios C$/US$ y fechas).

| Jerarquía | Tamaño | Peso | Uso |
| :--- | :--- | :--- | :--- |
| **Título T2** | `1.5rem` (24px) | Bold (700) | Títulos de pantalla principales |
| **Título T3** | `1.125rem` (18px) | SemiBold (600) | Encabezados de tarjetas y secciones |
| **Cuerpo Base** | `0.875rem` (14px) | Normal (400) | Textos de tabla, párrafos |
| **Etiquetas / Badges** | `0.75rem` (12px) | SemiBold (600) | Indicadores de estado |
| **Montos Numéricos** | `0.875rem` - `1.25rem` | Bold (700) / Mono | Importes monetarios C$/US$ |

---

## 4. Componentes Reutilizables y Clases CSS

### 4.1 Botones (`.btn-saas-*`)

* **Botón Primario (Azul Marino):**
  ```css
  .btn-saas-primary {
    background-color: #26326B;
    color: #FFFFFF;
    border-radius: 0.75rem;
    padding: 0.5rem 1rem;
    font-weight: 600;
  }
  .btn-saas-primary:hover {
    background-color: #1F2756;
  }
  ```
* **Botón Secundario (Celeste / Neutral):**
  ```css
  .btn-saas-secondary {
    background-color: #F1F5F9;
    color: #26326B;
    border-radius: 0.75rem;
    padding: 0.5rem 1rem;
    font-weight: 600;
  }
  .btn-saas-secondary:hover {
    background-color: #E2E8F0;
  }
  ```
* **Botón Táctil de Acción Rápida (Motorizado - 48px):**
  ```css
  .btn-touch-hero {
    min-height: 48px;
    width: 100%;
    background-color: #26326B;
    color: #FFFFFF;
    border-radius: 1rem;
    font-weight: 700;
  }
  ```

### 4.2 Tarjetas y Bento Grid (`.card-saas`, `.bento-card`)

```css
.card-saas {
  background: #FFFFFF;
  border-radius: 1rem;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05);
  padding: 1.25rem;
}
```

### 4.3 Tablas SaaS (`.table-saas`)

* Fondo de encabezado gris claro (`#F8FAFC`), texto en mayúsculas de tono silenciado (`#64748B`).
* Filas con hover sutil (`#F8FAFC`) y bordes inferiores finos (`#F1F5F9`).

### 4.4 Badges de Estado Semánticos (`.badge-saas`)

* **Completada / Éxito:** Fondo verde claro (`rgba(22, 163, 74, 0.12)`), texto verde (`#15803D`).
* **Pendiente / Advertencia:** Fondo naranja claro (`rgba(217, 119, 6, 0.12)`), texto naranja (`#B45309`).
* **Cancelada / Error:** Fondo rojo claro (`rgba(220, 38, 38, 0.12)`), texto rojo (`#B91C1C`).
* **En Ruta / Asignada:** Fondo celeste claro (`rgba(2, 132, 199, 0.12)`), texto azul claro (`#0369A1`).

---

## 5. Layout y Navegación Responsive

* **Panel Administrador (`AdminLayout.tsx`):**
  * Sidebar fijo a la izquierda en escritorio con fondo azul noche (`#181D43`).
  * Contenido principal sobre canvas gris claro (`#F8FAFC`) con amplio acolchado.
* **Panel Motorizado Móvil (`CourierLayout.tsx`):**
  * Topbar fijo con logotipo de Bricklar.
  * Barra flotante de efectivo disponible (`cash-summary-bar`).
  * Navegación inferior fija con zona segura para bordes móviles (`pb-safe`).
