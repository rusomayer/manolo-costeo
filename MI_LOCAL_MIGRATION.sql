-- Agregar columnas para la sección "Mi Local"
-- Ejecutar en Supabase SQL Editor

-- Datos básicos
ALTER TABLE locales ADD COLUMN IF NOT EXISTS tipo_local TEXT DEFAULT 'cafe';
ALTER TABLE locales ADD COLUMN IF NOT EXISTS ubicacion_url TEXT;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS telefono TEXT;

-- Espacio y capacidad
ALTER TABLE locales ADD COLUMN IF NOT EXISTS superficie NUMERIC;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS cantidad_mesas INTEGER;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS mesas_terraza INTEGER DEFAULT 0;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS capacidad_personas INTEGER;

-- Operaciones
ALTER TABLE locales ADD COLUMN IF NOT EXISTS cantidad_turnos INTEGER DEFAULT 1;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS empleados_por_turno INTEGER;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS rotacion_mesa NUMERIC;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS roles_empleados JSONB DEFAULT '[]'::jsonb;
-- Formato: [{"rol": "Barista", "cantidad": 2}, {"rol": "Cajero", "cantidad": 1}]

-- Horarios
ALTER TABLE locales ADD COLUMN IF NOT EXISTS horarios JSONB;
-- Formato: {"lunes": {"abierto": true, "abre": "08:00", "cierra": "22:00"}, ...}

-- Costos fijos estimados
ALTER TABLE locales ADD COLUMN IF NOT EXISTS alquiler_mensual NUMERIC;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS costo_luz NUMERIC;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS costo_gas NUMERIC;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS costo_agua NUMERIC;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS costo_internet NUMERIC;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS costo_seguro NUMERIC;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS costo_delivery_comision NUMERIC; -- porcentaje, ej: 18

-- Objetivos del negocio
ALTER TABLE locales ADD COLUMN IF NOT EXISTS ticket_promedio NUMERIC;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS food_cost_objetivo NUMERIC; -- porcentaje, ej: 32
ALTER TABLE locales ADD COLUMN IF NOT EXISTS meta_ventas_mensual NUMERIC;
