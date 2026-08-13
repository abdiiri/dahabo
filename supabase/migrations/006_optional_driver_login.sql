-- =============================================================================
-- Migration 006 — driver login becomes optional
-- =============================================================================
-- Previously every driver record required a Supabase Auth account (drivers.id
-- referenced profiles.id), which meant adding a driver always needed
-- SUPABASE_SERVICE_ROLE_KEY configured on the server. That's no longer
-- required: drivers now store their own name/email/phone directly, and a
-- login is only created when explicitly requested. Existing driver rows
-- (which do have a login) are backfilled from profiles so nothing is lost.
-- Safe to run more than once.
-- =============================================================================

alter table public.drivers drop constraint if exists drivers_id_fkey;
alter table public.drivers alter column id set default gen_random_uuid();

alter table public.drivers add column if not exists full_name text not null default '';
alter table public.drivers add column if not exists email text;
alter table public.drivers add column if not exists phone text;
alter table public.drivers add column if not exists has_login boolean not null default false;
alter table public.drivers add column if not exists account_status text not null default 'active';

do $$ begin
  alter table public.drivers add constraint drivers_account_status_check
    check (account_status in ('active', 'suspended'));
exception when duplicate_object then null; end $$;

-- Backfill existing driver rows (created under the old login-required flow)
-- from their linked profile, one time only.
update public.drivers d
set
  full_name = coalesce(nullif(d.full_name, ''), p.full_name),
  email = coalesce(d.email, p.email),
  phone = coalesce(d.phone, p.phone),
  has_login = true,
  account_status = coalesce(p.status, 'active')
from public.profiles p
where p.id = d.id and (d.full_name = '' or d.full_name is null);
