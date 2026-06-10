-- ============================================================
-- Mosaic — SECURITY FIX (run once in the Supabase SQL editor)
-- ------------------------------------------------------------
-- The PIN functions are SECURITY DEFINER and were callable by the
-- public/anon role via PostgREST RPC. That let anyone with the public
-- anon key (it ships in config.js) brute-force PINs and even reset a
-- participant's PIN directly. These functions must ONLY be called by
-- the serverless API (which uses the service_role key and bypasses
-- these grants), never by browsers.
--
-- Run this BEFORE using the app internally.
-- ============================================================

revoke execute on function verify_participant_pin(text, text) from anon, authenticated, public;
revoke execute on function set_participant_pin(uuid, text)     from anon, authenticated, public;

-- (service_role retains access implicitly; the /api functions keep working.)

-- Optional tidy-up: the boolean helpers don't leak data, but there's no
-- reason for browsers to call them directly either.
revoke execute on function verify_participant_pin(text, text) from anon;
revoke execute on function set_participant_pin(uuid, text)     from anon;
