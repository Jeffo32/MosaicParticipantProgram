-- ============================================================
-- Mosaic Participant Program — Supabase schema  (v2)
-- Run top-to-bottom in the Supabase SQL editor.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where it can.
-- ============================================================

create extension if not exists pgcrypto;  -- gen_random_uuid + crypt() PIN hashing

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
do $$ begin create type user_role as enum ('participant','worker','admin','manager'); exception when duplicate_object then null; end $$;
do $$ begin create type participant_mode as enum ('program','one_on_one','both'); exception when duplicate_object then null; end $$;
do $$ begin create type booking_status as enum ('pending','confirmed','cancelled','late_cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type service_type as enum ('doctor','cleaning','garden','overwhelmed','respite','other'); exception when duplicate_object then null; end $$;
do $$ begin create type service_status as enum ('open','actioned','closed'); exception when duplicate_object then null; end $$;
do $$ begin create type message_sender as enum ('participant','staff'); exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 1. PROFILES (one row per auth user)
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  display_name text not null,
  phone text,
  photo_url text,
  mode participant_mode,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. PARTICIPANTS (participant-only fields)
--    access_code = the username participants type (unique, short).
--    pin_hash    = bcrypt hash of their PIN (never store plaintext).
--    about_me    = the full intake-form blob from the app.
-- ------------------------------------------------------------
create table if not exists participants (
  id uuid primary key references profiles(id) on delete cascade,
  access_code text unique,
  pin_hash text,
  about_me jsonb,
  dislikes text,
  allergies text,
  behavioural_regulators text,
  life_background text,
  support_lead_id uuid references profiles(id)
);

-- ------------------------------------------------------------
-- 3. WORKERS
-- ------------------------------------------------------------
create table if not exists workers (
  id uuid primary key references profiles(id) on delete cascade,
  practitioner_types text[],
  hourly_rate numeric(10,2)
);

-- ------------------------------------------------------------
-- 4. ASSIGNMENTS (worker <-> participant scoping)
-- ------------------------------------------------------------
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  participant_id uuid not null references profiles(id) on delete cascade,
  active_from date not null,
  active_to date
);
create index if not exists assignments_lookup on assignments (worker_id, participant_id, active_from, active_to);

-- ------------------------------------------------------------
-- 5. ACTIVITIES
--    Time blocks: 1=9-12, 2=12-3, 3=3-6, 4=6-9
--    notes is reused for the location chip (Lakes / Bairnsdale / Sale).
-- ------------------------------------------------------------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text,
  color text,
  category text,
  day_of_week int check (day_of_week between 1 and 7),
  start_block int check (start_block between 1 and 4),
  end_block int check (end_block between 1 and 4),
  mode participant_mode not null default 'program',
  notes text,
  eligible_participant_ids uuid[],
  practitioner_led boolean default false,
  bring_money_amount numeric(10,2)
);

-- ------------------------------------------------------------
-- 6. BOOKINGS
--    participant_id -> profiles(id) so PostgREST can embed the name.
--    Unique (participant_id,date,activity_id) makes upsert idempotent.
-- ------------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references profiles(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  date date not null,
  status booking_status not null default 'pending',
  worker_id uuid references workers(id),
  cancel_charge boolean default false,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  locked_at timestamptz,
  constraint bookings_unique unique (participant_id, date, activity_id)
);
create index if not exists bookings_participant_date on bookings (participant_id, date);
create index if not exists bookings_date on bookings (date);

-- ------------------------------------------------------------
-- 7. SERVICE REQUESTS
-- ------------------------------------------------------------
create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references profiles(id) on delete cascade,
  type service_type not null,
  detail text,
  status service_status not null default 'open',
  created_at timestamptz default now()
);
create index if not exists service_requests_status on service_requests (status, created_at desc);

-- ------------------------------------------------------------
-- 8. MESSAGES (participant <-> staff thread)
-- ------------------------------------------------------------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references profiles(id) on delete cascade,
  sender message_sender not null,
  body text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);
create index if not exists messages_thread on messages (participant_id, created_at);

