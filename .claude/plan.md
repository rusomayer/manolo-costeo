# Plan: Rediseño de Navegación + Nuevas Secciones para Manolo Costeo

## Resumen

Transformar Manolo Costeo de una app simple de tracking de gastos a una **plataforma completa de gestión de costos gastronómicos**, con navegación lateral, asistente IA conversacional, gestión de recetas con costeo automático, y más.

---

## FASE 1: Sidebar Navigation + Estructura de Secciones

### 1.1 Reemplazar navbar por sidebar lateral

**Cambios en:** `app/dashboard/layout.tsx` + `app/globals.css`

- Sidebar fija a la izquierda (~240px ancho, colapsable a ~60px en mobile)
- Logo + nombre del local arriba
- Selector de local (dropdown) debajo del logo
- Links de navegación con iconos + texto
- Usuario + logout abajo del sidebar
- El contenido principal ocupa el espacio restante con scroll independiente

**Secciones en el sidebar:**

| Sección | Icono | Descripción |
|---------|-------|-------------|
| **Dashboard** | 📊 | Vista general (ya existe, la mejoramos) |
| **Gastos** | 💰 | Tabla completa de gastos (ya existe) |
| **Proveedores** | 🏪 | ABM de proveedores + historial de precios |
| **Recetas** | 🍳 | Platos con ingredientes y costeo |
| **Reportes** | 📈 | Reportes avanzados y comparativas |
| **Asistente** | 🤖 | Chat con Manolo (consultas inteligentes) |
| **Configuración** | ⚙️ | Settings + Telegram (ya existe) |

> Se elimina "Invitar" como sección propia del sidebar → se mueve como sub-sección dentro de Configuración.

### 1.2 Layout responsive
- **Desktop (>768px):** Sidebar expandida + contenido
- **Mobile (<768px):** Sidebar colapsada (solo iconos), tap para expandir como overlay
- Transición suave con CSS transitions

---

## FASE 2: Proveedores

### 2.1 Tabla `proveedores` (nueva en Supabase)

```sql
CREATE TABLE proveedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  nombre TEXT NOT NULL,
  contacto TEXT,          -- teléfono, email, etc.
  notas TEXT,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE
);
```

### 2.2 Tabla `precios_productos` (nueva - historial de precios)

```sql
CREATE TABLE precios_productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  producto TEXT NOT NULL,        -- "Leche entera", "Café Colombia"
  proveedor_id UUID REFERENCES proveedores(id),
  precio DECIMAL(12,2) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  unidad TEXT NOT NULL,           -- kg, litros, unidades
  precio_por_unidad DECIMAL(12,2) GENERATED ALWAYS AS (precio / NULLIF(cantidad, 0)) STORED,
  fecha DATE DEFAULT CURRENT_DATE,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE
);
```

### 2.3 Páginas
- `app/dashboard/proveedores/page.tsx` - Lista de proveedores con CRUD
- Detalle de proveedor: historial de compras, precios a lo largo del tiempo
- **Auto-poblado:** Cuando se carga un gasto con proveedor + cantidad/unidad, se crea automáticamente un registro en `precios_productos` (esto alimenta al asistente y al costeo de recetas)

---

## FASE 3: Recetas y Costeo por Plato

### 3.1 Tabla `recetas` (nueva)

```sql
CREATE TABLE recetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  nombre TEXT NOT NULL,           -- "Croque Madame"
  descripcion TEXT,
  categoria TEXT,                 -- "plato principal", "postre", "bebida"
  porciones INT DEFAULT 1,       -- rinde X porciones
  precio_venta DECIMAL(12,2),    -- precio al que se vende (opcional)
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE
);
```

### 3.2 Tabla `receta_ingredientes` (nueva)

```sql
CREATE TABLE receta_ingredientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receta_id UUID REFERENCES recetas(id) ON DELETE CASCADE,
  producto TEXT NOT NULL,          -- "Pan de campo", "Huevo"
  cantidad DECIMAL(10,3) NOT NULL, -- 0.200 (200g)
  unidad TEXT NOT NULL,            -- "kg", "unidades", "litros"
  costo_override DECIMAL(12,2)    -- si no hay dato en precios_productos, se puede poner manual
);
```

### 3.3 Páginas
- `app/dashboard/recetas/page.tsx` - Lista de recetas con búsqueda
- `app/dashboard/recetas/[id]/page.tsx` - Detalle: ingredientes, costo calculado, margen
- **Cálculo automático de costo:** Para cada ingrediente, busca el último `precio_por_unidad` en `precios_productos`. Si no existe, usa `costo_override` o muestra "sin dato".
- **Margen:** Si tiene `precio_venta`, muestra: costo, margen bruto, % de food cost
- **Vista especial:** Tabla resumen de todos los platos con su food cost %

### 3.4 Lógica de costeo (API)
- `app/api/recetas/route.ts` - CRUD de recetas
- `app/api/recetas/[id]/costeo/route.ts` - Calcula costo actual de una receta
- Función en `lib/costeo.ts`:
  ```
  calcularCostoReceta(recetaId) → {
    costoTotal, costoPorPorcion, ingredientes: [{producto, cantidad, unidad, precioUnitario, costoLinea, fuente}],
    sinDatos: [{producto}]  // ingredientes sin precio conocido
  }
  ```

---

## FASE 4: Asistente Manolo (Chat IA)

### 4.1 Concepto
Un chat conversacional dentro de la app donde el usuario le pregunta cosas como:
- "¿Cuánto estoy pagando el kilo de leche?"
- "¿Cuánto gasté en café el mes pasado?"
- "¿Cuál es mi gasto fijo mensual promedio?"
- "¿Cuánto me sale preparar un croque madame?"
- "¿Subió el precio de la leche este año?"
- "¿Cuál es mi proveedor más barato de café?"

