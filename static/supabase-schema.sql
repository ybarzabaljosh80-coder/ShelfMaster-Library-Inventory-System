-- =============================================================
-- Library System — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- 1. profiles (extends auth.users)
create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  name       text not null,
  role       text not null default 'user' check (role in ('user', 'staff', 'moderator', 'admin')),
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
  force_returned_by uuid references public.profiles(id)
);

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

create policy "Admins can insert books"
  on public.books for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can delete books"
  on public.books for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "System can update books"
  on public.books for update
  using (true);

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
    'user'
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
returns void language plpgsql security definer as $$
begin
  update public.books
  set available_copies = available_copies - 1
  where id = book_id_input and available_copies > 0;
end;
$$;

create or replace function public.increment_available_copies(book_id_input uuid)
returns void language plpgsql security definer as $$
begin
  update public.books
  set available_copies = least(available_copies + 1, total_copies)
  where id = book_id_input;
end;
$$;

create or replace function public.add_book_copies(serial text, extra integer)
returns void language plpgsql security definer as $$
begin
  update public.books
  set total_copies = total_copies + extra,
      available_copies = available_copies + extra
  where serial_no = serial;
end;
$$;

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
create policy "System can update reservations" on public.reservations for update using (true);
create policy "System can delete reservations" on public.reservations for delete using (true);

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
create policy "System can insert notifications" on public.notifications for insert with check (true);
create policy "System can delete notifications" on public.notifications for delete using (true);
