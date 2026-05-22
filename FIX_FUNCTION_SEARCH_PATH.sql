-- FIX_FUNCTION_SEARCH_PATH.sql
-- Fija search_path en funciones (advisory de seguridad de Supabase:
-- "Function Search Path Mutable"). Aplicado en prod vía Supabase MCP 2026-05-22.
-- add_owner_as_member inserta en local_members (public); se fija a
-- public, pg_temp para no romper la resolución del nombre de la tabla.
ALTER FUNCTION public.add_owner_as_member() SET search_path = public, pg_temp;
