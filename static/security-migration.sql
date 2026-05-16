-- =============================================================
-- Security Hardening Migration
-- Run this in Supabase SQL Editor
-- Fixes search_path, locks down RPC exposure, tightens RLS
-- =============================================================

-- 1. Fix search_path on all functions (prevents name-hijacking attacks)

alter function public.decrement_available_copies(uuid) set search_path = '';
alter function public.increment_available_copies(uuid) set search_path = '';
alter function public.add_book_copies(text, integer) set search_path = '';
alter function public.delete_user(uuid) set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.prepare_profile_delete() set search_path = '';

-- 2. Lock down RPC access — internal functions must NOT be callable via REST
--    Only server-side through service_role should use these.

revoke execute on function public.decrement_available_copies(uuid) from anon, authenticated;
revoke execute on function public.increment_available_copies(uuid) from anon, authenticated;
revoke execute on function public.add_book_copies(text, integer) from anon, authenticated;
revoke execute on function public.delete_user(uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.prepare_profile_delete() from anon, authenticated;

-- 3. Tighten RLS policies on books (replace overly permissive UPDATE policy)
--    Only admins should update books. Server service_role bypasses RLS anyway.

-- books: remove the unrestricted update policy and replace with admin-only
drop policy if exists "System can update books" on public.books;

create policy "Admins can update books"
  on public.books for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- 4. Tighten RLS on reservations
--    System operations should only run via service_role (bypasses RLS).
--    Authenticated users should not be able to arbitrarily update/delete reservations.

drop policy if exists "System can update reservations" on public.reservations;
drop policy if exists "System can delete reservations" on public.reservations;

create policy "Staff can update reservations"
  on public.reservations for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')
  ));

create policy "Staff can delete reservations"
  on public.reservations for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')
  ));

-- 5. Tighten RLS on notifications
--    Only staff should be able to insert/delete notifications server-side.

drop policy if exists "System can insert notifications" on public.notifications;
drop policy if exists "System can delete notifications" on public.notifications;

create policy "Staff can insert notifications"
  on public.notifications for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')
  ));

create policy "Staff can delete notifications"
  on public.notifications for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')
  ));

-- 6. One-time: confirm any existing users stuck with unconfirmed emails
--    (Run only if you have pending users who registered before the fix.)
--    Uncomment if needed:
-- update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
