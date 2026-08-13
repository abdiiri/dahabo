-- =============================================================================
-- Migration 008 — salaries can target a driver directly
-- =============================================================================
-- salaries.profile_id required a public.profiles row, but driver logins are
-- now optional (migration 006), so most drivers have no profile row at all.
-- This adds driver_id as an alternative target so "money paid to a driver"
-- works regardless of whether they have a login, and makes profile_id
-- optional (still used for staff salaries). Safe to run more than once.
-- =============================================================================

alter table public.salaries alter column profile_id drop not null;
alter table public.salaries add column if not exists driver_id uuid references public.drivers (id) on delete cascade;

do $$ begin
  alter table public.salaries add constraint salaries_target_check
    check (profile_id is not null or driver_id is not null);
exception when duplicate_object then null; end $$;

create index if not exists salaries_driver_idx on public.salaries (driver_id);

-- Replace the finance-only RLS policies to also allow a driver to see their
-- own entries when they do have a login, same pattern as driver_payments.
drop policy if exists "salaries read (finance or own)" on public.salaries;
create policy "salaries read (finance or own)" on public.salaries
  for select using (public.is_finance() or profile_id = auth.uid() or driver_id = auth.uid());