-- ------------------------------------------------------------
-- 8b. AWAY PERIODS (participant tells staff when they'll be away)
-- ------------------------------------------------------------
create table if not exists away_periods (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz default now()
);
create index if not exists away_participant on away_periods (participant_id, start_date);

-- ------------------------------------------------------------
-- 9. NOTIFICATIONS LOG
-- ------------------------------------------------------------
create table if not exists notifications_log (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles(id),
  channel text not null,
  payload jsonb,
  sent_at timestamptz default now(),
  status text
);

-- ------------------------------------------------------------
-- 10. ORG SETTINGS (single row)
-- ------------------------------------------------------------
create table if not exists org_settings (
  id int primary key default 1 check (id = 1),
  late_cancel_cutoff_days int not null default 4,
  max_sessions_per_day int not null default 2
);
insert into org_settings (id) values (1) on conflict do nothing;

-- ============================================================
-- HELPERS
-- ============================================================
create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','worker'));
$$;

create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'));
$$;

-- Date comparisons use Melbourne local date (the org's timezone), not UTC —
-- otherwise assignments created in the AEST morning "start tomorrow".
create or replace function worker_assigned_to(p_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from assignments
    where worker_id = auth.uid() and participant_id = p_id
      and active_from <= (now() at time zone 'Australia/Melbourne')::date
      and (active_to is null or active_to >= (now() at time zone 'Australia/Melbourne')::date)
  );
$$;

-- Can the current staff user touch this participant's data?
-- Admins/managers: yes (everyone). Workers: only their assigned participants.
create or replace function staff_can(p_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select is_admin() or worker_assigned_to(p_id);
$$;

-- Verify a participant PIN (used by the serverless login function via service role).
-- Returns the participant uuid on success, null otherwise.
create or replace function verify_participant_pin(p_code text, p_pin text)
returns uuid language sql stable security definer set search_path = public, extensions as $$
  select id from participants
  where access_code = p_code and pin_hash is not null and pin_hash = crypt(p_pin, pin_hash)
  limit 1;
$$;

-- Set/replace a participant PIN (service role only in practice).
create or replace function set_participant_pin(p_id uuid, p_pin text)
returns void language sql security definer set search_path = public, extensions as $$
  update participants set pin_hash = crypt(p_pin, gen_salt('bf')) where id = p_id;
$$;

-- These SECURITY DEFINER functions must NOT be callable from the browser
-- (anon/authenticated) — only the serverless API via the service_role key.
-- Otherwise the public anon key could brute-force or reset PINs directly.
revoke execute on function verify_participant_pin(text, text) from anon, authenticated, public;
revoke execute on function set_participant_pin(uuid, text)     from anon, authenticated, public;
grant  execute on function verify_participant_pin(text, text) to service_role;
grant  execute on function set_participant_pin(uuid, text)     to service_role;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles          enable row level security;
alter table participants      enable row level security;
alter table workers           enable row level security;
alter table assignments       enable row level security;
alter table activities        enable row level security;
alter table bookings          enable row level security;
alter table service_requests  enable row level security;
alter table away_periods      enable row level security;
alter table messages          enable row level security;
alter table notifications_log enable row level security;
alter table org_settings      enable row level security;

-- profiles
-- profiles: self, admins (everyone), workers (their assigned participants only)
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (id = auth.uid() or staff_can(id));
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update using (id = auth.uid() or is_admin());

-- participants
drop policy if exists participants_read on participants;
create policy participants_read on participants for select using (id = auth.uid() or staff_can(id));
drop policy if exists participants_update on participants;
create policy participants_update on participants for update using (id = auth.uid() or staff_can(id));

-- workers
drop policy if exists workers_read on workers;
create policy workers_read on workers for select using (id = auth.uid() or is_staff());

-- assignments (worker sees own; admins manage all)
drop policy if exists assignments_read on assignments;
create policy assignments_read on assignments for select using (worker_id = auth.uid() or participant_id = auth.uid() or is_admin());
drop policy if exists assignments_write on assignments;
create policy assignments_write on assignments for all using (is_admin()) with check (is_admin());

-- activities (read: any signed-in user; write: admin/manager)
drop policy if exists activities_read on activities;
create policy activities_read on activities for select using (auth.uid() is not null);
drop policy if exists activities_write on activities;
create policy activities_write on activities for all using (is_admin()) with check (is_admin());

-- bookings (participant owns theirs; assigned worker/admin manage)
drop policy if exists bookings_read on bookings;
create policy bookings_read on bookings for select using (participant_id = auth.uid() or worker_id = auth.uid() or staff_can(participant_id));
drop policy if exists bookings_insert on bookings;
create policy bookings_insert on bookings for insert with check (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists bookings_update on bookings;
create policy bookings_update on bookings for update using (participant_id = auth.uid() or staff_can(participant_id)) with check (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists bookings_delete on bookings;
create policy bookings_delete on bookings for delete using (participant_id = auth.uid() or staff_can(participant_id));

-- service_requests
drop policy if exists service_read on service_requests;
create policy service_read on service_requests for select using (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists service_write on service_requests;
create policy service_write on service_requests for insert with check (participant_id = auth.uid());
drop policy if exists service_staff_update on service_requests;
create policy service_staff_update on service_requests for update using (staff_can(participant_id)) with check (staff_can(participant_id));

-- away_periods (participant manages own; assigned worker/admin manage)
drop policy if exists away_read on away_periods;
create policy away_read on away_periods for select using (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists away_self_write on away_periods;
create policy away_self_write on away_periods for all using (participant_id = auth.uid()) with check (participant_id = auth.uid());
drop policy if exists away_staff_write on away_periods;
create policy away_staff_write on away_periods for all using (staff_can(participant_id)) with check (staff_can(participant_id));

-- messages
drop policy if exists messages_read on messages;
create policy messages_read on messages for select using (participant_id = auth.uid() or staff_can(participant_id));
drop policy if exists messages_participant_insert on messages;
create policy messages_participant_insert on messages for insert with check (participant_id = auth.uid() and sender = 'participant');
drop policy if exists messages_staff_insert on messages;
create policy messages_staff_insert on messages for insert with check (staff_can(participant_id) and sender = 'staff');
drop policy if exists messages_participant_delete on messages;
create policy messages_participant_delete on messages for delete using (participant_id = auth.uid() and sender = 'participant');
drop policy if exists messages_staff_delete on messages;
create policy messages_staff_delete on messages for delete using (staff_can(participant_id));

-- notifications_log: staff only
drop policy if exists notif_staff on notifications_log;
create policy notif_staff on notifications_log for all using (is_staff()) with check (is_staff());

-- org_settings
drop policy if exists org_read on org_settings;
create policy org_read on org_settings for select using (auth.uid() is not null);
drop policy if exists org_write on org_settings;
create policy org_write on org_settings for all using (is_admin()) with check (is_admin());
