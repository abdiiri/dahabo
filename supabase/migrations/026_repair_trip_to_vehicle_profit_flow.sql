-- =============================================================================
-- Migration 026 — Repair the Transport Order -> Trip -> Vehicle Profit flow
-- =============================================================================
-- This project's fleet-ops migrations (004 through 025) were designed to be
-- applied one at a time in the Supabase SQL editor, but docs/SUPABASE_SETUP.md
-- only ever documents running schema.sql plus migrations 002 and 003 — it
-- never mentions 004+. Combined with three migrations sharing the same
-- number (011, 012, 024), that made it easy for this project's live database
-- to end up with an older/partial version of the trip-completion logic even
-- though the tables themselves look "clean" in the Table Editor.
--
-- This migration doesn't add anything new — it just re-applies the FINAL,
-- correct state of every piece involved in "complete a trip -> it shows up
-- on Vehicle Profit with revenue, deductions and net profit", in one go:
--
--   1. trips.mileage_amount exists (flat agreed amount, not a per-km rate)
--      and trips.start_odometer_km is nullable (the app never collects it).
--   2. vehicles.excluded_from_profit exists.
--   3. Every operational table has deleted_at (Recycle Bin support).
--   4. sync_driver_payment_from_trip() creates/updates a driver_payments row
--      for the trip's flat mileage_amount as soon as the trip exists — not
--      only once it's completed.
--   5. sync_transport_order_from_trip() marks the linked transport order
--      'completed' the moment its trip is marked 'completed'.
--   6. vehicle_profit_monthly is recreated with the final formula: revenue
--      from completed trips' linked orders, minus fuel, maintenance,
--      mileage pay and other costs — every source table filtered on
--      deleted_at is null, so soft-deleted records never leak into a
--      vehicle's totals.
--   7. Any completed trip that's missing its driver_payments row (e.g. one
--      completed while an older trigger was live) gets backfilled using its
--      own mileage_amount.
--   8. Explicit SELECT grant on the view for authenticated users, in case
--      it was created without one.
--
-- Every statement is safe to run any number of times, in any Supabase
-- project using this schema, regardless of which earlier migrations did or
-- didn't make it in.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Column shape trips/vehicles must have
-- -----------------------------------------------------------------------------
do $$ begin
  alter table public.trips rename column mileage_rate_per_km to mileage_amount;
exception when undefined_column then null; end $$;

alter table public.trips
  add column if not exists mileage_amount numeric(12, 2) not null default 0;

alter table public.trips
  alter column start_odometer_km drop not null;

alter table public.vehicles
  add column if not exists excluded_from_profit boolean not null default false;

-- -----------------------------------------------------------------------------
-- 2. deleted_at on every table the profit view reads from
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'vehicles', 'transport_orders', 'trips', 'fuel_records',
    'maintenance_records', 'driver_payments', 'other_expenses'
  ]
  loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz;', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Driver payment sync — flat mileage_amount, fires on insert and update
-- -----------------------------------------------------------------------------
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

drop trigger if exists trips_sync_driver_payment on public.trips;
create trigger trips_sync_driver_payment after insert or update on public.trips
  for each row execute function public.sync_driver_payment_from_trip();

-- -----------------------------------------------------------------------------
-- 4. Transport order auto-complete when its trip completes
-- -----------------------------------------------------------------------------
create or replace function public.sync_transport_order_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and new.transport_order_id is not null then
    update public.transport_orders
    set status = 'completed'
    where id = new.transport_order_id and status <> 'completed';
  end if;
  return new;
end;
$$;

drop trigger if exists trips_sync_transport_order on public.trips;
create trigger trips_sync_transport_order after insert or update on public.trips
  for each row execute function public.sync_transport_order_from_trip();

