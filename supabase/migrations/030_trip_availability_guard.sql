-- =============================================================================
-- Migration 030 — A driver or vehicle can't be double-booked on two trips,
-- and a driver's status now reflects whether they're actually on the road
-- =============================================================================
-- Nothing before this stopped staff from starting a second trip against a
-- driver or vehicle that was already on an active (scheduled/in_progress)
-- trip. This adds:
--
--   1. A guard trigger on trips: before insert or update, if the row is
--      going to be active (status in scheduled/in_progress, not deleted)
--      and another non-deleted trip already has the same driver or vehicle
--      in that state, the write is rejected with a clear error naming the
--      trip that's in the way. This also covers restoring a trip from the
--      Recycle Bin (deleted_at -> null is an update), so a restore can't
--      silently double-book someone either.
--
--   2. A sync trigger on trips: after insert or update, keeps
--      drivers.status in step with whether the driver has an active trip —
--      flips to 'on_route' the moment a trip starts, back to 'available'
--      the moment it completes, is deleted, or its linked trip's driver
--      no longer has anything active. Never touches a driver who's already
--      'suspended'.
--
-- Vehicles intentionally aren't given an equivalent stored status here —
-- vehicles.status already means fleet condition (active/idle/maintenance/
-- decommissioned), independent of whether it's mid-trip right now. The
-- guard trigger above still fully protects vehicles from double-booking;
-- the app computes "on trip" for display by checking for an active trip,
-- the same query the guard itself uses (see listActiveTripAssignments in
-- src/lib/api/trips.ts).
--
-- Safe to run any number of times.
-- =============================================================================

create or replace function public.guard_trip_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict record;
begin
  -- Only an active, non-deleted row needs checking — completing, cancelling,
  -- editing non-assignment fields, or soft-deleting a trip never conflicts.
  if new.deleted_at is not null or new.status not in ('scheduled', 'in_progress') then
    return new;
  end if;

  select trip_code, driver_id, vehicle_id into v_conflict
  from public.trips
  where id <> new.id
    and deleted_at is null
    and status in ('scheduled', 'in_progress')
    and (driver_id = new.driver_id or vehicle_id = new.vehicle_id)
  limit 1;

  if v_conflict.trip_code is not null then
    if v_conflict.driver_id = new.driver_id then
      raise exception
        'This driver is already on trip % — complete or remove that trip first.',
        v_conflict.trip_code
        using errcode = 'check_violation';
    else
      raise exception
        'This vehicle is already on trip % — complete or remove that trip first.',
        v_conflict.trip_code
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trips_guard_availability on public.trips;
create trigger trips_guard_availability before insert or update on public.trips
  for each row execute function public.guard_trip_availability();


create or replace function public.sync_driver_status_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is null and new.status in ('scheduled', 'in_progress') then
    update public.drivers
    set status = 'on_route'
    where id = new.driver_id and status not in ('on_route', 'suspended');
  else
    -- Trip just completed, was deleted, or was restored into a finished
    -- state — free the driver up again, but only if they don't have some
    -- OTHER active trip right now, and only if nothing has already put
    -- them off duty or suspended in the meantime.
    if not exists (
      select 1 from public.trips
      where driver_id = new.driver_id
        and id <> new.id
        and deleted_at is null
        and status in ('scheduled', 'in_progress')
    ) then
      update public.drivers
      set status = 'available'
      where id = new.driver_id and status = 'on_route';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_sync_driver_status on public.trips;
create trigger trips_sync_driver_status after insert or update on public.trips
  for each row execute function public.sync_driver_status_from_trip();

-- -----------------------------------------------------------------------------
-- Backfill: bring existing data in line immediately, don't wait for the
-- next trip event on each row.
-- -----------------------------------------------------------------------------
update public.drivers d
set status = 'on_route'
where status not in ('on_route', 'suspended')
  and exists (
    select 1 from public.trips t
    where t.driver_id = d.id and t.deleted_at is null and t.status in ('scheduled', 'in_progress')
  );

update public.drivers d
set status = 'available'
where status = 'on_route'
  and not exists (
    select 1 from public.trips t
    where t.driver_id = d.id and t.deleted_at is null and t.status in ('scheduled', 'in_progress')
  );

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
