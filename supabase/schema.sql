-- Lapanganin database schema
-- Run on a fresh Supabase project.

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  address text,
  surface text not null check (surface in ('vinyl','rumput','interlock')),
  description text,
  image_url text,
  price_per_hour integer not null check (price_per_hour > 0),
  opening_time time not null default '08:00',
  closing_time time not null default '23:00',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  court_id uuid not null references public.courts(id),
  booking_date date not null check (booking_date >= current_date),
  start_time time not null,
  duration_hours integer not null check (duration_hours between 1 and 5),
  total_price integer not null check (total_price > 0),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  customer_note text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_user_id_created_at_idx on public.bookings(user_id, created_at desc);
create index if not exists bookings_court_date_idx on public.bookings(court_id, booking_date, start_time);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.courts enable row level security;
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;

create policy "Public can view active courts"
on public.courts for select to anon, authenticated
using (is_active = true or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins manage courts"
on public.courts for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Users view own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Users update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users view own bookings or admins view all"
on public.bookings for select to authenticated
using ((select auth.uid()) = user_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Users create own bookings"
on public.bookings for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Admins update bookings"
on public.bookings for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant usage on schema public to anon, authenticated;
grant select on public.courts to anon, authenticated;
grant insert, update, delete on public.courts to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.bookings to authenticated;
