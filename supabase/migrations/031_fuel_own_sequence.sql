-- =============================================================================
-- Migration 031 — Fuel records get their own sequence, like transport
-- orders and trips
-- =============================================================================
-- Problem this fixes: since migration 015, a fuel record linked to a trip
-- reused that trip's number (trip TRIP-4 -> fuel FUEL-4), and — because a
-- trip is often refuelled more than once — several fuel records could end
-- up sharing the exact same FUEL-4 code. That made the Fuel tab confusing
-- to scan (duplicate numbers) and meant fuel numbers didn't run in the
-- order fill-ups were actually logged, unlike Transport Orders and Trips.
--
-- What this does instead:
--   • Fuel records always draw a fresh, dense number of their own — FUEL-1,
--     FUEL-2, FUEL-3… by creation order — exactly like transport orders and
--     trips, regardless of which trip (if any) the fill-up is linked to.
--   • A fuel record can still be linked to a trip (trip_id is untouched)
--     and the app now shows that trip's own code in a separate "Trip"
--     column, so the connection is still visible — it's just no longer
--     baked into the fuel number itself.
--   • One-time renumber of existing (non-deleted) fuel records, oldest
--     first, so the table restarts cleanly at FUEL-1.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Insert-time numbering — fuel records no longer look at trip_id.
-- -----------------------------------------------------------------------------
create or replace function public.set_fuel_code()
returns trigger
language plpgsql
as $$
declare
  v_ref integer;
begin
  lock table public.fuel_records in share row exclusive mode;

  select coalesce(max(public.extract_ref_number(fuel_code)), 0) + 1
  into v_ref
  from public.fuel_records
  where deleted_at is null;

  new.fuel_code := 'FUEL-' || v_ref;
  return new;
end;
$$;

drop trigger if exists fuel_records_set_code on public.fuel_records;
create trigger fuel_records_set_code
  before insert on public.fuel_records
  for each row execute function public.set_fuel_code();

-- -----------------------------------------------------------------------------
-- 2. Renumber routine — fuel records now get their own dense 1..N counter,
--    independent of trip_id and of how many trips/orders exist.
-- -----------------------------------------------------------------------------
create or replace function public.renumber_fleet_codes()
returns void
language plpgsql
as $$
declare
  r record;
  v_order_ref integer := 0;
  v_trip_ref integer := 0;
  v_fuel_ref integer := 0;
begin
  lock table public.transport_orders in share row exclusive mode;
  lock table public.trips in share row exclusive mode;
  lock table public.fuel_records in share row exclusive mode;

  -- Orders: clean 1..N by creation order, deleted ones skipped entirely.
  for r in
    select id from public.transport_orders
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_order_ref := v_order_ref + 1;
    update public.transport_orders set order_code = 'TO-' || v_order_ref where id = r.id;
  end loop;

  -- Trips: clean 1..N by creation order, own counter.
  for r in
    select id from public.trips
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_trip_ref := v_trip_ref + 1;
    update public.trips set trip_code = 'TRIP-' || v_trip_ref where id = r.id;
  end loop;

  -- Fuel records: clean 1..N by creation order, own counter — no longer
  -- tied to the linked trip's number.
  for r in
    select id from public.fuel_records
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_fuel_ref := v_fuel_ref + 1;
    update public.fuel_records set fuel_code = 'FUEL-' || v_fuel_ref where id = r.id;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Run it once now so existing fuel records restart cleanly at FUEL-1,
--    oldest first, instead of keeping their old trip-borrowed numbers.
-- -----------------------------------------------------------------------------
select public.renumber_fleet_codes();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
