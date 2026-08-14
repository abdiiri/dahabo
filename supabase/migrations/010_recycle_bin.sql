-- =============================================================================
-- Migration 010 — Recycle Bin + safe "reset all data"
-- =============================================================================
-- Adds a deleted_at column to every operational table. From now on, deleting
-- a record (from the app, or via the bulk reset below) just sets deleted_at
-- — it stays in the database, hidden from normal views, until someone
-- restores it or empties the Recycle Bin (a real, permanent delete).
-- Safe to run more than once.
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'vehicles', 'drivers', 'customers', 'shipments', 'transport_orders', 'trips',
    'fuel_records', 'maintenance_records', 'driver_payments', 'salaries',
    'other_expenses', 'invoices', 'payments', 'warehouses', 'documents'
  ]
  loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz;', t);
  end loop;
end $$;

-- Admin-only: soft-deletes every row in every table above in one go, so the
-- system can be handed to a client with a clean slate while staying
-- reversible from the Recycle Bin. Never touches staff/driver login
-- accounts, branches, or audit_logs.
create or replace function public.reset_all_operational_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do this.';
  end if;

  foreach t in array array[
    'vehicles', 'drivers', 'customers', 'shipments', 'transport_orders', 'trips',
    'fuel_records', 'maintenance_records', 'driver_payments', 'salaries',
    'other_expenses', 'invoices', 'payments', 'warehouses', 'documents'
  ]
  loop
    execute format('update public.%I set deleted_at = now() where deleted_at is null;', t);
  end loop;

  insert into public.audit_logs (actor_id, action, target_table)
  values (auth.uid(), 'reset_all_operational_data', 'all');
end;
$$;
