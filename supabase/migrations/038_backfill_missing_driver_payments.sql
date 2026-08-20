-- =============================================================================
-- Migration 038 — Backfill driver_payments for trips missing a row entirely
-- =============================================================================
-- driver_payments has always been meant to have exactly one row per trip
-- (trip_id is unique — see 004_fleet_operations), auto-created by the
-- sync_driver_payment_from_trip() trigger the moment a trip is inserted.
-- But that trigger, and the driver_payments table itself, were only added
-- in migration 004 — any trip created before that migration ran against a
-- given database (e.g. the very first trip(s) entered while the project was
-- still being set up) has no driver_payments row at all, so it never shows
-- up in the Driver Payments tab no matter how the list is sorted.
--
-- This is different from a soft-deleted payment (which belongs in the
-- Recycle Bin and should be restored from there, not recreated). This
-- backfill only touches trips with ZERO driver_payments rows — soft-deleted
-- rows still count as "exists" for the unique trip_id constraint, so this
-- statement leaves those alone. Safe to run more than once.
-- =============================================================================

insert into public.driver_payments (trip_id, driver_id, distance_km, rate_per_km, amount, created_at)
select
  t.id,
  t.driver_id,
  coalesce(t.distance_km, 0),
  0,
  coalesce(t.mileage_amount, 0),
  t.created_at
from public.trips t
where not exists (
  select 1 from public.driver_payments dp where dp.trip_id = t.id
);
