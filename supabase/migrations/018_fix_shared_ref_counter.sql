-- =============================================================================
-- Migration 018 — Fix shared reference-number counter
-- =============================================================================
-- Problem this fixes: migration 015 gave transport orders, trips, and fuel
-- records ONE shared counter (public.fleet_ref_seq). Every insert into any
-- of the three tables used up a number from that same counter, and once a
-- number was handed out it was never reused — even if the row was later
-- deleted. So with, say, 6 transport orders you'd expect TO-1..TO-6, but if
-- anything else (a test row, a deleted trip, an unlinked trip) had drawn
-- from the counter in between, an order or trip could show up as TO-16 —
-- confusing, since it has nothing to do with there being 16 orders.
--
-- What this does instead:
--   • Each table now gets its own number, computed from the highest number
--     already used IN THAT TABLE, not a shared counter. 6 transport orders
--     will always read TO-1..TO-6.
--   • A trip made FROM an order still reuses that order's number (TO-4 ->
--     TRIP-4), same as before — that part wasn't the problem.
--   • A trip with no linked order gets the next number after the highest
--     one currently used by any trip, so standalone trips still land in a
--     dense, predictable range instead of borrowing from the orders table.
--   • Fuel records work the same way, reusing the linked trip's number when
--     there is one.
--   • Because each table computes its own next number from its own current
--     rows (MAX + 1) instead of a counter that only ever goes up, deleting
--     the most-recently-created row frees its number back up instead of
--     leaving a permanent gap.
--
-- This only changes the human-facing order_code / trip_code / fuel_code
-- values — id (uuid) columns and foreign keys are untouched.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Transport orders — next number = highest order number in use + 1
-- -----------------------------------------------------------------------------
create or replace function public.set_transport_order_code()
returns trigger
language plpgsql
as $$
declare
  v_next integer;
begin
  -- Lock out concurrent inserts while we read the current max, so two
  -- orders created at the same instant can't compute the same next number.
  lock table public.transport_orders in share row exclusive mode;

  select coalesce(max(public.extract_ref_number(order_code)), 0) + 1
  into v_next
  from public.transport_orders;

  new.order_code := 'TO-' || v_next;
  return new;
end;
$$;

drop trigger if exists transport_orders_set_code on public.transport_orders;
create trigger transport_orders_set_code
  before insert on public.transport_orders
  for each row execute function public.set_transport_order_code();

-- -----------------------------------------------------------------------------
-- 2. Trips — reuse the linked order's number; otherwise next trip number
-- -----------------------------------------------------------------------------
create or replace function public.set_trip_code()
returns trigger
language plpgsql
as $$
declare
  v_ref integer;
  v_code text;
begin
  lock table public.trips in share row exclusive mode;

  if new.transport_order_id is not null then
    select public.extract_ref_number(order_code) into v_ref
    from public.transport_orders where id = new.transport_order_id;
  end if;

  if v_ref is null then
    select coalesce(max(public.extract_ref_number(trip_code)), 0) + 1
    into v_ref
    from public.trips;
  end if;

  v_code := 'TRIP-' || v_ref;

  -- Guard against the rare case of a second trip against the same order
  -- (trip_code must stay unique) — fall back to the next trip number.
  if exists (select 1 from public.trips where trip_code = v_code) then
    select coalesce(max(public.extract_ref_number(trip_code)), 0) + 1
    into v_ref
    from public.trips;
    v_code := 'TRIP-' || v_ref;
  end if;

  new.trip_code := v_code;
  return new;
end;
$$;

drop trigger if exists trips_set_code on public.trips;
create trigger trips_set_code
  before insert on public.trips
  for each row execute function public.set_trip_code();

-- -----------------------------------------------------------------------------
-- 3. Fuel records — reuse the linked trip's number; otherwise next fuel number
-- -----------------------------------------------------------------------------
create or replace function public.set_fuel_code()
returns trigger
language plpgsql
as $$
declare
  v_ref integer;
begin
  lock table public.fuel_records in share row exclusive mode;

  if new.trip_id is not null then
    select public.extract_ref_number(trip_code) into v_ref
    from public.trips where id = new.trip_id;
  end if;

  if v_ref is null then
    select coalesce(max(public.extract_ref_number(fuel_code)), 0) + 1
    into v_ref
    from public.fuel_records;
  end if;

  -- Not unique on purpose: a trip is often refuelled more than once, and
  -- every one of those fill-ups should still read as belonging to the same
  -- trip/order number.
  new.fuel_code := 'FUEL-' || v_ref;
  return new;
end;
$$;

drop trigger if exists fuel_records_set_code on public.fuel_records;
create trigger fuel_records_set_code
  before insert on public.fuel_records
  for each row execute function public.set_fuel_code();

-- -----------------------------------------------------------------------------
-- 4. One-time renumber of any existing rows, oldest first, so the whole
--    table restarts cleanly at TO-1 / TRIP-1 / FUEL-1 per table instead of
--    carrying over the old shared-counter numbers (like TO-16).
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
  v_order_ref integer := 0;
  v_trip_ref integer := 0;
  v_fuel_ref integer := 0;
  v_ref integer;
  v_code text;
begin
  -- Orders: clean 1..N by creation order.
  for r in
    select id from public.transport_orders order by created_at asc, id asc
  loop
    v_order_ref := v_order_ref + 1;
    update public.transport_orders set order_code = 'TO-' || v_order_ref where id = r.id;
  end loop;

  -- Trips: linked trips reuse their (now-clean) order's number; unlinked
  -- trips count up on their own, starting after the highest order number
  -- so nothing collides.
  v_trip_ref := v_order_ref;
  for r in
    select id, transport_order_id from public.trips order by created_at asc, id asc
  loop
    v_ref := null;
    if r.transport_order_id is not null then
      select public.extract_ref_number(order_code) into v_ref
      from public.transport_orders where id = r.transport_order_id;
    end if;
    if v_ref is null then
      v_trip_ref := v_trip_ref + 1;
      v_ref := v_trip_ref;
    end if;
    v_code := 'TRIP-' || v_ref;
    if exists (select 1 from public.trips where trip_code = v_code and id <> r.id) then
      v_trip_ref := v_trip_ref + 1;
      v_ref := v_trip_ref;
      v_code := 'TRIP-' || v_ref;
    end if;
    update public.trips set trip_code = v_code where id = r.id;
  end loop;

  -- Fuel records: reuse the linked trip's number; unlinked ones count up
  -- on their own, starting after the highest number used so far.
  v_fuel_ref := greatest(v_order_ref, v_trip_ref);
  for r in
    select id, trip_id from public.fuel_records order by created_at asc, id asc
  loop
    v_ref := null;
    if r.trip_id is not null then
      select public.extract_ref_number(trip_code) into v_ref
      from public.trips where id = r.trip_id;
    end if;
    if v_ref is null then
      v_fuel_ref := v_fuel_ref + 1;
      v_ref := v_fuel_ref;
    end if;
    update public.fuel_records set fuel_code = 'FUEL-' || v_ref where id = r.id;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 5. The old shared counter is no longer used by anything — drop it.
-- -----------------------------------------------------------------------------
drop function if exists public.next_fleet_ref();
drop sequence if exists public.fleet_ref_seq;

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
