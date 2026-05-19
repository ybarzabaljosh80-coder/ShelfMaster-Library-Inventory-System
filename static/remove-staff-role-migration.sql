-- =============================================================
-- Remove Staff Role (Migration)
-- Run this in Supabase SQL Editor after deploying the app change.
-- Existing staff accounts are downgraded to user before tightening
-- the profiles.role check constraint.
-- =============================================================

update public.profiles
set role = 'user'
where role = 'staff';

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('pending', 'user', 'moderator', 'admin'));

drop policy if exists "Staff can insert books" on public.books;
drop policy if exists "Staff can delete books" on public.books;
drop policy if exists "Staff can update books" on public.books;
drop policy if exists "Admins and moderators can insert books" on public.books;
drop policy if exists "Admins and moderators can delete books" on public.books;
drop policy if exists "Admins and moderators can update books" on public.books;

create policy "Admins and moderators can insert books"
  on public.books for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')
  ));

create policy "Admins and moderators can delete books"
  on public.books for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')
  ));

create policy "Admins and moderators can update books"
  on public.books for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')
  ))
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')
  ));

drop policy if exists "Admins can view all reservations" on public.reservations;
drop policy if exists "Staff can update reservations" on public.reservations;
drop policy if exists "Staff can delete reservations" on public.reservations;
drop policy if exists "Admins and moderators can view all reservations" on public.reservations;
drop policy if exists "Admins and moderators can update reservations" on public.reservations;
drop policy if exists "Admins and moderators can delete reservations" on public.reservations;

create policy "Admins and moderators can view all reservations"
  on public.reservations for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')
  ));

create policy "Admins and moderators can update reservations"
  on public.reservations for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')
  ));

create policy "Admins and moderators can delete reservations"
  on public.reservations for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')
  ));

drop policy if exists "Staff can insert notifications" on public.notifications;
drop policy if exists "Staff can delete notifications" on public.notifications;
drop policy if exists "Admins and moderators can insert notifications" on public.notifications;
drop policy if exists "Admins and moderators can delete notifications" on public.notifications;

create policy "Admins and moderators can insert notifications"
  on public.notifications for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')
  ));

create policy "Admins and moderators can delete notifications"
  on public.notifications for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')
  ));
