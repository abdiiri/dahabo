-- =============================================================================
-- Migration 021 — Fix: ALTER CONSTRAINT doesn't work on UNIQUE constraints
-- =============================================================================
-- Problem this fixes: migration 020 tried to make order_code/trip_code's
-- UNIQUE constraints deferrable with "alter table ... alter constraint ...
-- deferrable initially deferred". Postgres only allows that specific
-- command on foreign key constraints — for a UNIQUE constraint you have to
-- drop it and recreate it with DEFERRABLE set from the start. Same end
-- goal as migration 020, different (correct) method.
--
-- Safe to run more than once.
-- =============================================================================

alter table public.transport_orders
  drop constraint if exists transport_orders_order_code_key;
alter table public.transport_orders
  add constraint transport_orders_order_code_key
  unique (order_code) deferrable initially deferred;

alter table public.trips
  drop constraint if exists trips_trip_code_key;
alter table public.trips
  add constraint trips_trip_code_key
  unique (trip_code) deferrable initially deferred;

-- Re-run the renumber now that the constraints can actually be deferred
-- to the end of the transaction instead of checked row-by-row.
select public.renumber_fleet_codes();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
