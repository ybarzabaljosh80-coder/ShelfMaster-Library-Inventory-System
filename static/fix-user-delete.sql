-- Run this once in the Supabase SQL Editor for existing databases.
-- It lets user deletion clean returned borrow history while still blocking users with active borrows.

begin;

alter table public.borrow_records
  drop constraint if exists borrow_records_user_id_fkey;

alter table public.borrow_records
  add constraint borrow_records_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete restrict;

alter table public.borrow_records
  drop constraint if exists borrow_records_force_returned_by_fkey;

alter table public.borrow_records
  add constraint borrow_records_force_returned_by_fkey
  foreign key (force_returned_by) references public.profiles(id) on delete set null;

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

drop trigger if exists before_profile_delete on public.profiles;

create trigger before_profile_delete
  before delete on public.profiles
  for each row execute procedure public.prepare_profile_delete();

commit;
