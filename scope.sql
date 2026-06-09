-- ============================================================
-- Mosaic — per-worker scoping migration
-- Run this once in the Supabase SQL editor to switch workers from
-- "see everyone" to "see only their assigned participants".
-- Admins/managers keep full access. Safe to re-run.
-- (These changes are also baked into schema.sql.)
-- ============================================================

-- Assignment date checks use Melbourne local date, not UTC (fixes assignments
-- created in the AEST morning being invisible until UTC catches up).
create or replace function worker_assigned_to(p_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from assignments
    where worker_id = auth.uid() and participant_id = p_id
      and active_from <= (now() at time zone 'Australia/Melbourne')::date
      and (active_to is null or active_to >= (now() at time zone 'Australia/Melbourne')::date)
  );
$$;

create or replace function staff_can(p_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select is_admin() or worker_assigned_to(p_id);
$$;

drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (id = auth.uid() or staff_can(id));

drop policy if exists participants_read on participants;
create policy participants_read on participants for select using (id = auth.uid() or staff_can(id));
drop policy if exists participants_update on participants;
create policy participants_update on participants for update using (id = auth.uid() or staff_can(id));

drop policy if exists assignments_read on assignments;
create policy assignments_read on assignments for select using (worker_id = auth.uid() or participant_id = auth.uid() or is_admin());

drop policy if exists bookings_read on bookings;
create policy bookings_read on bookings for select using (participant_id = auth.uid() or worker_id = auth.uid() or staff_can(participant_id));
drop policy if exists bookings_insert on bookings;
create policy bookings_insert on bookings for insert with check (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists bookings_update on bookings;
create policy bookings_update on bookings for update using (participant_id = auth.uid() or staff_can(participant_id)) with check (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists bookings_delete on bookings;
create policy bookings_delete on bookings for delete using (participant_id = auth.uid() or staff_can(participant_id));

drop policy if exists service_read on service_requests;
create policy service_read on service_requests for select using (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists service_staff_update on service_requests;
create policy service_staff_update on service_requests for update using (staff_can(participant_id)) with check (staff_can(participant_id));

drop policy if exists away_read on away_periods;
create policy away_read on away_periods for select using (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists away_staff_write on away_periods;
create policy away_staff_write on away_periods for all using (staff_can(participant_id)) with check (staff_can(participant_id));

drop policy if exists messages_read on messages;
create policy messages_read on messages for select using (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists messages_staff_insert on messages;
create policy messages_staff_insert on messages for insert with check (staff_can(participant_id) and sender = 'staff');
drop policy if exists messages_staff_delete on messages;
create policy messages_staff_delete on messages for delete using (staff_can(participant_id));
