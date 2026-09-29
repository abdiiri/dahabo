-- =============================================================================
-- Migration 041 — Free the previous driver when a trip is reassigned
-- =============================================================================
-- sync_driver_status_from_trip() (migration 030) keeps a driver's status in
-- step with whether *they* have an active trip, but only ever looked at
-- new.driver_id. Reassigning an active trip from driver A to driver B
-- correctly marks B 'on_route', but never touches A — nothing else fires
-- for A (this isn't a completion, deletion, or their own row changing), so
-- A stays stuck 'on_route' forever even though they no longer have
-- anything active. The app now lets staff reassign a trip's driver (see
-- editTrip in src/lib/api/trips.ts), so this gap needs closing.
--
-- Adds the missing case: on an UPDATE where driver_id actually changed,
-- free the previous driver (back to 'available') unless they have some
-- other active trip or are suspended. Safe to run more than once.
-- =============================================================================

create or replace function public.sync_driver_status_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.driver_id is distinct from new.driver_id then
    if not exists (
      select 1 from public.trips
      where driver_id = old.driver_id
        and id <> new.id
        and deleted_at is null
        and status in ('scheduled', 'in_progress')
    ) then
      update public.drivers
      set status = 'available'
      where id = old.driver_id and status = 'on_route';
    end if;
  end if;

  if new.deleted_at is null and new.status in ('scheduled', 'in_progress') then
    update public.drivers
    set status = 'on_route'
    where id = new.driver_id and status not in ('on_route', 'suspended');
  else
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

-- -----------------------------------------------------------------------------
-- Backfill: free any driver currently stuck 'on_route' with nothing active.
-- -----------------------------------------------------------------------------
update public.drivers d
set status = 'available'
where status = 'on_route'
  and not exists (
    select 1 from public.trips t
    where t.driver_id = d.id and t.deleted_at is null and t.status in ('scheduled', 'in_progress')
  );
