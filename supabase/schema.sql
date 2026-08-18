-- =============================================================================
-- Dahabo Global Logistics — Supabase database schema
-- =============================================================================
-- Run this whole file once in your Supabase project's SQL editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- It creates empty tables only — no sample/demo rows are inserted.
--
-- This schema assumes:
--   • This is an ADMIN & STAFF ONLY system. There is no "customer" login role.
--   • Every staff member (including drivers) is a row in `profiles`, which
--     extends Supabase's built-in `auth.users` table 1-to-1.
--   • `drivers` holds the extra fields drivers need (national ID, licence,
--     company driver ID, next of kin, etc.) and points back to `profiles`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 1. Enum types
-- -----------------------------------------------------------------------------
create type public.staff_role as enum (
  'admin',              -- full system access
  'operations_manager',
  'finance_officer',
  'warehouse_manager',
  'fleet_manager',
  'staff',               -- general/other staff
  'driver'
);

create type public.staff_status as enum ('active', 'suspended', 'on_leave');

create type public.driver_status as enum ('available', 'on_route', 'off_duty', 'suspended');

create type public.license_class as enum ('A', 'B', 'C', 'D', 'E', 'CE', 'BCE');

create type public.vehicle_status as enum ('active', 'idle', 'maintenance', 'decommissioned');

create type public.vehicle_type as enum (
  'prime_mover', 'reefer_truck', 'flatbed', 'box_truck', 'tanker', 'van', 'pickup', 'lowbed', 'other'
);

create type public.shipment_status as enum (
  'pending', 'at_warehouse', 'in_transit', 'delayed', 'delivered', 'cancelled'
);

create type public.assignment_type as enum ('delivery', 'pickup', 'transfer', 'maintenance_run', 'other');

create type public.assignment_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');

create type public.invoice_status as enum ('draft', 'pending', 'paid', 'overdue', 'cancelled');

create type public.payment_method as enum ('mpesa', 'bank_transfer', 'card', 'cheque', 'cash');

create type public.payment_status as enum ('processing', 'settled', 'failed');

create type public.document_type as enum (
  'bill_of_lading', 'customs_declaration', 'proof_of_delivery', 'insurance_certificate',
  'packing_list', 'id_document', 'license_document', 'contract', 'other'
);

-- -----------------------------------------------------------------------------
-- 2. Helper: updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Branches (offices / depots)
-- -----------------------------------------------------------------------------
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  country text,
  phone text,
  hours text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger branches_set_updated_at before update on public.branches
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Profiles — one row per authenticated staff/admin/driver user
--    (extends auth.users; created automatically by the trigger at the bottom)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  staff_code text unique,                 -- e.g. "USR-101"
  full_name text not null,
  email text not null,
  phone text,
  role public.staff_role not null default 'staff',
  job_title text,
  department text,
  branch_id uuid references public.branches (id) on delete set null,
  status public.staff_status not null default 'active',
  must_change_password boolean not null default false,
  avatar_url text,
  date_joined date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Vehicles / fleet
