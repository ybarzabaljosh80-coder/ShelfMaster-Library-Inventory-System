-- =============================================================
-- Role Hierarchy Fix (Migration)
-- Run this in Supabase SQL Editor
--
-- Hierarchy:
--   moderator → manage books, borrows, reports, and users
--   admin     → all
--
-- Fixes:
--   1. Books RLS now allows moderators (not just admin)
--   2. All internal functions revoke public + authenticated access
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Fix search_path on all SECURITY DEFINER functions
-- ---------------------------------------------------------------
alter function public.decrement_available_copies(uuid) set search_path = '';
alter function public.increment_available_copies(uuid) set search_path = '';
alter function public.add_book_copies(text, integer) set search_path = '';
alter function public.delete_user(uuid) set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.prepare_profile_delete() set search_path = '';

-- ---------------------------------------------------------------
-- 2. Revoke RPC access from public/authenticated roles
-- ---------------------------------------------------------------
revoke execute on function public.decrement_available_copies(uuid) from anon, authenticated;
revoke execute on function public.increment_available_copies(uuid) from anon, authenticated;
revoke execute on function public.add_book_copies(text, integer) from anon, authenticated;
revoke execute on function public.delete_user(uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.prepare_profile_delete() from anon, authenticated;

-- ---------------------------------------------------------------
-- 3. Fix books RLS: admins and moderators can insert/update/delete
-- ---------------------------------------------------------------
drop policy if exists "Admins can insert books" on public.books;
drop policy if exists "Admins can delete books" on public.books;
drop policy if exists "Admins can update books" on public.books;
drop policy if exists "Staff can insert books" on public.books;
drop policy if exists "Staff can delete books" on public.books;
drop policy if exists "Staff can update books" on public.books;

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

-- ---------------------------------------------------------------
-- 4. Confirm existing unconfirmed emails (run only if needed)
-- ---------------------------------------------------------------
-- Uncomment if you have pending users who can't log in:
-- update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
