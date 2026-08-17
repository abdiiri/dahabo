-- =============================================================================
-- Migration 015 — Sequential, linked reference numbers
-- =============================================================================
-- Problem this fixes: transport order codes and trip codes were generated
-- from the current timestamp (e.g. "TO-482913"), so they looked random and
-- an order and the trip made from it never shared a number — confusing to
-- read and to cross-reference.
--
-- What this does instead:
--   • One shared counter (public.fleet_ref_seq), starting at 1, used to hand
--     out plain sequential numbers: 1, 2, 3, 4, 5, 6…
--   • Transport orders always draw a fresh number: TO-1, TO-2, TO-3…
--   • A trip made FROM an order reuses that order's number: an order
--     TO-4 produces trip TRIP-4. A trip with no linked order draws its own
--     fresh number instead.
--   • Fuel records mirror the same idea: a fill-up logged against trip
--     TRIP-4 is recorded as FUEL-4. A fuel record with no linked trip draws
--     its own fresh number. Unlike orders/trips, more than one fuel record
--     can share a number, since a trip is often refuelled more than once.
--
-- The numbers are assigned by triggers, so the id (uuid) columns and all
-- existing foreign keys are untouched — this only changes the human-facing
-- order_code / trip_code / fuel_code values, which is what the app displays
-- and what staff actually read.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Shared counter + helpers
-- -----------------------------------------------------------------------------
create sequence if not exists public.fleet_ref_seq start with 1 increment by 1;

create or replace function public.next_fleet_ref()
returns integer
language sql
as $$
  select nextval('public.fleet_ref_seq')::integer;
$$;

-- Pulls the numeric part out of a code like 'TO-42' or 'TRIP-7' -> 42 / 7.
create or replace function public.extract_ref_number(code text)
returns integer
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(code, ''), '\D', '', 'g'), '')::integer;
$$;

-- -----------------------------------------------------------------------------
-- 2. Transport orders — always a fresh sequential number
-- -----------------------------------------------------------------------------
create or replace function public.set_transport_order_code()
returns trigger
language plpgsql
as $$
begin
  new.order_code := 'TO-' || public.next_fleet_ref();
  return new;
end;
$$;

drop trigger if exists transport_orders_set_code on public.transport_orders;
create trigger transport_orders_set_code
  before insert on public.transport_orders
  for each row execute function public.set_transport_order_code();

-- -----------------------------------------------------------------------------
-- 3. Trips — reuse the linked transport order's number when there is one
-- -----------------------------------------------------------------------------
create or replace function public.set_trip_code()
returns trigger
language plpgsql
as $$
declare
  v_ref integer;
  v_code text;
begin
  if new.transport_order_id is not null then
    select public.extract_ref_number(order_code) into v_ref
    from public.transport_orders where id = new.transport_order_id;
  end if;

  if v_ref is null then
    v_ref := public.next_fleet_ref();
  end if;

  v_code := 'TRIP-' || v_ref;

  -- Guard against the rare case of a second trip against the same order
  -- (trip_code must stay unique) — fall back to a fresh number instead.
  if exists (select 1 from public.trips where trip_code = v_code) then
    v_ref := public.next_fleet_ref();
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
-- 4. Fuel records — reuse the linked trip's number when there is one
-- -----------------------------------------------------------------------------
alter table public.fuel_records add column if not exists fuel_code text;

create or replace function public.set_fuel_code()
returns trigger
language plpgsql
as $$
declare
  v_ref integer;
begin
  if new.trip_id is not null then
    select public.extract_ref_number(trip_code) into v_ref
    from public.trips where id = new.trip_id;
  end if;

  if v_ref is null then
    v_ref := public.next_fleet_ref();
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

create index if not exists fuel_records_fuel_code_idx on public.fuel_records (fuel_code);

-- -----------------------------------------------------------------------------
-- 5. One-time renumber of any existing rows, oldest first, so the whole
--    table restarts cleanly at TO-1 / TRIP-1 / FUEL-1 instead of mixing old
--    timestamp-based codes with new sequential ones.
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
  v_ref integer;
  v_code text;
begin
  for r in
    select id from public.transport_orders order by created_at asc, id asc
  loop
    v_ref := public.next_fleet_ref();
    update public.transport_orders set order_code = 'TO-' || v_ref where id = r.id;
  end loop;

  for r in
    select id, transport_order_id from public.trips order by created_at asc, id asc
  loop
    v_ref := null;
    if r.transport_order_id is not null then
      select public.extract_ref_number(order_code) into v_ref
      from public.transport_orders where id = r.transport_order_id;
    end if;
    if v_ref is null then
      v_ref := public.next_fleet_ref();
    end if;
    v_code := 'TRIP-' || v_ref;
    if exists (select 1 from public.trips where trip_code = v_code and id <> r.id) then
      v_ref := public.next_fleet_ref();
      v_code := 'TRIP-' || v_ref;
    end if;
    update public.trips set trip_code = v_code where id = r.id;
  end loop;

  for r in
    select id, trip_id from public.fuel_records order by created_at asc, id asc
  loop
    v_ref := null;
    if r.trip_id is not null then
      select public.extract_ref_number(trip_code) into v_ref
      from public.trips where id = r.trip_id;
    end if;
    if v_ref is null then
      v_ref := public.next_fleet_ref();
    end if;
    update public.fuel_records set fuel_code = 'FUEL-' || v_ref where id = r.id;
  end loop;
end $$;

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
