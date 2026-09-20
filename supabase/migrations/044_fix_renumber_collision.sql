-- =============================================================================
-- Migration 044 — Make renumber_fleet_codes() collision-proof
-- =============================================================================
-- Migration 043 tried to fix the "duplicate key value violates ...
-- order_code_active_key" error by disabling/re-enabling triggers around a
-- cascade delete. That didn't address the actual weak point: looking at
-- the real function (migration 031), it reassigns each active row's code
-- directly —
--
--   update transport_orders set order_code = 'TO-' || v_order_ref
--   where id = r.id;
--
-- — one row at a time, straight to its FINAL number, with nothing
-- guaranteeing the number it's moving to has already been vacated by
-- whoever held it before. Under most single-row deletes that happens to
-- work out, but it's not actually guaranteed, and a cascade delete (order
-- + its trip + that trip's payments/fuel, several tables changing in one
-- go) is exactly the kind of run where it stops holding up.
--
-- Fix: give every row a guaranteed-unique temporary code first (prefixed
-- with a dash, so it can never collide with a real "TO-3" style code),
-- THEN assign final clean numbers in a second pass. This is the standard,
-- always-safe way to do this and removes the whole class of bug — it
-- doesn't matter anymore whether zero, one, or five things triggered a
-- renumber first.
--
-- Also: skip nested renumber calls that happen mid cascade (a delete that
-- touches multiple tables can fire this several times before anything is
-- fully settled) and do one clean, final pass once the whole delete is
-- done, instead of several partial ones. Uses a transaction-local flag,
-- not a table lock, so it needs no special privileges.
--
-- Safe to run any number of times.
-- =============================================================================

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
  -- Set by delete_trip_cascade / delete_transport_order_cascade while they
  -- run their own sequence of updates — skip until they're fully done, so
  -- this only ever runs once per delete, against the final settled state.
  if current_setting('app.suppress_renumber', true) = 'true' then
    return;
  end if;

  lock table public.transport_orders in share row exclusive mode;
  lock table public.trips in share row exclusive mode;
  lock table public.fuel_records in share row exclusive mode;

  -- Phase 1: move every active row to a placeholder no real code can ever
  -- collide with, so phase 2 can freely assign final numbers in any order
  -- without ever landing on a value someone else hasn't vacated yet.
  update public.transport_orders set order_code = '-tmp-' || id::text where deleted_at is null;
  update public.trips set trip_code = '-tmp-' || id::text where deleted_at is null;
  update public.fuel_records set fuel_code = '-tmp-' || id::text where deleted_at is null;

  -- Phase 2: clean 1..N by creation order, deleted ones skipped entirely.
  for r in
    select id from public.transport_orders
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_order_ref := v_order_ref + 1;
    update public.transport_orders set order_code = 'TO-' || v_order_ref where id = r.id;
  end loop;

  for r in
    select id from public.trips
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_trip_ref := v_trip_ref + 1;
    update public.trips set trip_code = 'TRIP-' || v_trip_ref where id = r.id;
  end loop;

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

-- Run it once now to clear out anything left in an inconsistent state by
-- the bug above.
select public.renumber_fleet_codes();

create or replace function public.delete_trip_cascade(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can do this.';
  end if;

  perform set_config('app.suppress_renumber', 'true', true);

  update public.driver_payments
    set deleted_at = now()
    where deleted_at is null and trip_id = p_trip_id;

  update public.fuel_records
    set deleted_at = now()
    where deleted_at is null and trip_id = p_trip_id;

  update public.trips
    set deleted_at = now()
    where deleted_at is null and id = p_trip_id;

  perform set_config('app.suppress_renumber', 'false', true);
  perform public.renumber_fleet_codes();

  insert into public.audit_logs (actor_id, action, target_table, target_id)
  values (auth.uid(), 'delete_trip_cascade', 'trips', p_trip_id::text);
end;
$$;

create or replace function public.delete_transport_order_cascade(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do this.';
  end if;

  perform set_config('app.suppress_renumber', 'true', true);

  update public.driver_payments
    set deleted_at = now()
    where deleted_at is null
      and trip_id in (
        select id from public.trips
        where transport_order_id = p_order_id and deleted_at is null
      );

  update public.fuel_records
    set deleted_at = now()
    where deleted_at is null
      and trip_id in (
        select id from public.trips
        where transport_order_id = p_order_id and deleted_at is null
      );

  update public.trips
    set deleted_at = now()
    where deleted_at is null
      and transport_order_id = p_order_id;

  update public.transport_orders
    set deleted_at = now()
    where deleted_at is null
      and id = p_order_id;

  perform set_config('app.suppress_renumber', 'false', true);
  perform public.renumber_fleet_codes();

  insert into public.audit_logs (actor_id, action, target_table, target_id)
  values (auth.uid(), 'delete_transport_order_cascade', 'transport_orders', p_order_id::text);
end;
$$;

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