### 4.2 Arquitectura
- `app/dashboard/asistente/page.tsx` - UI de chat (bubbles, input, historial)
- `app/api/asistente/route.ts` - Endpoint que recibe la pregunta
- **Flujo:**
  1. Usuario hace pregunta
  2. El backend arma un **contexto** con datos relevantes del local:
     - Resumen de gastos del período
     - Últimos precios por producto
     - Recetas y sus costos (si aplica)
     - Proveedores activos
  3. Se envía a Claude con un system prompt específico de "asistente de costos"
  4. Claude analiza los datos y responde en lenguaje natural
  5. Se muestra la respuesta en el chat

### 4.3 System Prompt del Asistente
```
Sos Manolo, un asistente experto en costos gastronómicos.
Tenés acceso a los datos del local del usuario.
Respondé de forma concisa, útil y con datos concretos.
Si te preguntan algo que no podés calcular con los datos disponibles, decilo honestamente.
Usá formato de moneda argentina (ARS).
Podés hacer cálculos, comparaciones, y dar recomendaciones.
```

### 4.4 Herramientas/funciones para Claude (tool use)
Para que Manolo pueda consultar la base de datos de forma inteligente, usaremos **tool use** de Claude:

- `consultar_gastos(desde, hasta, categoria?, proveedor?)` - Busca gastos filtrados
- `consultar_precios(producto?, proveedor?)` - Busca historial de precios
- `calcular_costo_receta(receta_nombre)` - Calcula costo de un plato
- `resumen_periodo(desde, hasta)` - Resumen general de gastos
- `comparar_periodos(periodo1, periodo2)` - Compara dos períodos
- `buscar_proveedor(nombre?)` - Info de proveedores

Esto permite que Claude decida qué datos necesita y haga múltiples consultas si es necesario.

---

## FASE 5: Reportes

### 5.1 Página de reportes
- `app/dashboard/reportes/page.tsx`

### 5.2 Reportes incluidos:
1. **Evolución mensual** - Gráfico de líneas: gasto total mes a mes
2. **Comparativa mes vs mes anterior** - Qué categorías subieron/bajaron
3. **Top proveedores** - Ranking por monto total
4. **Evolución de precios** - Gráfico de líneas por producto (ej: precio del kg de café a lo largo del tiempo)
5. **Food cost por plato** - Tabla con todos los platos, su costo, precio de venta y margen
6. **Fijos vs Variables** - Tendencia a lo largo del tiempo
7. **Proyección mensual** - Basado en gastos fijos + promedio de variables

---

## FASE 6 (Futura): Agente de Precios / Scraping

> Esta fase queda planteada pero NO se implementa ahora. Requiere investigación de legality y APIs de supermercados.

**Concepto:** Un agente que busca precios en portales de supermercados mayoristas (Maxiconsumo, Vital, Diarco, etc.) para comparar con lo que estás pagando.

**Opciones técnicas:**
- APIs públicas de precios (si existen)
- Scraping de sitios con Puppeteer/Playwright (server-side)
- Integración con servicios como Precios Claros (gobierno argentino)

**Se dejaría preparada la estructura** para que cuando se implemente, el Asistente Manolo pueda decir: "Estás pagando $X el kg de café, pero en Maxiconsumo está a $Y".

---

## Orden de Implementación

| # | Tarea | Dependencias |
|---|-------|-------------|
| 1 | Sidebar navigation + layout responsive | Ninguna |
| 2 | Sección Proveedores (tabla + CRUD + UI) | Sidebar |
| 3 | Auto-registro de precios desde gastos | Proveedores |
| 4 | Sección Recetas (tabla + CRUD + costeo) | Proveedores + Precios |
| 5 | Sección Reportes (gráficos avanzados) | Datos existentes |
| 6 | Asistente Manolo (chat + tool use) | Todo lo anterior (para tener datos ricos) |
| 7 | Mejoras al Dashboard (resumen mejorado) | Reportes |

---

## Archivos Nuevos a Crear

```
app/dashboard/layout.tsx              ← MODIFICAR (sidebar)
app/globals.css                       ← MODIFICAR (estilos sidebar)
app/dashboard/proveedores/page.tsx    ← NUEVO
app/dashboard/recetas/page.tsx        ← NUEVO
app/dashboard/recetas/[id]/page.tsx   ← NUEVO
app/dashboard/reportes/page.tsx       ← NUEVO
app/dashboard/asistente/page.tsx      ← NUEVO
app/api/proveedores/route.ts          ← NUEVO
app/api/proveedores/[id]/route.ts     ← NUEVO
app/api/recetas/route.ts              ← NUEVO
app/api/recetas/[id]/route.ts         ← NUEVO
app/api/recetas/[id]/costeo/route.ts  ← NUEVO
app/api/asistente/route.ts            ← NUEVO
app/api/reportes/route.ts             ← NUEVO
lib/types.ts                          ← MODIFICAR (nuevos tipos)
lib/costeo.ts                         ← NUEVO
lib/asistente.ts                      ← NUEVO (system prompt + tools)
lib/supabase.ts                       ← MODIFICAR (nuevas queries)
```

## Tablas nuevas en Supabase (a crear manualmente)
- `proveedores`
- `precios_productos`
- `recetas`
- `receta_ingredientes`

---

## Decisiones de Diseño

- **Sin librería de UI externa** - Seguimos con inline styles + CSS variables (consistente con el proyecto actual)
- **Sin ORM** - Seguimos usando Supabase client directo
- **Claude tool use** para el asistente - Más flexible que armar queries hardcoded
- **Precios auto-calculados** - Column generada `precio_por_unidad` en PostgreSQL para eficiencia
- **Historial de precios** - Cada compra es un punto de datos, no se sobreescribe
