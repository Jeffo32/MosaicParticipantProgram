-- ============================================================
-- Mosaic — SECURITY FIX (run once in the Supabase SQL editor)
-- ------------------------------------------------------------
-- The PIN functions are SECURITY DEFINER and were callable by the
-- public/anon role via PostgREST RPC. That let anyone with the public
-- anon key (it ships in config.js) brute-force PINs and even reset a
-- participant's PIN directly from a browser.
--
-- Fix: only the serverless API (service_role key) may call them.
-- The GRANTs below keep /api/participant-login and /api/admin-set-pin
-- working after the REVOKE.
--
-- Run this BEFORE using the app internally.
-- ============================================================

revoke execute on function verify_participant_pin(text, text) from anon, authenticated, public;
revoke execute on function set_participant_pin(uuid, text)     from anon, authenticated, public;

grant execute on function verify_participant_pin(text, text) to service_role;
grant execute on function set_participant_pin(uuid, text)     to service_role;
