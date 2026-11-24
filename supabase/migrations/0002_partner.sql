-- ============================================================
--  REVO — Migration 0002 (FIXED): partner feature
--  Run this in Supabase → SQL Editor → New query
--  Adds mutual partner linking + partner read access + notify opt-in
--
--  FIX: previous version caused "infinite recursion detected in policy
--  for relation users" because the partner policy subqueries the same
--  table. We now resolve the partner_id through a SECURITY DEFINER
--  function (which bypasses RLS and breaks the recursion loop).
-- ============================================================

-- 1) Helper: partner_id of a given user id, bypasses RLS.
create or replace function public.current_partner_id(uid uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select partner_id from public.users where id = uid
$$;

-- 2) Drop the old (recursive) partner policies if they exist.
drop policy if exists "users_select_partner" on public.users;
drop policy if exists "events_select_partner" on public.events;
drop policy if exists "goals_select_partner" on public.goals;
drop policy if exists "achievements_select_partner" on public.achievements;

-- 3) New columns on users (idempotent).
alter table public.users
  add column if not exists partner_id uuid references public.users(id) on delete set null,
  add column if not exists notify_partner_on_event boolean not null default false;

-- 4) Partner read policies (use the helper to avoid recursion).
create policy "users_select_partner" on public.users
  for select using (id = public.current_partner_id(auth.uid()));

create policy "events_select_partner" on public.events
  for select using (user_id = public.current_partner_id(auth.uid()));

create policy "goals_select_partner" on public.goals
  for select using (user_id = public.current_partner_id(auth.uid()));

create policy "achievements_select_partner" on public.achievements
  for select using (user_id = public.current_partner_id(auth.uid()));