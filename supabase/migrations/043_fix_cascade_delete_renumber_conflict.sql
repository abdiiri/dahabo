-- =============================================================================
-- Migration 043 — Fix "duplicate key value violates ... order_code_active_key"
-- when cascade-deleting an order or trip
-- =============================================================================
-- Problem: delete_transport_order_cascade() and delete_trip_cascade() each
-- run several UPDATE statements in sequence (driver_payments, fuel_records,
-- trips, then transport_orders). Each of those tables has an AFTER UPDATE
-- OF deleted_at trigger (migration 023) that renumbers ALL active
-- transport_orders/trips/fuel_records from scratch, every time a row is
-- soft-deleted. Deleting an order's own trip fires that renumber once,
-- then deleting the order itself fires it again a moment later, inside the
-- same transaction, before the first pass's changes are in a state the
-- second pass's two-phase temp-code shuffle can safely rebuild on top of —
-- that's what throws the duplicate-key error, and it only started
-- happening once deletion actually cascaded through multiple tables in one
-- go instead of touching just one row.
--
-- Fix: both functions now disable the three renumber triggers for the
-- duration of their own cascade, run every update, then re-enable the
-- triggers and call renumber_fleet_codes() exactly once at the very end —
-- same end result (everything active still ends up on a clean 1, 2, 3…),
-- but the shuffle only ever runs once per delete, atomically, after
-- everything else has already settled.
--
-- Safe to run any number of times.
-- =============================================================================

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

  alter table public.transport_orders disable trigger transport_orders_renumber;
  alter table public.trips disable trigger trips_renumber;
  alter table public.fuel_records disable trigger fuel_records_renumber;

  update public.driver_payments
    set deleted_at = now()
    where deleted_at is null and trip_id = p_trip_id;

  update public.fuel_records
    set deleted_at = now()
    where deleted_at is null and trip_id = p_trip_id;

  update public.trips
    set deleted_at = now()
    where deleted_at is null and id = p_trip_id;

  alter table public.transport_orders enable trigger transport_orders_renumber;
  alter table public.trips enable trigger trips_renumber;
  alter table public.fuel_records enable trigger fuel_records_renumber;

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

  alter table public.transport_orders disable trigger transport_orders_renumber;
  alter table public.trips disable trigger trips_renumber;
  alter table public.fuel_records disable trigger fuel_records_renumber;

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

  alter table public.transport_orders enable trigger transport_orders_renumber;
  alter table public.trips enable trigger trips_renumber;
  alter table public.fuel_records enable trigger fuel_records_renumber;

  perform public.renumber_fleet_codes();

  insert into public.audit_logs (actor_id, action, target_table, target_id)
  values (auth.uid(), 'delete_transport_order_cascade', 'transport_orders', p_order_id::text);
end;
$$;
