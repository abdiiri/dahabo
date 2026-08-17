-- =============================================================================
-- Migration 025 — Trips get their own sequence, like transport orders
-- =============================================================================
-- Problem this fixes: since migration 015, a trip made from an order reused
-- that order's number (order TO-4 -> trip TRIP-4). That means trip numbers
-- didn't run in the order trips were actually created — a trip linked to
-- an old, high-numbered order could land far ahead of trips made after it,
-- so the Trips list didn't read as "1, 2, 3… oldest to newest" the way
-- Transport Orders does.
--
-- What this does instead:
--   • Trips always draw a fresh, dense number of their own — TRIP-1,
--     TRIP-2, TRIP-3… by creation order — exactly like transport orders,
--     regardless of which order (if any) the trip is linked to.
--   • Fuel records are untouched: a fill-up logged against a trip still
--     shows that trip's number, so fuel keeps reading as "this trip's
--     fuel," it just now follows the trip's own clean number.
--   • One-time renumber of existing (non-deleted) trips, oldest first, so
--     the table restarts cleanly at TRIP-1 instead of mixing in old
--     order-borrowed numbers.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Insert-time numbering — trips no longer look at transport_order_id.
-- -----------------------------------------------------------------------------
create or replace function public.set_trip_code()
returns trigger
language plpgsql
as $$
declare
  v_ref integer;
begin
  lock table public.trips in share row exclusive mode;

  select coalesce(max(public.extract_ref_number(trip_code)), 0) + 1
  into v_ref
  from public.trips
  where deleted_at is null;

  new.trip_code := 'TRIP-' || v_ref;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Renumber routine — trips now get their own dense 1..N counter,
--    independent of transport_order_id and of how many orders exist.
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
  v_ref integer;
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

  -- Trips: clean 1..N by creation order, own counter — no longer tied to
  -- the linked order's number.
  for r in
    select id from public.trips
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_trip_ref := v_trip_ref + 1;
    update public.trips set trip_code = 'TRIP-' || v_trip_ref where id = r.id;
  end loop;

  -- Fuel records: reuse the linked (non-deleted) trip's number; unlinked
  -- ones count up on their own after the highest number used so far.
  v_fuel_ref := greatest(v_order_ref, v_trip_ref);
  for r in
    select id, trip_id from public.fuel_records
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_ref := null;
    if r.trip_id is not null then
      select public.extract_ref_number(trip_code) into v_ref
      from public.trips
      where id = r.trip_id and deleted_at is null;
    end if;
    if v_ref is null then
      v_fuel_ref := v_fuel_ref + 1;
      v_ref := v_fuel_ref;
    end if;
    update public.fuel_records set fuel_code = 'FUEL-' || v_ref where id = r.id;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Run it once now so existing trips restart cleanly at TRIP-1, oldest
--    first, instead of keeping their old order-borrowed numbers.
-- -----------------------------------------------------------------------------
select public.renumber_fleet_codes();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
