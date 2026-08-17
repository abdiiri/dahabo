-- =============================================================================
-- Migration 024 — Trips no longer require an odometer reading
-- =============================================================================
-- Problem this fixes: start_odometer_km was NOT NULL on public.trips, but
-- the app no longer asks for a starting (or ending) odometer reading when a
-- trip is started or completed — it now just records started_at /
-- completed_at automatically. Inserting a trip without an odometer value
-- would fail against the old NOT NULL constraint.
--
-- What this does: makes start_odometer_km nullable, same as
-- end_odometer_km already was. The columns and the generated distance_km
-- column are left in place (harmless, just unused going forward) so no
-- historical data is lost — only new trips will have null odometer values.
--
-- Safe to run more than once.
-- =============================================================================

alter table public.trips
  alter column start_odometer_km drop not null;

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
