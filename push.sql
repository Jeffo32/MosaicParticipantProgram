-- ============================================================
-- Mosaic — Web Push subscriptions (admin notifications)
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Stores each staff device's push subscription so /api/notify
-- can alert admins when a participant sends a message.
-- ============================================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_user on push_subscriptions (user_id);

-- RLS on: only the owner (or the service_role used by /api) can touch a row.
alter table push_subscriptions enable row level security;
drop policy if exists push_own on push_subscriptions;
create policy push_own on push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
