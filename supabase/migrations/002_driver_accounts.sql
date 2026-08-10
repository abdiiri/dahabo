-- =============================================================================
-- Migration 002 — driver login accounts & cash advances
-- =============================================================================
-- Run this once in your Supabase project's SQL editor (same place you ran
-- supabase/schema.sql). Safe to run on a project that already has schema.sql
-- applied; it only adds new things.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Force a password change on first login.
--    Set to true whenever an admin creates an account for someone (staff or
--    driver) with a temporary password; cleared once they set their own.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- -----------------------------------------------------------------------------
-- 2. Licence expiry is no longer required up front — admins can add it later.
-- -----------------------------------------------------------------------------
alter table public.drivers
  alter column license_expiry drop not null;

-- -----------------------------------------------------------------------------
-- 3. Driver cash advances — money handed to a driver, and their write-up of
--    how it was spent.
-- -----------------------------------------------------------------------------
create table if not exists public.driver_advances (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null,
  purpose text,
  given_by uuid references public.profiles (id) on delete set null,
  given_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'reported')),
  usage_amount numeric(12, 2),
  usage_report text,
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger driver_advances_set_updated_at before update on public.driver_advances
  for each row execute function public.set_updated_at();

alter table public.driver_advances enable row level security;

-- Drivers can see their own advances; staff (non-driver roles) can see all.
create policy "driver_advances read (staff or own)" on public.driver_advances
  for select using (public.is_staff() or driver_id = auth.uid());

-- Only staff record that money was handed out.
create policy "driver_advances insert (staff)" on public.driver_advances
  for insert with check (public.is_staff());

-- Staff can edit anything; a driver can only update their own row (to file
-- their usage report) — the trigger below stops them changing the amount
-- staff recorded.
create policy "driver_advances update (staff or own)" on public.driver_advances
  for update using (public.is_staff() or driver_id = auth.uid());

create policy "driver_advances delete (staff)" on public.driver_advances
  for delete using (public.is_staff());

-- A driver filing their usage report may only change the usage_* fields and
-- status — not the amount/purpose/who-gave-it that staff recorded.
create or replace function public.protect_driver_advance_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    new.amount := old.amount;
    new.purpose := old.purpose;
    new.given_by := old.given_by;
    new.given_at := old.given_at;
    new.driver_id := old.driver_id;
  end if;
  return new;
end;
$$;

create trigger driver_advances_protect_fields before update on public.driver_advances
  for each row execute function public.protect_driver_advance_fields();

-- =============================================================================
-- Done.
-- =============================================================================
