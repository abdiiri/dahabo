-- =============================================================================
-- Migration 011 — mileage rate moves from drivers to trips
-- =============================================================================
-- Previously the mileage rate (KSh per km) lived on the driver record and was
-- set once from the Drivers tab, then reused for every trip that driver did.
-- It now belongs to the trip itself, set when the trip is started, so
-- different trips (and different customers/routes) can carry different
-- rates. driver_payments — and therefore vehicle_profit_monthly — are
-- unaffected downstream: they still get a rate_per_km and amount per trip,
-- it's just sourced from the trip row instead of a driver lookup.
--
-- drivers.mileage_rate_per_km is left in place (unused by the app from here
-- on) rather than dropped, so no historical driver data is lost. Safe to run
-- any number of times.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Mileage rate now lives on the trip
-- -----------------------------------------------------------------------------
alter table public.trips
  add column if not exists mileage_rate_per_km numeric(10, 2) not null default 0;

-- -----------------------------------------------------------------------------
-- 2. Re-point the driver_payments sync trigger at the trip's own rate
--    instead of looking the rate up on public.drivers.
-- -----------------------------------------------------------------------------
create or replace function public.sync_driver_payment_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.end_odometer_km is not null and new.distance_km is not null then
    insert into public.driver_payments (trip_id, driver_id, distance_km, rate_per_km, amount)
    values (
      new.id,
      new.driver_id,
      new.distance_km,
      new.mileage_rate_per_km,
      new.distance_km * new.mileage_rate_per_km
    )
    on conflict (trip_id) do update
      set distance_km = excluded.distance_km,
          rate_per_km = excluded.rate_per_km,
          amount = case
            when public.driver_payments.status = 'pending' then excluded.amount
            else public.driver_payments.amount
          end,
          driver_id = excluded.driver_id;
  end if;
  return new;
end;
$$;

-- Trigger definition itself is unchanged, but re-create it defensively in
-- case this migration is ever applied out of order relative to 004.
drop trigger if exists trips_sync_driver_payment on public.trips;
create trigger trips_sync_driver_payment after insert or update on public.trips
  for each row execute function public.sync_driver_payment_from_trip();
