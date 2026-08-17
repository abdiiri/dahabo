-- =============================================================================
-- Migration 016 — Mileage pay becomes a flat agreement amount
-- =============================================================================
-- Mileage pay used to be distance × a per-km rate, calculated automatically
-- once a trip's ending odometer was entered. That's replaced with a single
-- flat amount agreed for the trip, entered up front when the trip is
-- started — no odometer reading or distance calculation required.
--
-- The driver_payments row (and therefore vehicle_profit_monthly, which just
-- sums driver_payments.amount) is now created as soon as the trip itself is
-- created, using that amount directly, instead of waiting for completion.
-- Revenue and mileage pay still only land in a given month's profit report
-- once the trip is completed (vehicle_profit_monthly already filters on
-- completed_at), so this doesn't change when it hits the books — only how
-- the amount is decided.
--
-- trips.mileage_rate_per_km is renamed to mileage_amount to reflect the new
-- meaning. driver_payments.distance_km / rate_per_km are left in place for
-- historical trips but are no longer required going forward — new rows are
-- inserted with distance_km 0 and rate_per_km 0, since amount no longer
-- derives from them. Safe to run any number of times.
-- =============================================================================

do $$ begin
  alter table public.trips rename column mileage_rate_per_km to mileage_amount;
exception when undefined_column then null; end $$;

create or replace function public.sync_driver_payment_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.driver_payments (trip_id, driver_id, distance_km, rate_per_km, amount)
  values (
    new.id,
    new.driver_id,
    coalesce(new.distance_km, 0),
    0,
    new.mileage_amount
  )
  on conflict (trip_id) do update
    set distance_km = excluded.distance_km,
        amount = case
          when public.driver_payments.status = 'pending' then excluded.amount
          else public.driver_payments.amount
        end,
        driver_id = excluded.driver_id;
  return new;
end;
$$;

-- Fire on insert too (not just update) — the flat amount is known the
-- moment the trip is created, so the driver_payments row can exist from
-- the start instead of waiting for an ending odometer that no longer exists.
drop trigger if exists trips_sync_driver_payment on public.trips;
create trigger trips_sync_driver_payment after insert or update on public.trips
  for each row execute function public.sync_driver_payment_from_trip();
