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