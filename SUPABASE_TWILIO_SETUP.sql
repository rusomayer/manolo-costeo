-- Tabla para vincular números de Twilio a locales
CREATE TABLE IF NOT EXISTS twilio_links (
  phone_number TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE
);

-- Agregar columna a gastos_pendientes si no existe
ALTER TABLE gastos_pendientes
ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;

-- Index para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_gastos_pendientes_twilio
ON gastos_pendientes(twilio_phone_number);

-- Index para twilio_links
CREATE INDEX IF NOT EXISTS idx_twilio_links_local
ON twilio_links(local_id);
