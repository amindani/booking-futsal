-- Lapanganin: public booking + automatic Midtrans payment
-- Run this once in Supabase SQL Editor after reviewing the existing schema.
-- This migration is additive; it does not delete existing bookings.

alter table public.bookings
  alter column user_id drop not null,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_provider text,
  add column if not exists payment_order_id text unique,
  add column if not exists payment_token text,
  add column if not exists payment_url text,
  add column if not exists paid_at timestamptz;

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending','confirmed','cancelled','completed'));

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;

alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('unpaid','pending','paid','failed','expired','refunded'));

alter table public.courts
  add column if not exists operational_status text not null default 'available';

alter table public.courts
  drop constraint if exists courts_operational_status_check;

alter table public.courts
  add constraint courts_operational_status_check
  check (operational_status in ('available','occupied','maintenance'));

create index if not exists bookings_court_date_status_idx
  on public.bookings(court_id, booking_date, status, payment_status);

-- Customer personal data and bookings are not publicly readable.
-- Public booking creation and payment status updates are handled by Edge Functions
-- using server-side credentials. Keep existing authenticated/admin policies intact.
drop policy if exists "Users create own bookings" on public.bookings;
create policy "Users create own bookings"
on public.bookings for insert to authenticated
with check ((select auth.uid()) = user_id);

-- Do not grant anon SELECT on bookings. Admin access remains controlled by app_metadata.role.
