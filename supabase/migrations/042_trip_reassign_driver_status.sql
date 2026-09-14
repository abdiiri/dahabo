-- =============================================================================
-- Migration 042 — Free the old driver when a trip is reassigned
-- =============================================================================
-- Problem: sync_driver_status_from_trip() (migration 030) only looks at
-- NEW.driver_id. Editing a trip to reassign it from driver A to driver B
-- correctly put B "on_route", but left A stuck "on_route" forever, since
-- nothing in that trigger ever re-checked A. This only mattered once trips
-- became editable to change their driver.
--
-- Fix: on UPDATE, if driver_id actually changed, also re-check OLD.driver_id
-- the same way a trip completing already does — free them up unless they
-- have some other active trip, and only if nothing already put them off
-- duty or suspended in the meantime.
--
-- Safe to run any number of times.
-- =============================================================================

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

  -- Reassignment case: the trip is still active, but its driver changed —
  -- release whoever it used to belong to.
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

  return new;
end;
$$;

drop trigger if exists trips_sync_driver_status on public.trips;
create trigger trips_sync_driver_status after insert or update on public.trips
  for each row execute function public.sync_driver_status_from_trip();
