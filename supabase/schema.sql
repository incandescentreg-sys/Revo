-- ============================================================
--  REVO — Supabase schema
--  Run this in Supabase → SQL Editor → New query
-- ============================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto";

-- ---------- USERS ----------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  name text not null default 'Пользователь',
  theme text not null default 'auto',            -- 'light' | 'dark' | 'auto'
  notifications_enabled boolean not null default false,
  notification_time text not null default '21:00', -- HH:mm local (Europe/Moscow default)
  chat_id text,                                   -- Telegram chat_id set on first bot interaction
  partner_id uuid,                                -- mutual partner link (0002)
  notify_partner_on_event boolean not null default false, -- tell partner when I mark (0002)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- EVENTS ----------
-- Every recorded "mark". event_date is the local calendar day, event_time the local time.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_date date not null,
  event_time time not null default current_time,
  mood text,                                       -- emoji label, optional
  comment text,                                    -- free text, optional
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_user_date_idx on public.events (user_id, event_date desc);
create index if not exists events_user_idx on public.events (user_id);

-- ---------- GOALS ----------
-- A single active goal per user at a time.
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal_days integer not null check (goal_days in (7, 14, 30, 60, 90)),
  start_date date not null,
  status text not null default 'active',            -- 'active' | 'completed' | 'failed' | 'cancelled'
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals (user_id);

-- ---------- ACHIEVEMENTS ----------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  code text not null,                             -- e.g. 'day_3', 'day_7', 'day_14' ...
  unlocked_at timestamptz not null default now(),
  unique (user_id, code)
);
create index if not exists achievements_user_idx on public.achievements (user_id);

-- ---------- TELEGRAM NOTIFICATION LOG ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,                             -- 'reminder' | 'achievement' | 'goal'
  payload jsonb,
  sent_to_telegram boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ============================================================
--  ROW LEVEL SECURITY
--  Every table is strictly scoped to the owning, authenticated user.
--  We authenticate Telegram users with a custom Supabase JWT whose
--  `sub` claim equals the row's user_id → auth.uid() works normally.
-- ============================================================

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.goals enable row level security;
alter table public.achievements enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- The auth route (server) creates/upserts the user row with the
-- service role, so ordinary users never INSERT their own row.
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own" on public.events
  for select using (auth.uid() = user_id);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events
  for insert with check (auth.uid() = user_id);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own" on public.events
  for delete using (auth.uid() = user_id);

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own" on public.goals
  for delete using (auth.uid() = user_id);

drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own" on public.achievements
  for select using (auth.uid() = user_id);

drop policy if exists "achievements_insert_own" on public.achievements;
create policy "achievements_insert_own" on public.achievements
  for insert with check (auth.uid() = user_id);

drop policy if exists "achievements_delete_own" on public.achievements;
create policy "achievements_delete_own" on public.achievements
  for delete using (auth.uid() = user_id);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);

-- ============================================================
--  OPTIONAL: anonymous read gate
--  Guarantees nobody can SELECT anything without a valid token.
--  With RLS policies above, auth.uid() is NULL for anonymous
--  requests, so they already match nothing. Nothing more to add.
-- ============================================================

-- ---------- GRANTS (safe defaults for Supabase) ----------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on all tables in schema public to anon;

-- ============================================================
--  PARTNER FEATURE (merged from migrations/0002_partner.sql)
-- ============================================================
-- ============================================================
--  REVO — Migration 0002: partner feature
--  Run this in Supabase → SQL Editor → New query
--  Adds mutual partner linking + partner read access + notify opt-in
-- ============================================================

-- 1) New columns on users
alter table public.users
  add column if not exists partner_id uuid references public.users(id) on delete set null,
  add column if not exists notify_partner_on_event boolean not null default false;

-- 2) RLS: a user may READ their partner's profile row
create policy "users_select_partner" on public.users
  for select using (id = (select partner_id from public.users where id = auth.uid()));

-- 3) RLS: a user may READ their partner's events (own data is covered by
--    the existing "events_select_own" policy). Partner can only read, never edit.
create policy "events_select_partner" on public.events
  for select using (user_id = (select partner_id from public.users where id = auth.uid()));

-- 4) RLS: partner may read partner's goals and achievements
create policy "goals_select_partner" on public.goals
  for select using (user_id = (select partner_id from public.users where id = auth.uid()));

create policy "achievements_select_partner" on public.achievements
  for select using (user_id = (select partner_id from public.users where id = auth.uid()));

-- 5) Notifications: a user can read notifications about their OWN rows only
--    (existing policy covers this). No change needed.
