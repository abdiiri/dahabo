-- =============================================================================
-- Migration 034 — Sequential customer codes, starting at 1
-- =============================================================================
-- Same fix as migration 024 (Fleet) and 031 (Fuel), applied to the
-- Customers tab. Right now a new customer's code is generated on the
-- frontend from the current timestamp (e.g. "CUS-483920"), so codes don't
-- start at 1 and don't stay dense when a customer is removed. This
-- migration moves customer numbering into the database, the same way
-- transport orders / trips / fuel records / vehicles already work:
--   • A customer_code is assigned by a database trigger on insert — always
--     the next number after the highest one currently in use among active
--     (non-deleted) customers, so the very first customer is "CUS-1".
--   • Uniqueness only applies to active (non-deleted) customers, so a
--     soft-deleted customer sitting in the Recycle Bin never blocks that
--     number from being reused.
--   • Deleting (soft-delete), restoring, or permanently deleting a
--     customer re-numbers every active customer back to a clean 1, 2, 3…
--     — so deleting CUS-1 out of 6 shifts CUS-2..CUS-6 down to
--     CUS-1..CUS-5, exactly like Fleet.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Uniqueness only among active (non-deleted) customers.
-- -----------------------------------------------------------------------------
alter table public.customers
  drop constraint if exists customers_customer_code_key;
drop index if exists public.customers_customer_code_active_key;
create unique index customers_customer_code_active_key
  on public.customers (customer_code)
  where deleted_at is null;

-- -----------------------------------------------------------------------------
-- 2. Renumber routine — two-phase (temp code, then final code) so active
--    customers never collide with each other or with deleted customers
--    while it runs. Mirrors public.renumber_vehicle_codes() from
--    migration 024.
-- -----------------------------------------------------------------------------
create or replace function public.renumber_customer_codes()
returns void
language plpgsql
as $$
declare
  r record;
  v_ref integer := 0;
begin
  lock table public.customers in share row exclusive mode;

  -- Park every active customer on a harmless temp code first...
  update public.customers
  set customer_code = 'TMP-' || id::text
  where deleted_at is null;

  -- ...then hand out clean 1..N, oldest first. Nothing active is sitting
  -- on a real "CUS-N" value right now, so this can't collide.
  for r in
    select id from public.customers
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_ref := v_ref + 1;
    update public.customers set customer_code = 'CUS-' || v_ref where id = r.id;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Trigger — renumber whenever a customer is soft-deleted, restored, or
--    permanently removed.
-- -----------------------------------------------------------------------------
create or replace function public.trigger_renumber_customer_codes()
returns trigger
language plpgsql
as $$
begin
  perform public.renumber_customer_codes();
  return null; -- AFTER trigger, return value is ignored
end;
$$;

drop trigger if exists customers_renumber on public.customers;
create trigger customers_renumber
  after update of deleted_at or delete on public.customers
  for each row execute function public.trigger_renumber_customer_codes();

-- -----------------------------------------------------------------------------
-- 4. Insert-time numbering — always the next number after the highest one
--    among active customers, so a brand-new customer never picks up a
--    number a deleted customer happens to still be wearing.
-- -----------------------------------------------------------------------------
create or replace function public.set_customer_code()
returns trigger
language plpgsql
as $$
declare
  v_next integer;
begin
  lock table public.customers in share row exclusive mode;

  select coalesce(max(public.extract_ref_number(customer_code)), 0) + 1
  into v_next
  from public.customers
  where deleted_at is null;

  new.customer_code := 'CUS-' || v_next;
  return new;
end;
$$;

drop trigger if exists customers_set_code on public.customers;
create trigger customers_set_code
  before insert on public.customers
  for each row execute function public.set_customer_code();

-- -----------------------------------------------------------------------------
-- 5. Run it now — active customers land on a clean 1, 2, 3…
-- -----------------------------------------------------------------------------
select public.renumber_customer_codes();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
