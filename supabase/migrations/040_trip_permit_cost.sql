-- =============================================================================
-- Migration 040 — Permit/legal fees per trip, subtracted from vehicle profit
-- =============================================================================
-- Adds trips.permit_cost — a flat fee for transit permits, tolls, or other
-- paperwork tied to a specific trip. Unlike mileage_amount, this is a cost,
-- not driver pay, so it never touches driver_payments — it only reduces the
-- vehicle's net profit, the same way fuel and maintenance costs do.
--
-- Re-defines vehicle_profit_monthly (last set in migration 026) to add a
-- permit_costs column and subtract it in net_profit. Safe to run more than
-- once.
-- =============================================================================

alter table public.trips
  add column if not exists permit_cost numeric(12, 2) not null default 0;

-- CREATE OR REPLACE VIEW can only append columns at the end, not insert one
-- in the middle — inserting permit_costs before the existing other_cost
-- column would silently try to rename other_cost's position, which Postgres
-- (correctly) refuses. Drop and recreate instead, which has no such
-- restriction.
drop view if exists public.vehicle_profit_monthly;

create view public.vehicle_profit_monthly as
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
permits as (
  select t.vehicle_id, date_trunc('month', t.completed_at)::date as period_month,
         sum(t.permit_cost) as permit_costs
  from public.trips t
  where t.status = 'completed'
    and t.completed_at is not null
    and t.deleted_at is null
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
  coalesce(p.permit_costs, 0) as permit_costs,
  coalesce(o.other_cost, 0) as other_cost,
  coalesce(r.revenue, 0)
    - coalesce(f.fuel_cost, 0)
    - coalesce(mt.maintenance_cost, 0)
    - coalesce(mi.mileage_payments, 0)
    - coalesce(p.permit_costs, 0)
    - coalesce(o.other_cost, 0) as net_profit
from months m
join public.vehicles v on v.id = m.vehicle_id
left join revenue r on r.vehicle_id = m.vehicle_id and r.period_month = m.period_month
left join mileage mi on mi.vehicle_id = m.vehicle_id and mi.period_month = m.period_month
left join permits p on p.vehicle_id = m.vehicle_id and p.period_month = m.period_month
left join fuel f on f.vehicle_id = m.vehicle_id and f.period_month = m.period_month
left join maintenance mt on mt.vehicle_id = m.vehicle_id and mt.period_month = m.period_month
left join other o on o.vehicle_id = m.vehicle_id and o.period_month = m.period_month;

grant select on public.vehicle_profit_monthly to authenticated;
