-- =============================================================================
-- Migration 017 — vehicle profit: stop counting deleted records
-- =============================================================================
-- vehicle_profit_monthly summed fuel_records, maintenance_records,
-- other_expenses, trips and driver_payments without ever checking their
-- deleted_at column. Every one of those tables supports the Recycle Bin
-- (soft delete, migration 010) — so moving a fuel purchase, a trip, or any
-- other record to the Recycle Bin removed it from every list in the app,
-- but the profit view kept adding its amount into that vehicle's totals
-- forever. That's why a vehicle's Fuel (or Revenue, or Mileage pay) figure
-- could be higher than what the on-screen breakdown adds up to — the
-- difference was sitting in the Recycle Bin, still being counted.
--
-- This re-creates the view with "and deleted_at is null" added to every
-- source table it reads from. Once a record is actually restored from the
-- Recycle Bin, it starts counting again automatically; once it's
-- permanently deleted, or as long as it stays in the bin, it's excluded.
-- Safe to run any number of times.
-- =============================================================================

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
