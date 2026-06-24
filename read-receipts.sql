-- ============================================================
-- Mosaic — Read receipts
-- The messages.read_at column already exists; this just adds UPDATE
-- policies so each side can stamp read_at on the other's messages.
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================

drop policy if exists messages_staff_update on messages;
create policy messages_staff_update on messages for update
  using (staff_can(participant_id)) with check (staff_can(participant_id));

drop policy if exists messages_participant_update on messages;
create policy messages_participant_update on messages for update
  using (participant_id = auth.uid()) with check (participant_id = auth.uid());
