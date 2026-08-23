-- =============================================================================
-- Migration 039 — Actually maintain drivers.total_trips
-- =============================================================================
-- drivers.total_trips has existed since the very first schema (see
-- 004_fleet_operations) and is protected from being overwritten by a client
-- edit (see the driver profile-protection trigger), but nothing has ever
-- incremented it — no trigger updates it when a trip completes. It's been
-- stuck at 0 (or whatever a row was seeded with) for every driver since day
-- one, which is why the driver` profile's "Trips completed" and any ranking
-- built on it were meaningless.
--
-- This adds a trigger that keeps it in sync with reality: +1 when a trip
-- transitions to 'completed', -1 if a completed trip is deleted or reopened
-- (covers correcting a mistaken completion), and backfills every driver's
-- current count from their actual completed trips. Safe to run more than
-- once.
-- =============================================================================

create or replace function public.sync_driver_total_trips()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'completed' and old.status <> 'completed' then
      update public.drivers set total_trips = total_trips + 1 where id = new.driver_id;
    elsif old.status = 'completed' and new.status <> 'completed' then
      update public.drivers set total_trips = greatest(total_trips - 1, 0) where id = new.driver_id;
    end if;
  elsif tg_op = 'DELETE' and old.status = 'completed' then
    update public.drivers set total_trips = greatest(total_trips - 1, 0) where id = old.driver_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trips_sync_driver_total_trips on public.trips;
create trigger trips_sync_driver_total_trips
  after update or delete on public.trips
  for each row execute function public.sync_driver_total_trips();

-- One-time backfill so existing drivers reflect their real completed-trip
-- count immediately, rather than waiting for their next status change.
update public.drivers d
set total_trips = (
  select count(*) from public.trips t where t.driver_id = d.id and t.status = 'completed'
);
