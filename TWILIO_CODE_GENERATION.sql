-- Agregar columna twilio_code a locales (si no existe)
ALTER TABLE locales
ADD COLUMN IF NOT EXISTS twilio_code TEXT UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_locales_twilio_code
ON locales(twilio_code);

-- Para locales existentes sin código, generar uno (ejecutar una sola vez)
UPDATE locales
SET twilio_code = 'twilio_' || substr(id::text, 1, 8) || '_' || substr(md5(random()::text), 1, 8)
WHERE twilio_code IS NULL;

-- Hacer la columna NOT NULL después de asignar valores
ALTER TABLE locales
ALTER COLUMN twilio_code SET NOT NULL;
