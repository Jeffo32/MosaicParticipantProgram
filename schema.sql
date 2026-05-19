-- Mosaic Participant Calendar — Supabase schema
-- Run in Supabase SQL editor when project is provisioned.
-- Order matters: tables first, then RLS policies.

-- ============================================================
-- 1. PROFILES (base table for all users)
-- ============================================================
create type user_role as enum ('participant', 'worker', 'admin', 'manager');
create type participant_mode as enum ('program', 'one_on_one', 'both');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  display_name text not null,
  phone text,
  photo_url text,
  mode participant_mode,
  pin text, -- hashed; participant PIN login
  created_at timestamptz default now()
);

-- ============================================================
-- 2. PARTICIPANT-SPECIFIC FIELDS
-- ============================================================
create table participants (
  id uuid primary key references profiles(id) on delete cascade,
  dislikes text,
  allergies text,
  behavioural_regulators text,
  life_background text,
  support_lead_id uuid references profiles(id)
);

-- ============================================================
-- 3. WORKER-SPECIFIC FIELDS
-- ============================================================
create table workers (
  id uuid primary key references profiles(id) on delete cascade,
  practitioner_types text[],
  hourly_rate numeric(10,2)
);

-- ============================================================
-- 4. ASSIGNMENTS (worker <-> participant scoping)
-- ============================================================
create table assignments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  active_from date not null,
  active_to date
);
create index assignments_lookup on assignments (worker_id, participant_id, active_from, active_to);

-- ============================================================
-- 5. ACTIVITIES
-- ============================================================
-- Time blocks: 1=9-12, 2=12-3, 3=3-6, 4=6-9
create table activities (
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

-- ============================================================
-- 6. BOOKINGS
-- ============================================================
create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'late_cancelled');

create table bookings (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  activity_id uuid not null references activities(id),
  date date not null,
  status booking_status not null default 'pending',
  worker_id uuid references workers(id),
  cancel_charge boolean default false,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  locked_at timestamptz
);
create index bookings_participant_date on bookings (participant_id, date);

-- ============================================================
-- 7. SERVICE REQUESTS
-- ============================================================
create type service_type as enum ('doctor', 'cleaning', 'garden', 'overwhelmed', 'respite', 'other');
create type service_status as enum ('open', 'actioned', 'closed');

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  type service_type not null,
  detail text,
  status service_status not null default 'open',
  created_at timestamptz default now()
);

-- ============================================================
-- 8. NOTIFICATIONS LOG (SMS/email/push delivery records)
-- ============================================================
create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles(id),
  channel text not null,
  payload jsonb,
  sent_at timestamptz default now(),
  status text
);

-- ============================================================
-- 9. ORG SETTINGS (single row)
-- ============================================================
create table org_settings (
  id int primary key default 1 check (id = 1),
  late_cancel_cutoff_days int not null default 4
);
insert into org_settings (id) values (1) on conflict do nothing;

-- ============================================================
-- RLS — turn on for everything
-- ============================================================
alter table profiles enable row level security;
alter table participants enable row level security;
alter table workers enable row level security;
alter table assignments enable row level security;
alter table activities enable row level security;
alter table bookings enable row level security;
alter table service_requests enable row level security;
alter table notifications_log enable row level security;
alter table org_settings enable row level security;

-- helper: is current user admin or manager?
create or replace function is_staff() returns boolean language sql stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin','manager')
  );
$$;

-- helper: does current user (worker) have an active assignment to participant?
create or replace function worker_assigned_to(p_id uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from assignments
    where worker_id = auth.uid()
      and participant_id = p_id
      and active_from <= current_date
      and (active_to is null or active_to >= current_date)
  );
$$;

-- profiles
create policy profiles_self_read on profiles for select using (id = auth.uid() or is_staff());
create policy profiles_self_update on profiles for update using (id = auth.uid() or is_staff());
create policy profiles_staff_insert on profiles for insert with check (is_staff());

-- participants
create policy participants_read on participants for select using (
  id = auth.uid() or is_staff() or worker_assigned_to(id)
);
create policy participants_self_update on participants for update using (id = auth.uid() or is_staff());

-- workers
create policy workers_read on workers for select using (id = auth.uid() or is_staff());

-- assignments
create policy assignments_read on assignments for select using (
  worker_id = auth.uid() or participant_id = auth.uid() or is_staff()
);
create policy assignments_staff_write on assignments for all using (is_staff()) with check (is_staff());

-- activities (read open to all authenticated; writes staff-only)
create policy activities_read on activities for select using (auth.uid() is not null);
create policy activities_staff_write on activities for all using (is_staff()) with check (is_staff());

-- bookings
create policy bookings_participant_rw on bookings for all
  using (participant_id = auth.uid() or worker_id = auth.uid() or is_staff())
  with check (participant_id = auth.uid() or is_staff());

-- service_requests
create policy service_self_rw on service_requests for all
  using (participant_id = auth.uid() or is_staff())
  with check (participant_id = auth.uid() or is_staff());

-- notifications_log: staff only
create policy notif_staff on notifications_log for all using (is_staff()) with check (is_staff());

-- org_settings: read-all, write-staff
create policy org_read on org_settings for select using (auth.uid() is not null);
create policy org_staff_write on org_settings for all using (is_staff()) with check (is_staff());
