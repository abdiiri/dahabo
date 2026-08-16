-- =============================================================================
-- Migration 013 — Backfill missing driver_payments for already-completed trips
-- =============================================================================
-- The trigger that creates a driver_payments row only fires at the moment a
-- trip is completed or edited. Any trip that was completed before the
-- mileage-rate migration (011) was fully applied never got a payment row,
-- and never will on its own — nothing re-fires the trigger for it after the
-- fact. This finds every completed trip with a real distance that's missing
-- its driver_payments row, and creates it now, using the same formula the
-- trigger uses. Safe to run any number of times — trips that already have a
-- payment row are skipped.
-- =============================================================================

insert into public.driver_payments (trip_id, driver_id, distance_km, rate_per_km, amount)
select
  t.id,
  t.driver_id,
  t.distance_km,
  t.mileage_rate_per_km,
  t.distance_km * t.mileage_rate_per_km
from public.trips t
left join public.driver_payments dp on dp.trip_id = t.id
where t.deleted_at is null
  and t.status = 'completed'
  and t.end_odometer_km is not null
  and t.distance_km is not null
  and dp.id is null;
