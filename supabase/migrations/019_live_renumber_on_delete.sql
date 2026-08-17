-- =============================================================================
-- Migration 019 — Live renumbering: deleted rows don't hold a number
-- =============================================================================
-- Problem this fixes: "delete" in this app is a soft delete (deleted_at is
-- set, the row stays in the table for the Recycle Bin). Migration 018 made
-- each table number itself from its own highest number, but a soft-deleted
-- row's number still counted — so with 7 orders, deleting order #3 left you
-- with 6 *visible* orders numbered 1,2,4,5,6,7 (a gap at 3), and the next
-- new order became TO-8, not TO-7.
--
-- What this does instead: whenever a row is soft-deleted, restored, or
-- permanently deleted, every remaining (non-deleted) row in that table —
-- and anything that takes its number from it — gets renumbered from
-- scratch, oldest first: 1, 2, 3… with no gaps. So 7 orders, delete one,
-- you're back to a clean 1-6, and the next order you add becomes TO-7.
--
-- This only changes the human-facing order_code / trip_code / fuel_code
-- values — id (uuid) columns and foreign keys are untouched, and
-- soft-deleted rows keep their old code (it's cosmetic, shown only in the
-- Recycle Bin) since they're not part of the live numbering anymore.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Shared renumber routine — recomputes clean, dense codes for every
--    non-deleted row across all three tables, oldest first.
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
  v_code text;
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

  -- Trips: linked (non-deleted) trips reuse their order's clean number;
  -- unlinked ones count up on their own after the highest order number.
  v_trip_ref := v_order_ref;
  for r in
    select id, transport_order_id from public.trips
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_ref := null;
    if r.transport_order_id is not null then
      select public.extract_ref_number(order_code) into v_ref
      from public.transport_orders
      where id = r.transport_order_id and deleted_at is null;
    end if;
    if v_ref is null then
      v_trip_ref := v_trip_ref + 1;
      v_ref := v_trip_ref;
    end if;
    v_code := 'TRIP-' || v_ref;
    if exists (
      select 1 from public.trips
      where trip_code = v_code and id <> r.id and deleted_at is null
    ) then
      v_trip_ref := v_trip_ref + 1;
      v_ref := v_trip_ref;
      v_code := 'TRIP-' || v_ref;
    end if;
    update public.trips set trip_code = v_code where id = r.id;
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
-- 2. Triggers — renumber whenever a row is soft-deleted, restored, or
--    permanently removed. The function only writes to *_code columns, so
--    it never re-fires these triggers itself (no recursion).
-- -----------------------------------------------------------------------------
create or replace function public.trigger_renumber_fleet_codes()
returns trigger
language plpgsql
as $$
begin
  perform public.renumber_fleet_codes();
  return null; -- AFTER trigger, return value is ignored
end;
$$;

drop trigger if exists transport_orders_renumber on public.transport_orders;
create trigger transport_orders_renumber
  after update of deleted_at or delete on public.transport_orders
  for each row execute function public.trigger_renumber_fleet_codes();

drop trigger if exists trips_renumber on public.trips;
create trigger trips_renumber
  after update of deleted_at or delete on public.trips
  for each row execute function public.trigger_renumber_fleet_codes();

drop trigger if exists fuel_records_renumber on public.fuel_records;
create trigger fuel_records_renumber
  after update of deleted_at or delete on public.fuel_records
  for each row execute function public.trigger_renumber_fleet_codes();

-- -----------------------------------------------------------------------------
-- 3. Insert-time numbering now also ignores deleted rows, so a brand-new
--    row never picks up a number a deleted row happens to still be
--    wearing.
-- -----------------------------------------------------------------------------
create or replace function public.set_transport_order_code()
returns trigger
language plpgsql
as $$
declare
  v_next integer;
begin
  lock table public.transport_orders in share row exclusive mode;

  select coalesce(max(public.extract_ref_number(order_code)), 0) + 1
  into v_next
  from public.transport_orders
  where deleted_at is null;

  new.order_code := 'TO-' || v_next;
  return new;
end;
$$;

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
    from public.transport_orders
    where id = new.transport_order_id and deleted_at is null;
  end if;

  if v_ref is null then
    select coalesce(max(public.extract_ref_number(trip_code)), 0) + 1
    into v_ref
    from public.trips
    where deleted_at is null;
  end if;

  v_code := 'TRIP-' || v_ref;

  if exists (select 1 from public.trips where trip_code = v_code and deleted_at is null) then
    select coalesce(max(public.extract_ref_number(trip_code)), 0) + 1
    into v_ref
    from public.trips
    where deleted_at is null;
    v_code := 'TRIP-' || v_ref;
  end if;

  new.trip_code := v_code;
  return new;
end;
$$;

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
    from public.trips
    where id = new.trip_id and deleted_at is null;
  end if;

  if v_ref is null then
    select coalesce(max(public.extract_ref_number(fuel_code)), 0) + 1
    into v_ref
    from public.fuel_records
    where deleted_at is null;
  end if;

  new.fuel_code := 'FUEL-' || v_ref;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Run it once now, so any existing gaps from past deletes are cleaned
--    up immediately instead of waiting for the next delete/restore.
-- -----------------------------------------------------------------------------
select public.renumber_fleet_codes();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
