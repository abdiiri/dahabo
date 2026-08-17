-- =============================================================================
-- Migration 024 — Sequential vehicle (Fleet) codes, starting at 1
-- =============================================================================
-- Same fix as migration 023, applied to the Fleet tab. Right now a new
-- vehicle's code is generated on the frontend from the current timestamp
-- (e.g. "VEH-483920"), so codes don't start at 1 and don't stay dense when
-- a vehicle is removed. This migration moves vehicle numbering into the
-- database, the same way transport orders / trips / fuel records already
-- work:
--   • A vehicle_code is assigned by a database trigger on insert — always
--     the next number after the highest one currently in use among active
--     (non-deleted) vehicles, so the very first vehicle is "VEH-1".
--   • Uniqueness only applies to active (non-deleted) vehicles, so a
--     soft-deleted vehicle sitting in the Recycle Bin never blocks that
--     number from being reused.
--   • Deleting (soft-delete) or restoring a vehicle re-numbers every active
--     vehicle back to a clean 1, 2, 3… — so deleting VEH-1 out of 6 shifts
--     VEH-2..VEH-6 down to VEH-1..VEH-5, exactly like Transport Orders.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Uniqueness only among active (non-deleted) vehicles.
-- -----------------------------------------------------------------------------
alter table public.vehicles
  drop constraint if exists vehicles_vehicle_code_key;
drop index if exists public.vehicles_vehicle_code_active_key;
create unique index vehicles_vehicle_code_active_key
  on public.vehicles (vehicle_code)
  where deleted_at is null;

-- -----------------------------------------------------------------------------
-- 2. Renumber routine — two-phase (temp code, then final code) so active
--    vehicles never collide with each other or with deleted vehicles while
--    it runs. Mirrors public.renumber_fleet_codes() from migration 023.
-- -----------------------------------------------------------------------------
create or replace function public.renumber_vehicle_codes()
returns void
language plpgsql
as $$
declare
  r record;
  v_ref integer := 0;
begin
  lock table public.vehicles in share row exclusive mode;

  -- Park every active vehicle on a harmless temp code first...
  update public.vehicles
  set vehicle_code = 'TMP-' || id::text
  where deleted_at is null;

  -- ...then hand out clean 1..N, oldest first. Nothing active is sitting
  -- on a real "VEH-N" value right now, so this can't collide.
  for r in
    select id from public.vehicles
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_ref := v_ref + 1;
    update public.vehicles set vehicle_code = 'VEH-' || v_ref where id = r.id;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Trigger — renumber whenever a vehicle is soft-deleted, restored, or
--    permanently removed.
-- -----------------------------------------------------------------------------
create or replace function public.trigger_renumber_vehicle_codes()
returns trigger
language plpgsql
as $$
begin
  perform public.renumber_vehicle_codes();
  return null; -- AFTER trigger, return value is ignored
end;
$$;

drop trigger if exists vehicles_renumber on public.vehicles;
create trigger vehicles_renumber
  after update of deleted_at or delete on public.vehicles
  for each row execute function public.trigger_renumber_vehicle_codes();

-- -----------------------------------------------------------------------------
-- 4. Insert-time numbering — always the next number after the highest one
--    among active vehicles, so a brand-new vehicle never picks up a number
--    a deleted vehicle happens to still be wearing.
-- -----------------------------------------------------------------------------
create or replace function public.set_vehicle_code()
returns trigger
language plpgsql
as $$
declare
  v_next integer;
begin
  lock table public.vehicles in share row exclusive mode;

  select coalesce(max(public.extract_ref_number(vehicle_code)), 0) + 1
  into v_next
  from public.vehicles
  where deleted_at is null;

  new.vehicle_code := 'VEH-' || v_next;
  return new;
end;
$$;

drop trigger if exists vehicles_set_code on public.vehicles;
create trigger vehicles_set_code
  before insert on public.vehicles
  for each row execute function public.set_vehicle_code();

-- -----------------------------------------------------------------------------
-- 5. Run it now — active vehicles land on a clean 1, 2, 3…
-- -----------------------------------------------------------------------------
select public.renumber_vehicle_codes();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