-- -----------------------------------------------------------------------------
-- 5. Vehicle profit monthly view — final, deleted_at-aware version
-- -----------------------------------------------------------------------------
create or replace view public.vehicle_profit_monthly as
with months as (
  select v.id as vehicle_id, date_trunc('month', gs)::date as period_month
  from public.vehicles v
  cross join lateral generate_series(
    date_trunc('month', now()) - interval '11 months',
    date_trunc('month', now()),
    interval '1 month'
  ) gs
  where v.deleted_at is null
    and v.excluded_from_profit = false
),
revenue as (
  select t.vehicle_id, date_trunc('month', t.completed_at)::date as period_month,
         sum(coalesce(o.agreed_amount, 0)) as revenue
  from public.trips t
  join public.transport_orders o on o.id = t.transport_order_id
  where t.status = 'completed'
    and t.completed_at is not null
    and t.deleted_at is null
    and o.deleted_at is null
  group by 1, 2
),
mileage as (
  select t.vehicle_id, date_trunc('month', t.completed_at)::date as period_month,
         sum(dp.amount) as mileage_payments
  from public.trips t
  join public.driver_payments dp on dp.trip_id = t.id
  where t.completed_at is not null
    and t.deleted_at is null
    and dp.deleted_at is null
  group by 1, 2
),
fuel as (
  select vehicle_id, date_trunc('month', filled_at)::date as period_month, sum(cost) as fuel_cost
  from public.fuel_records
  where deleted_at is null
  group by 1, 2
),
maintenance as (
  select vehicle_id, date_trunc('month', service_date)::date as period_month, sum(cost) as maintenance_cost
  from public.maintenance_records
  where deleted_at is null
  group by 1, 2
),
other as (
  select vehicle_id, date_trunc('month', incurred_at)::date as period_month, sum(amount) as other_cost
  from public.other_expenses
  where vehicle_id is not null
    and deleted_at is null
  group by 1, 2
)
select
  m.vehicle_id,
  v.vehicle_code,
  v.plate_number,
  m.period_month,
  coalesce(r.revenue, 0) as revenue,
  coalesce(f.fuel_cost, 0) as fuel_cost,
  coalesce(mt.maintenance_cost, 0) as maintenance_cost,
  coalesce(mi.mileage_payments, 0) as mileage_payments,
  coalesce(o.other_cost, 0) as other_cost,
  coalesce(r.revenue, 0)
    - coalesce(f.fuel_cost, 0)
    - coalesce(mt.maintenance_cost, 0)
    - coalesce(mi.mileage_payments, 0)
    - coalesce(o.other_cost, 0) as net_profit
from months m
join public.vehicles v on v.id = m.vehicle_id
left join revenue r on r.vehicle_id = m.vehicle_id and r.period_month = m.period_month
left join mileage mi on mi.vehicle_id = m.vehicle_id and mi.period_month = m.period_month
left join fuel f on f.vehicle_id = m.vehicle_id and f.period_month = m.period_month
left join maintenance mt on mt.vehicle_id = m.vehicle_id and mt.period_month = m.period_month
left join other o on o.vehicle_id = m.vehicle_id and o.period_month = m.period_month;

grant select on public.vehicle_profit_monthly to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Backfill driver_payments for any completed trip missing one
-- -----------------------------------------------------------------------------
insert into public.driver_payments (trip_id, driver_id, distance_km, rate_per_km, amount)
select
  t.id,
  t.driver_id,
  coalesce(t.distance_km, 0),
  0,
  t.mileage_amount
from public.trips t
left join public.driver_payments dp on dp.trip_id = t.id
where t.deleted_at is null
  and dp.id is null;

-- -----------------------------------------------------------------------------
-- 7. Backfill: complete any transport order whose trip is already completed
--    but which the old trigger never caught
-- -----------------------------------------------------------------------------
update public.transport_orders o
set status = 'completed'
from public.trips t
where t.transport_order_id = o.id
  and t.status = 'completed'
  and t.deleted_at is null
  and o.status <> 'completed';

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
