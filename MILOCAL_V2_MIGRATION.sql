-- Migración para Mi Local v2
-- Ejecutar en Supabase SQL Editor

ALTER TABLE locales ADD COLUMN IF NOT EXISTS horario_apertura JSONB DEFAULT '[]'::jsonb;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS empleados JSONB DEFAULT '[]'::jsonb;
