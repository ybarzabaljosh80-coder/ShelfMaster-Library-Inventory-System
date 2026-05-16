-- =============================================================
-- Library System — Supabase Schema (Hardened)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- 1. profiles (extends auth.users)
create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  name       text not null,
  role       text not null default 'pending' check (role in ('pending', 'user', 'staff', 'moderator', 'admin')),
  created_at timestamptz default now() not null
);

-- 2. books
create table public.books (
  id               uuid default gen_random_uuid() primary key,
  title            text not null,
  author           text not null,
  serial_no        text unique not null,
  total_copies     integer not null default 1,
  available_copies integer not null default 1,
  created_at       timestamptz default now() not null
);

-- 3. borrow_records
create table public.borrow_records (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references public.profiles(id) on delete restrict not null,
  book_id           uuid references public.books(id) on delete set null,
  borrowed_at       timestamptz default now() not null,
  due_date          timestamptz not null,
  returned_at       timestamptz,
  force_returned    boolean default false not null,
  force_returned_by uuid references public.profiles(id) on delete set null
);

create or replace function public.prepare_profile_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.borrow_records
    where user_id = old.id and returned_at is null
  ) then
    raise exception 'Cannot delete user with active borrow records';
  end if;

  update public.borrow_records
  set force_returned_by = null
  where force_returned_by = old.id;

  delete from public.borrow_records
  where user_id = old.id;

  return old;
end;
$$;

create trigger before_profile_delete
  before delete on public.profiles
  for each row execute procedure public.prepare_profile_delete();

-- =============================================================
-- Row Level Security
-- =============================================================

alter table public.profiles      enable row level security;
alter table public.books         enable row level security;
alter table public.borrow_records enable row level security;

-- profiles
create policy "Users can view profiles"
  on public.profiles for select
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- books
create policy "Authenticated users can view books"
  on public.books for select
  to authenticated
  using (true);

create policy "Staff can insert books"
  on public.books for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')
  ));

create policy "Staff can delete books"
  on public.books for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')
  ));

create policy "Staff can update books"
  on public.books for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')
  ))
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')
  ));

-- borrow_records
create policy "Users can view own borrow records"
  on public.borrow_records for select
  using (auth.uid() = user_id);

create policy "Admins can view all borrow records"
  on public.borrow_records for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Users can insert borrow records"
  on public.borrow_records for insert
  with check (auth.uid() = user_id);

create policy "Users and admins can update borrow records"
  on public.borrow_records for update
  using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================================
-- Trigger: auto-insert profile row on new auth.users signup
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    'pending'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================
-- RPC functions for atomic copy count updates
-- =============================================================

create or replace function public.decrement_available_copies(book_id_input uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.books
  set available_copies = available_copies - 1
  where id = book_id_input and available_copies > 0;
end;
$$;

create or replace function public.increment_available_copies(book_id_input uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.books
  set available_copies = least(available_copies + 1, total_copies)
  where id = book_id_input;
end;
$$;

create or replace function public.add_book_copies(serial text, extra integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.books
  set total_copies = total_copies + extra,
      available_copies = available_copies + extra
  where serial_no = serial;
end;
$$;

-- =============================================================
-- Secure user deletion (bypasses GoTrue API limitations)
-- =============================================================

create or replace function public.delete_user(target_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from auth.identities where user_id = target_user_id;
  delete from auth.sessions where user_id = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;

-- =============================================================
-- Lock down RPC access (prevent anon/authenticated from calling internal functions)
-- =============================================================

revoke execute on function public.decrement_available_copies(uuid) from anon, authenticated;
revoke execute on function public.increment_available_copies(uuid) from anon, authenticated;
revoke execute on function public.add_book_copies(text, integer) from anon, authenticated;
revoke execute on function public.delete_user(uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.prepare_profile_delete() from anon, authenticated;

-- =============================================================
-- Reservations + Notifications
-- =============================================================

create table public.reservations (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  book_id     uuid references public.books(id) on delete cascade not null,
  status      text not null default 'waiting' check (status in ('waiting', 'ready', 'fulfilled', 'cancelled', 'expired')),
  position    integer not null,
  created_at  timestamptz default now() not null,
  ready_at    timestamptz,
  expires_at  timestamptz
);

alter table public.reservations enable row level security;
create policy "Users can view own reservations" on public.reservations for select using (auth.uid() = user_id);
create policy "Admins can view all reservations" on public.reservations for select using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')));
create policy "Users can insert own reservations" on public.reservations for insert with check (auth.uid() = user_id);
create policy "Staff can update reservations" on public.reservations for update using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')));
create policy "Staff can delete reservations" on public.reservations for delete using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')));

create table public.notifications (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  type         text not null check (type in ('reservation_ready', 'due_soon', 'due_today', 'overdue')),
  title        text not null,
  message      text not null,
  read         boolean default false not null,
  reference_id uuid,
  created_at   timestamptz default now() not null
);

alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Staff can insert notifications" on public.notifications for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')));
create policy "Staff can delete notifications" on public.notifications for delete using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff', 'moderator')));
