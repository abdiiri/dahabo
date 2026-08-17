-- =============================================================================
-- Migration 020 — Fix renumbering collision with the unique code constraints
-- =============================================================================
-- Problem this fixes: renumber_fleet_codes() (migration 019) updates rows
-- one at a time, oldest first. While it's mid-pass, a row can briefly be
-- assigned a number that another row — not yet processed — is still
-- wearing (e.g. row A is being renamed to TO-1 while row B still has
-- TO-1 from before). transport_orders.order_code and trips.trip_code are
-- both UNIQUE, and by default Postgres checks a UNIQUE constraint the
-- instant each row is written, so that in-between state fails with a
-- duplicate key error even though the end result would have been fine.
--
-- What this does instead: makes those two UNIQUE constraints DEFERRABLE
-- and INITIALLY DEFERRED, so Postgres only checks them once, at the end
-- of the transaction, after every row has its final number. The
-- constraint still fully applies — two rows still can't end up with the
-- same code — it just isn't checked mid-renumber, only on commit.
--
-- Safe to run more than once.
-- =============================================================================

alter table public.transport_orders
  alter constraint transport_orders_order_code_key deferrable initially deferred;

alter table public.trips
  alter constraint trips_trip_code_key deferrable initially deferred;

-- Re-run the renumber now that it can actually complete.
select public.renumber_fleet_codes();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
