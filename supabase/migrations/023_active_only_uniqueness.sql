-- =============================================================================
-- Migration 023 — Real fix: deleted rows shouldn't block number reuse
-- =============================================================================
-- Problem this fixes: order_code/trip_code were UNIQUE across the whole
-- table, including soft-deleted rows. A soft-deleted order/trip keeps its
-- old code forever (it's just hidden from normal views, shown in the
-- Recycle Bin) — so if order #1 was ever deleted, "TO-1" stays permanently
-- taken even though no *active* order shows that number, and renumbering
-- the active orders back down to a clean 1, 2, 3… fails the instant it
-- tries to hand out "TO-1" again, because the deleted row still owns it.
-- That's the exact duplicate-key error you hit — nothing to do with
-- transaction timing.
--
-- (Migrations 019-022 never actually saved anything, by the way — Supabase
-- runs a pasted script as one transaction, so every error rolled the
-- whole script back, including the parts that "worked." This migration
-- is fully self-contained so it either fully succeeds or changes nothing.)
--
-- What this does instead:
--   • Replace the old table-wide UNIQUE constraint with a unique index
--     that only applies to non-deleted rows. Deleted rows can keep
--     whatever code they had — it no longer blocks a live row from using
--     that number.
--   • Renumber active rows in two passes: first give every active row a
--     harmless temporary code (based on its own id, guaranteed unique),
--     then hand out the final clean 1, 2, 3… one at a time. Because
--     nothing active is sitting on "TO-1" during that second pass
--     (everyone's on a temp code until it's their turn), there's no
--     collision to work around — this doesn't rely on deferred
--     constraints at all.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Uniqueness only among active (non-deleted) rows.
-- -----------------------------------------------------------------------------
alter table public.transport_orders
  drop constraint if exists transport_orders_order_code_key;
drop index if exists public.transport_orders_order_code_active_key;
create unique index transport_orders_order_code_active_key
  on public.transport_orders (order_code)
  where deleted_at is null;

alter table public.trips
  drop constraint if exists trips_trip_code_key;
drop index if exists public.trips_trip_code_active_key;
create unique index trips_trip_code_active_key
  on public.trips (trip_code)
  where deleted_at is null;

-- -----------------------------------------------------------------------------
-- 2. Renumber routine — two-phase (temp code, then final code) so active
--    rows never collide with each other or with deleted rows while it runs.
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

  -- Orders: park every active row on a harmless temp code first...
  update public.transport_orders
  set order_code = 'TMP-' || id::text
  where deleted_at is null;

  -- ...then hand out clean 1..N, oldest first. Nothing active is sitting
  -- on a real "TO-N" value right now, so this can't collide.
  for r in
    select id from public.transport_orders
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_order_ref := v_order_ref + 1;
    update public.transport_orders set order_code = 'TO-' || v_order_ref where id = r.id;
  end loop;

  -- Trips: same two-phase approach.
  update public.trips
  set trip_code = 'TMP-' || id::text
  where deleted_at is null;

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

  -- Fuel records: not unique by design (several fill-ups can share a
  -- trip's number), so a single pass is enough — no temp step needed.
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
-- 3. Triggers — renumber whenever a row is soft-deleted, restored, or
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
-- 4. Insert-time numbering ignores deleted rows, so a brand-new row never
--    picks up a number a deleted row happens to still be wearing.
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
-- 5. Run it now — active orders and trips land on a clean 1, 2, 3…
-- -----------------------------------------------------------------------------
select public.renumber_fleet_codes();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
