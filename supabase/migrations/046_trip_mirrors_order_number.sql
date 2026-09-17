-- =============================================================================
-- Migration 046 — Trip numbers should match their linked order's number again
-- =============================================================================
-- Migration 025 gave trips their own independent 1, 2, 3… sequence so trip
-- numbers would always run in creation order. But that also broke the
-- thing this app actually wants: a trip made from order TO-81 should be
-- TRIP-81, not some unrelated number — the two should read as the same
-- job. That's what this restores:
--
--   • A trip linked to a (non-deleted) order borrows that order's number
--     — order TO-81 → trip TRIP-81. A trip with no linked order (or whose
--     order got deleted) still gets its own number, counting up from
--     whatever's highest so far, exactly as before.
--   • If two trips are ever linked to the very same order, the second one
--     falls back to the next free number instead of colliding with the
--     first.
--   • Same two-phase (temp code, then final code) safety migration 044
--     already established for orders, applied to trips too — a trip is
--     never briefly sitting on a real "TRIP-N" another trip is about to
--     also want.
--
-- Orders and fuel records are unaffected: orders keep their own clean
-- 1..N (migration 044), and fuel records keep the independent numbering
-- migration 031 gave them.
--
-- Safe to run any number of times.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Insert-time numbering — a new trip borrows its linked order's number.
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

  -- Someone else (another trip on the same order) already has this
  -- number — count up to the next free one instead of colliding.
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

-- -----------------------------------------------------------------------------
-- 2. Renumber routine — orders and fuel unchanged; trips now mirror their
--    linked order's number again.
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

  -- Orders: park every active row on a harmless temp code first, so no
  -- active row is ever sitting on a real "TO-N" value while numbers shift.
  update public.transport_orders
  set order_code = 'TMP-' || id::text
  where deleted_at is null;

  for r in
    select id from public.transport_orders
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_order_ref := v_order_ref + 1;
    update public.transport_orders set order_code = 'TO-' || v_order_ref where id = r.id;
  end loop;

  -- Trips: same two-phase approach. A trip linked to a (non-deleted)
  -- order borrows that order's number; an unlinked trip (or one whose
  -- order was deleted) counts up on its own, starting after the highest
  -- order number so it never collides with a borrowed one.
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

  -- Fuel records: own independent dense counter (migration 031) — no
  -- unique constraint on fuel_code, so a single pass is enough.
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
-- 3. reassign_trip_order (migration 045) needs to renumber afterwards too —
--    otherwise a trip moved onto a different order keeps its old number
--    instead of picking up the new order's.
-- -----------------------------------------------------------------------------
create or replace function public.reassign_trip_order(p_trip_id uuid, p_new_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_order_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only staff can do this.';
  end if;

  select transport_order_id into v_old_order_id
  from public.trips
  where id = p_trip_id;

  update public.trips
  set transport_order_id = p_new_order_id
  where id = p_trip_id;

  if v_old_order_id is not null and v_old_order_id is distinct from p_new_order_id then
    if exists (
      select 1 from public.trips
      where transport_order_id = v_old_order_id and deleted_at is null and status = 'completed'
    ) then
      update public.transport_orders
      set status = 'completed'
      where id = v_old_order_id and status <> 'cancelled';
    elsif exists (
      select 1 from public.trips
      where transport_order_id = v_old_order_id and deleted_at is null and status in ('in_progress', 'scheduled')
    ) then
      update public.transport_orders
      set status = 'in_progress'
      where id = v_old_order_id and status <> 'cancelled';
    else
      update public.transport_orders
      set status = 'pending'
      where id = v_old_order_id and status in ('in_progress', 'completed');
    end if;
  end if;

  perform public.renumber_fleet_codes();

  insert into public.audit_logs (actor_id, action, target_table, target_id)
  values (auth.uid(), 'reassign_trip_order', 'trips', p_trip_id::text);
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Run it once now so every existing trip immediately lines back up
--    with its order's number.
-- -----------------------------------------------------------------------------
select public.renumber_fleet_codes();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