-- -----------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_code text unique not null,      -- e.g. "VEH-2200"
  plate_number text unique not null,
  type public.vehicle_type not null default 'prime_mover',
  capacity text,
  status public.vehicle_status not null default 'active',
  odometer_km integer default 0,
  next_service_date date,
  branch_id uuid references public.branches (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger vehicles_set_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Drivers — extends profiles with driver-specific compliance details
-- -----------------------------------------------------------------------------
create table public.drivers (
  id uuid primary key references public.profiles (id) on delete cascade,
  driver_code text unique not null,        -- company-issued driver/staff ID, e.g. "DRV-900"
  national_id text not null,
  license_number text not null,
  license_class public.license_class not null default 'CE',
  license_expiry date,
  date_of_birth date,
  address text,
  next_of_kin_name text,
  next_of_kin_phone text,
  base_branch_id uuid references public.branches (id) on delete set null,
  assigned_vehicle_id uuid references public.vehicles (id) on delete set null,
  status public.driver_status not null default 'available',
  rating numeric(2, 1) default 5.0,
  total_trips integer not null default 0,
  current_location text,
  location_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger drivers_set_updated_at before update on public.drivers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Warehouses
-- -----------------------------------------------------------------------------
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  warehouse_code text unique not null,     -- e.g. "WH-01"
  name text not null,
  city text,
  capacity_pct integer,
  size_sqm integer,
  dock_count integer,
  manager_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger warehouses_set_updated_at before update on public.warehouses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Customers — business accounts staff manage (no login of their own)
-- -----------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique not null,      -- e.g. "CUS-4100"
  name text not null,
  contact_name text,
  email text,
  phone text,
  tier text default 'SME',                 -- Enterprise / Corporate / SME
  status text not null default 'active',
  outstanding_balance numeric(14, 2) not null default 0,
  customer_since date default current_date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8b. Customer ledger — debts given to, and extra money received from, a
--     customer. customers.outstanding_balance is a cached total kept in
--     sync from the app layer whenever a row here changes.
-- -----------------------------------------------------------------------------
create table public.customer_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  type text not null check (type in ('debt', 'extra')),
  amount numeric(14, 2) not null check (amount > 0),
  amount_paid numeric(14, 2) not null default 0,
  mode public.payment_method not null default 'cash',
  reference text,
  entry_date date not null default current_date,
  paid_date date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_transactions_customer_id_idx on public.customer_transactions (customer_id);
create trigger customer_transactions_set_updated_at before update on public.customer_transactions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. Shipments
-- -----------------------------------------------------------------------------
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  shipment_code text unique not null,      -- e.g. "DGL-102345"
  customer_id uuid references public.customers (id) on delete set null,
  origin text not null,
  destination text not null,
  status public.shipment_status not null default 'pending',
  service text,
  weight_kg numeric(10, 2),
  value numeric(14, 2),
  progress_pct integer not null default 0,
  eta date,
  driver_id uuid references public.drivers (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger shipments_set_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. Assignments — work staff hand to a driver (trip, pickup, transfer, etc.)
-- -----------------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_code text unique not null,    -- e.g. "ASG-1001"
  driver_id uuid not null references public.drivers (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  shipment_id uuid references public.shipments (id) on delete set null,
  type public.assignment_type not null default 'delivery',
  title text not null,
  notes text,
  origin text,
  destination text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  status public.assignment_status not null default 'scheduled',
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger assignments_set_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10b. Driver cash advances — money handed to a driver, and their write-up
--      of how it was spent.
-- -----------------------------------------------------------------------------
create table public.driver_advances (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null,
  purpose text,
  given_by uuid references public.profiles (id) on delete set null,
  given_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'reported')),
  usage_amount numeric(12, 2),
  usage_report text,
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger driver_advances_set_updated_at before update on public.driver_advances
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 11. Documents
-- -----------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  document_code text unique not null,      -- e.g. "DOC-5500"
  name text not null,
  type public.document_type not null default 'other',
  file_url text,
  file_size_kb integer,
  shipment_id uuid references public.shipments (id) on delete set null,
  driver_id uuid references public.drivers (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 12. Invoices & payments
-- -----------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_code text unique not null,       -- e.g. "INV-2026-1040"
  customer_id uuid references public.customers (id) on delete set null,
  shipment_id uuid references public.shipments (id) on delete set null,
  amount numeric(14, 2) not null,
  status public.invoice_status not null default 'draft',
  issued_date date not null default current_date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_code text unique not null,       -- e.g. "PAY-7700"
  invoice_id uuid references public.invoices (id) on delete cascade,
  method public.payment_method not null default 'mpesa',
  amount numeric(14, 2) not null,
  status public.payment_status not null default 'processing',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 13. Notifications
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade,
  category text not null default 'System',
  title text not null,
  tone text not null default 'default',    -- default | success | warning | danger
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 14. Audit logs
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  ip_address text,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 15. Row Level Security
-- =============================================================================
-- Every table below is admin/staff-only. There is no anonymous or "customer"
-- access — every policy requires an authenticated user with a profiles row.
-- =============================================================================

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.warehouses enable row level security;
alter table public.customers enable row level security;
alter table public.customer_transactions enable row level security;
alter table public.shipments enable row level security;
alter table public.assignments enable row level security;
alter table public.driver_advances enable row level security;
alter table public.documents enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: is the current user staff (any non-driver role)?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'driver'
  );
$$;

-- profiles: everyone signed in can read the staff directory; only admins
-- can create/update/delete other people's records; anyone can update their own.
create policy "profiles read (signed in)" on public.profiles
  for select using (auth.uid() is not null);
create policy "profiles insert (admin only)" on public.profiles
  for insert with check (public.is_admin());
create policy "profiles update (self or admin)" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "profiles delete (admin only)" on public.profiles
  for delete using (public.is_admin());

-- drivers: staff can read/manage; a driver can read (and lightly update) their own row.
create policy "drivers read (staff or self)" on public.drivers
  for select using (public.is_staff() or id = auth.uid());
create policy "drivers insert (staff)" on public.drivers
  for insert with check (public.is_staff());
create policy "drivers update (staff or self)" on public.drivers
  for update using (public.is_staff() or id = auth.uid());
create policy "drivers delete (admin only)" on public.drivers
  for delete using (public.is_admin());

-- The self-update policy above lets a driver update their own row (to
-- check in current_location). This trigger narrows that to just the
-- location fields — everything else about their own compliance record can
-- only be changed by staff.
create or replace function public.protect_driver_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    new.driver_code := old.driver_code;
    new.national_id := old.national_id;
    new.license_number := old.license_number;
    new.license_class := old.license_class;
    new.license_expiry := old.license_expiry;
    new.date_of_birth := old.date_of_birth;
    new.address := old.address;
    new.next_of_kin_name := old.next_of_kin_name;
    new.next_of_kin_phone := old.next_of_kin_phone;
    new.base_branch_id := old.base_branch_id;
    new.assigned_vehicle_id := old.assigned_vehicle_id;
    new.status := old.status;
    new.rating := old.rating;
    new.total_trips := old.total_trips;
  end if;
  return new;
end;
$$;

create trigger drivers_protect_fields before update on public.drivers
  for each row execute function public.protect_driver_fields();

-- assignments: staff manage; a driver can read/update only their own assignments.
create policy "assignments read (staff or own)" on public.assignments
  for select using (public.is_staff() or driver_id = auth.uid());
create policy "assignments insert (staff)" on public.assignments
  for insert with check (public.is_staff());
create policy "assignments update (staff or own)" on public.assignments
  for update using (public.is_staff() or driver_id = auth.uid());
create policy "assignments delete (staff)" on public.assignments
  for delete using (public.is_staff());

-- driver_advances: staff record/see everything; a driver sees only their own
-- and may only edit the usage_* fields on their own rows (enforced below).
create policy "driver_advances read (staff or own)" on public.driver_advances
  for select using (public.is_staff() or driver_id = auth.uid());
create policy "driver_advances insert (staff)" on public.driver_advances
  for insert with check (public.is_staff());
create policy "driver_advances update (staff or own)" on public.driver_advances
  for update using (public.is_staff() or driver_id = auth.uid());
create policy "driver_advances delete (staff)" on public.driver_advances
  for delete using (public.is_staff());

create or replace function public.protect_driver_advance_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    new.amount := old.amount;
    new.purpose := old.purpose;
    new.given_by := old.given_by;
    new.given_at := old.given_at;
    new.driver_id := old.driver_id;
  end if;
  return new;
end;
$$;

create trigger driver_advances_protect_fields before update on public.driver_advances
  for each row execute function public.protect_driver_advance_fields();

-- Everything else (branches, vehicles, warehouses, customers, shipments,
-- documents, invoices, payments, notifications, audit_logs): staff-only
-- read/write. Generate one read + one write policy per table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'branches', 'vehicles', 'warehouses', 'customers', 'customer_transactions', 'shipments',
    'documents', 'invoices', 'payments', 'audit_logs'
  ]
  loop
    execute format(
      'create policy "%1$s read (staff)" on public.%1$s for select using (public.is_staff());',
      t
    );
    execute format(
      'create policy "%1$s write (staff)" on public.%1$s for all using (public.is_staff()) with check (public.is_staff());',
      t
    );
  end loop;
end $$;

-- notifications: a user only sees their own; staff can create notifications for anyone.
create policy "notifications read (own)" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "notifications insert (staff)" on public.notifications
  for insert with check (public.is_staff());
create policy "notifications update (own)" on public.notifications
  for update using (recipient_id = auth.uid());

-- =============================================================================
-- 16. Auto-create a profile row whenever a new auth user signs up
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Done. All tables above are empty — no seed/demo rows.
-- Next: see docs/SUPABASE_SETUP.md to create your first admin user and
-- connect this app to your project.
-- =============================================================================
