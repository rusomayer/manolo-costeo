-- =============================================
-- MIGRACIÓN: Nuevas tablas para Manolo Costeo v2
-- Proveedores, Precios, Recetas
-- =============================================

-- 1. Tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  nombre TEXT NOT NULL,
  contacto TEXT,
  notas TEXT,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proveedores_local ON proveedores(local_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);

-- 2. Tabla de historial de precios
CREATE TABLE IF NOT EXISTS precios_productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  producto TEXT NOT NULL,
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  precio DECIMAL(12,2) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  unidad TEXT NOT NULL,
  precio_por_unidad DECIMAL(12,4) GENERATED ALWAYS AS (
    CASE WHEN cantidad > 0 THEN precio / cantidad ELSE 0 END
  ) STORED,
  fecha DATE DEFAULT CURRENT_DATE,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_precios_local ON precios_productos(local_id);
CREATE INDEX IF NOT EXISTS idx_precios_producto ON precios_productos(producto);
CREATE INDEX IF NOT EXISTS idx_precios_fecha ON precios_productos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_precios_proveedor ON precios_productos(proveedor_id);

-- 3. Tabla de recetas
CREATE TABLE IF NOT EXISTS recetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  porciones INT DEFAULT 1,
  precio_venta DECIMAL(12,2),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recetas_local ON recetas(local_id);

-- 4. Tabla de ingredientes de recetas
CREATE TABLE IF NOT EXISTS receta_ingredientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receta_id UUID REFERENCES recetas(id) ON DELETE CASCADE,
  producto TEXT NOT NULL,
  cantidad DECIMAL(10,3) NOT NULL,
  unidad TEXT NOT NULL,
  costo_override DECIMAL(12,2)
);

CREATE INDEX IF NOT EXISTS idx_receta_ingredientes_receta ON receta_ingredientes(receta_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE precios_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_ingredientes ENABLE ROW LEVEL SECURITY;

-- Políticas para proveedores (miembros del local pueden leer/escribir)
CREATE POLICY "Miembros pueden ver proveedores de su local" ON proveedores
  FOR SELECT USING (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden crear proveedores" ON proveedores
  FOR INSERT WITH CHECK (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden editar proveedores" ON proveedores
  FOR UPDATE USING (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden eliminar proveedores" ON proveedores
  FOR DELETE USING (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

-- Políticas para precios_productos
CREATE POLICY "Miembros pueden ver precios" ON precios_productos
  FOR SELECT USING (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden crear precios" ON precios_productos
  FOR INSERT WITH CHECK (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

-- Políticas para recetas
CREATE POLICY "Miembros pueden ver recetas" ON recetas
  FOR SELECT USING (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden crear recetas" ON recetas
  FOR INSERT WITH CHECK (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden editar recetas" ON recetas
  FOR UPDATE USING (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Miembros pueden eliminar recetas" ON recetas
  FOR DELETE USING (
    local_id IN (
      SELECT local_id FROM local_members WHERE user_id = auth.uid()
    )
  );

-- Políticas para receta_ingredientes (acceso a través de la receta)
CREATE POLICY "Miembros pueden ver ingredientes" ON receta_ingredientes
  FOR SELECT USING (
    receta_id IN (
      SELECT id FROM recetas WHERE local_id IN (
        SELECT local_id FROM local_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Miembros pueden crear ingredientes" ON receta_ingredientes
  FOR INSERT WITH CHECK (
    receta_id IN (
      SELECT id FROM recetas WHERE local_id IN (
        SELECT local_id FROM local_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Miembros pueden editar ingredientes" ON receta_ingredientes
  FOR UPDATE USING (
    receta_id IN (
      SELECT id FROM recetas WHERE local_id IN (
        SELECT local_id FROM local_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Miembros pueden eliminar ingredientes" ON receta_ingredientes
  FOR DELETE USING (
    receta_id IN (
      SELECT id FROM recetas WHERE local_id IN (
        SELECT local_id FROM local_members WHERE user_id = auth.uid()
      )
    )
  );

-- Permitir service_role acceso completo (para Telegram bot)
-- Nota: el service_role ya bypasea RLS por defecto en Supabase
