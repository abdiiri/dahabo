-- =============================================================================
-- Migration 004 (safe/rerunnable version) — Transport & Fleet Management
-- =============================================================================
-- Use this INSTEAD of 004_fleet_operations.sql if that one already partially
-- ran and errored (e.g. "type already exists"). Every statement below checks
-- for itself first, so this can be run again and again with no errors,
-- picking up wherever the previous attempt stopped. Once it succeeds, delete
-- 004_fleet_operations.sql from your migrations folder and keep this one.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enums (create only if missing)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.transport_order_status as enum ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trip_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.driver_payment_status as enum ('pending', 'approved', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.salary_type as enum ('salary', 'allowance', 'bonus', 'deduction');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_category as enum ('toll', 'parking', 'permit', 'insurance', 'fine', 'loading', 'offloading', 'other');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 2. Driver mileage rate
-- -----------------------------------------------------------------------------
alter table public.drivers
  add column if not exists mileage_rate_per_km numeric(10, 2) not null default 0;

-- -----------------------------------------------------------------------------
-- 3. Transport orders
-- -----------------------------------------------------------------------------
create table if not exists public.transport_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  customer_id uuid references public.customers (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  pickup_location text not null,
  destination text not null,
  agreed_amount numeric(12, 2) not null default 0,
  status public.transport_order_status not null default 'pending',
  notes text,
  requested_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists transport_orders_set_updated_at on public.transport_orders;
create trigger transport_orders_set_updated_at before update on public.transport_orders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Trips
-- -----------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_code text unique not null,
  transport_order_id uuid references public.transport_orders (id) on delete set null,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  driver_id uuid not null references public.drivers (id) on delete restrict,
  branch_id uuid references public.branches (id) on delete set null,
  origin text not null,
  destination text not null,
  start_odometer_km integer not null,
  end_odometer_km integer,
  distance_km integer generated always as (
    case when end_odometer_km is not null then greatest(end_odometer_km - start_odometer_km, 0) else null end
  ) stored,
  status public.trip_status not null default 'scheduled',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_end_odometer_check check (
    end_odometer_km is null or end_odometer_km >= start_odometer_km
  )
);
drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create index if not exists trips_vehicle_idx on public.trips (vehicle_id);
create index if not exists trips_driver_idx on public.trips (driver_id);

-- -----------------------------------------------------------------------------
-- 5. Driver payments
-- -----------------------------------------------------------------------------
create table if not exists public.driver_payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid unique not null references public.trips (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete restrict,
  distance_km integer not null,
  rate_per_km numeric(10, 2) not null,
  amount numeric(12, 2) not null,
  status public.driver_payment_status not null default 'pending',
  approved_by uuid references public.profiles (id) on delete set null,
  paid_by uuid references public.profiles (id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists driver_payments_set_updated_at on public.driver_payments;
create trigger driver_payments_set_updated_at before update on public.driver_payments
  for each row execute function public.set_updated_at();

create or replace function public.sync_driver_payment_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate numeric(10, 2);
begin
  if new.end_odometer_km is not null and new.distance_km is not null then
    select mileage_rate_per_km into v_rate from public.drivers where id = new.driver_id;
    v_rate := coalesce(v_rate, 0);

    insert into public.driver_payments (trip_id, driver_id, distance_km, rate_per_km, amount)
    values (new.id, new.driver_id, new.distance_km, v_rate, new.distance_km * v_rate)
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

drop trigger if exists trips_sync_driver_payment on public.trips;
create trigger trips_sync_driver_payment after insert or update on public.trips
  for each row execute function public.sync_driver_payment_from_trip();

-- -----------------------------------------------------------------------------
-- 6. Fuel records
-- -----------------------------------------------------------------------------
create table if not exists public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  liters numeric(10, 2) not null,
  cost numeric(12, 2) not null,
  odometer_km integer,
  filled_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists fuel_records_vehicle_idx on public.fuel_records (vehicle_id);

-- -----------------------------------------------------------------------------
-- 7. Maintenance records
-- -----------------------------------------------------------------------------
create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  description text not null,
  vendor text,
  cost numeric(12, 2) not null default 0,
  odometer_km integer,
  service_date date not null default current_date,
  next_service_date date,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists maintenance_records_vehicle_idx on public.maintenance_records (vehicle_id);

create or replace function public.sync_vehicle_next_service()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.next_service_date is not null then
    update public.vehicles set next_service_date = new.next_service_date where id = new.vehicle_id;
  end if;
  return new;
end;
$$;

drop trigger if exists maintenance_records_sync_vehicle on public.maintenance_records;
create trigger maintenance_records_sync_vehicle after insert on public.maintenance_records
  for each row execute function public.sync_vehicle_next_service();

-- -----------------------------------------------------------------------------
-- 8. Salaries & allowances
-- -----------------------------------------------------------------------------
create table if not exists public.salaries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type public.salary_type not null default 'salary',
  amount numeric(12, 2) not null,
  period_month date not null,
  status public.driver_payment_status not null default 'pending',
  paid_by uuid references public.profiles (id) on delete set null,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists salaries_set_updated_at on public.salaries;
create trigger salaries_set_updated_at before update on public.salaries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. Other expenses
-- -----------------------------------------------------------------------------
create table if not exists public.other_expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  category public.expense_category not null default 'other',
  description text not null,
  amount numeric(12, 2) not null,
  incurred_at date not null default current_date,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists other_expenses_vehicle_idx on public.other_expenses (vehicle_id);

-- -----------------------------------------------------------------------------
-- 10. Vehicle profit monthly view (create or replace is already idempotent)
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
),
revenue as (
  select t.vehicle_id, date_trunc('month', t.completed_at)::date as period_month,
         sum(coalesce(o.agreed_amount, 0)) as revenue
  from public.trips t
  join public.transport_orders o on o.id = t.transport_order_id
  where t.status = 'completed' and t.completed_at is not null
  group by 1, 2
),
mileage as (
  select t.vehicle_id, date_trunc('month', t.completed_at)::date as period_month,
         sum(dp.amount) as mileage_payments
  from public.trips t
  join public.driver_payments dp on dp.trip_id = t.id
  where t.completed_at is not null
  group by 1, 2
),
fuel as (
  select vehicle_id, date_trunc('month', filled_at)::date as period_month, sum(cost) as fuel_cost
  from public.fuel_records
  group by 1, 2
),
maintenance as (
  select vehicle_id, date_trunc('month', service_date)::date as period_month, sum(cost) as maintenance_cost
  from public.maintenance_records
  group by 1, 2
),
other as (
  select vehicle_id, date_trunc('month', incurred_at)::date as period_month, sum(amount) as other_cost
  from public.other_expenses
  where vehicle_id is not null
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

-- -----------------------------------------------------------------------------
-- 11. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.transport_orders enable row level security;
alter table public.trips enable row level security;
alter table public.driver_payments enable row level security;
alter table public.fuel_records enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.salaries enable row level security;
alter table public.other_expenses enable row level security;

create or replace function public.is_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('finance_officer', 'admin')
  );
$$;

do $$
declare
  t text;
begin
  foreach t in array array['transport_orders', 'trips', 'fuel_records', 'maintenance_records']
  loop
    execute format('drop policy if exists "%1$s read (staff)" on public.%1$s;', t);
    execute format('create policy "%1$s read (staff)" on public.%1$s for select using (public.is_staff());', t);
    execute format('drop policy if exists "%1$s write (staff)" on public.%1$s;', t);
    execute format('create policy "%1$s write (staff)" on public.%1$s for all using (public.is_staff()) with check (public.is_staff());', t);
  end loop;
end $$;

drop policy if exists "trips read (own)" on public.trips;
create policy "trips read (own)" on public.trips
  for select using (driver_id = auth.uid());

drop policy if exists "driver_payments read (finance or own)" on public.driver_payments;
create policy "driver_payments read (finance or own)" on public.driver_payments
  for select using (public.is_finance() or driver_id = auth.uid());
drop policy if exists "driver_payments write (finance)" on public.driver_payments;
create policy "driver_payments write (finance)" on public.driver_payments
  for all using (public.is_finance()) with check (public.is_finance());

drop policy if exists "salaries read (finance or own)" on public.salaries;
create policy "salaries read (finance or own)" on public.salaries
  for select using (public.is_finance() or profile_id = auth.uid());
drop policy if exists "salaries write (finance)" on public.salaries;
create policy "salaries write (finance)" on public.salaries
  for all using (public.is_finance()) with check (public.is_finance());

drop policy if exists "other_expenses read (finance)" on public.other_expenses;
create policy "other_expenses read (finance)" on public.other_expenses
  for select using (public.is_finance());
drop policy if exists "other_expenses write (finance)" on public.other_expenses;
create policy "other_expenses write (finance)" on public.other_expenses
  for all using (public.is_finance()) with check (public.is_finance());

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
