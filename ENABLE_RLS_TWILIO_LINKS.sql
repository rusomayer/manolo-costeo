-- ENABLE_RLS_TWILIO_LINKS.sql
-- Habilita RLS en public.twilio_links, que estaba expuesta al rol
-- anon/authenticated (advisory de seguridad de Supabase, mayo 2026:
-- "RLS Disabled in Public").
--
-- La tabla solo la usa el webhook de Twilio WhatsApp
-- (app/api/twilio-whatsapp/route.ts) con createServiceClient() = service_role,
-- que saltea RLS. El frontend no la toca. Por eso: RLS sin policy
-- (service_role sigue funcionando; anon queda bloqueado).
--
-- Aplicado en producción vía Supabase MCP el 2026-05-22.

ALTER TABLE public.twilio_links ENABLE ROW LEVEL SECURITY;
