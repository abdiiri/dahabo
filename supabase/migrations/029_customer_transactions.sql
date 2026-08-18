-- =============================================================================
-- Migration 029 — Customer ledger (Finance <-> Customers link)
-- =============================================================================
-- Adds public.customer_transactions: every debt given to a customer, and
-- every payment or extra amount received from one. customers.outstanding_balance
-- is kept in sync from the app layer (lib/api/customer-transactions.ts)
-- whenever a row here is inserted, paid against, or removed — this table is
-- the source of truth, outstanding_balance is just a cached total for fast
-- display on the Customers tab. Safe to run more than once.
-- =============================================================================

create table if not exists public.customer_transactions (
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

create index if not exists customer_transactions_customer_id_idx
  on public.customer_transactions (customer_id);

drop trigger if exists customer_transactions_set_updated_at on public.customer_transactions;
create trigger customer_transactions_set_updated_at before update on public.customer_transactions
  for each row execute function public.set_updated_at();

alter table public.customer_transactions enable row level security;

drop policy if exists "customer_transactions read (staff)" on public.customer_transactions;
create policy "customer_transactions read (staff)" on public.customer_transactions
  for select using (public.is_staff());

drop policy if exists "customer_transactions write (staff)" on public.customer_transactions;
create policy "customer_transactions write (staff)" on public.customer_transactions
  for all using (public.is_staff()) with check (public.is_staff());

-- Include the new table in the Recycle Bin's "reset all data" sweep, same as
-- every other operational table (see migration 010).
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
    'vehicles', 'drivers', 'customers', 'customer_transactions', 'shipments',
    'transport_orders', 'trips', 'fuel_records', 'maintenance_records',
    'driver_payments', 'salaries', 'other_expenses', 'invoices', 'payments',
    'warehouses', 'documents'
  ]
  loop
    execute format('update public.%I set deleted_at = now() where deleted_at is null;', t);
  end loop;

  insert into public.audit_logs (actor_id, action, target_table)
  values (auth.uid(), 'reset_all_operational_data', 'all');
end;
$$;
