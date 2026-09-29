-- =============================================================================
-- Migration 045 — Partner Fleet: owner-operators who bring their own vehicle
-- and driver, and are given a job rather than run through Dahabo's own fleet
-- =============================================================================
-- A regular Transport Order gets fulfilled by starting a Trip against one of
-- Dahabo's own vehicles and employed drivers. Some jobs instead go to an
-- outside owner-operator — someone who shows up with their own truck and
-- their own driver, gets handed the job, and is paid a flat amount for it.
-- None of the Trip machinery applies to them (no Dahabo vehicle to track
-- fuel/mileage/profit for, no employed driver to clock on/off duty), so
-- this is a parallel, much simpler pair of tables rather than forcing them
-- through trips/driver_payments.
--
-- Adds:
--   • partners — the directory: name, phone, their vehicle's plate, their
--     driver's name. Sequentially coded PTR-1, PTR-2… the same safe,
--     two-phase way customers/vehicles/orders are (see migration 034).
--   • partner_jobs — one row per order handed to a partner: which partner,
--     which order, what they're being paid, and whether that payout is
--     pending, approved, or paid — the same three-state flow
--     driver_payments already uses.
-- Both are staff-readable/writable (is_staff()), soft-deletable into the
-- same Recycle Bin as everything else, and wired into audit logging.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. partners
-- -----------------------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  partner_code text not null,
  name text not null,
  phone text,
  vehicle_plate text not null,
  driver_name text not null,
  created_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists partners_set_updated_at on public.partners;
create trigger partners_set_updated_at before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;
drop policy if exists "staff full access" on public.partners;
create policy "staff full access" on public.partners for all using (is_staff());

-- Sequential PTR-N codes, active-only uniqueness, same two-phase renumber
-- pattern as renumber_customer_codes() (migration 034) — a temp code first
-- so active partners never collide with each other while renumbering.
create unique index if not exists partners_partner_code_active_key
  on public.partners (partner_code)
  where deleted_at is null;

create or replace function public.renumber_partner_codes()
returns void
language plpgsql
as $$
declare
  r record;
  v_ref integer := 0;
begin
  lock table public.partners in share row exclusive mode;

  update public.partners set partner_code = '-tmp-' || id::text where deleted_at is null;

  for r in
    select id from public.partners
    where deleted_at is null
    order by created_at asc, id asc
  loop
    v_ref := v_ref + 1;
    update public.partners set partner_code = 'PTR-' || v_ref where id = r.id;
  end loop;
end;
$$;

create or replace function public.trigger_renumber_partner_codes()
returns trigger
language plpgsql
as $$
begin
  perform public.renumber_partner_codes();
  return null;
end;
$$;

drop trigger if exists partners_renumber on public.partners;
create trigger partners_renumber
  after update of deleted_at or delete on public.partners
  for each row execute function public.trigger_renumber_partner_codes();

create or replace function public.set_partner_code()
returns trigger
language plpgsql
as $$
declare
  v_next integer;
begin
  lock table public.partners in share row exclusive mode;
  select coalesce(max(substring(partner_code from 'PTR-(\d+)')::integer), 0) + 1
    into v_next
    from public.partners
    where deleted_at is null and partner_code ~ '^PTR-\d+$';
  new.partner_code := 'PTR-' || v_next;
  return new;
end;
$$;

drop trigger if exists partners_set_code on public.partners;
create trigger partners_set_code before insert on public.partners
  for each row
  when (new.partner_code is null or new.partner_code = '')
  execute function public.set_partner_code();

-- -----------------------------------------------------------------------------
-- 2. partner_jobs — one row per order handed to a partner
-- -----------------------------------------------------------------------------
create table if not exists public.partner_jobs (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete restrict,
  transport_order_id uuid not null references public.transport_orders (id) on delete cascade,
  payout_amount numeric(12, 2) not null default 0,
  status public.driver_payment_status not null default 'pending',
  approved_by uuid references public.profiles (id) on delete set null,
  paid_by uuid references public.profiles (id) on delete set null,
  paid_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_jobs_partner_id_idx on public.partner_jobs (partner_id);
create index if not exists partner_jobs_transport_order_id_idx on public.partner_jobs (transport_order_id);

drop trigger if exists partner_jobs_set_updated_at on public.partner_jobs;
create trigger partner_jobs_set_updated_at before update on public.partner_jobs
  for each row execute function public.set_updated_at();

alter table public.partner_jobs enable row level security;
drop policy if exists "staff full access" on public.partner_jobs;
create policy "staff full access" on public.partner_jobs for all using (is_staff());

-- -----------------------------------------------------------------------------
-- 3. Audit logging — same generic dispatcher every other table uses
--    (migration 033), extended with a branch for each of these two tables.
-- -----------------------------------------------------------------------------
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_description text;
  v_target_id text;
  v_name text;
begin
  v_target_id := coalesce(new.id, old.id)::text;

  if tg_table_name = 'transport_orders' then
    if tg_op = 'INSERT' then
      v_action := 'order_created';
      v_description := 'Created transport order ' || new.order_code || ' (' || new.pickup_location || ' to ' || new.destination || ')';
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'order_deleted';
        v_description := 'Moved transport order ' || new.order_code || ' to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'order_restored';
        v_description := 'Restored transport order ' || new.order_code || ' from Recycle Bin';
      elsif old.status is distinct from new.status then
        v_action := 'order_status_changed';
        v_description := 'Transport order ' || new.order_code || ' status changed from ' || old.status::text || ' to ' || new.status::text;
      else
        v_action := 'order_updated';
        v_description := 'Updated transport order ' || new.order_code;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'order_permanently_deleted';
      v_description := 'Permanently deleted transport order ' || old.order_code;
    end if;

  elsif tg_table_name = 'trips' then
    if tg_op = 'INSERT' then
      v_action := 'trip_created';
      v_description := 'Created trip ' || new.trip_code || ' (' || new.origin || ' to ' || new.destination || ')';
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'trip_deleted';
        v_description := 'Moved trip ' || new.trip_code || ' to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'trip_restored';
        v_description := 'Restored trip ' || new.trip_code || ' from Recycle Bin';
      elsif old.status is distinct from new.status and new.status = 'completed' then
        v_action := 'trip_completed';
        v_description := 'Completed trip ' || new.trip_code || case when new.distance_km is not null then ' — ' || new.distance_km || ' km' else '' end;
      elsif old.status is distinct from new.status and new.status = 'in_progress' then
        v_action := 'trip_started';
        v_description := 'Started trip ' || new.trip_code;
      elsif old.status is distinct from new.status and new.status = 'cancelled' then
        v_action := 'trip_cancelled';
        v_description := 'Cancelled trip ' || new.trip_code;
      elsif old.status is distinct from new.status then
        v_action := 'trip_status_changed';
        v_description := 'Trip ' || new.trip_code || ' status changed to ' || new.status::text;
      else
        v_action := 'trip_updated';
        v_description := 'Updated trip ' || new.trip_code;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'trip_permanently_deleted';
      v_description := 'Permanently deleted trip ' || old.trip_code;
    end if;

  elsif tg_table_name = 'driver_payments' then
    if tg_op = 'UPDATE' and old.status is distinct from new.status then
      if new.status = 'approved' then
        v_action := 'driver_payment_approved';
        v_description := 'Approved a driver payment of KES ' || to_char(new.amount, 'FM999,999,990.00');
      elsif new.status = 'paid' then
        v_action := 'driver_payment_paid';
        v_description := 'Paid a driver payment of KES ' || to_char(new.amount, 'FM999,999,990.00');
      end if;
    end if;

  elsif tg_table_name = 'fuel_records' then
    if tg_op = 'INSERT' then
      v_action := 'fuel_logged';
      v_description := 'Logged fuel purchase — ' || new.liters || 'L for KES ' || to_char(new.cost, 'FM999,999,990.00');
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'fuel_record_deleted';
        v_description := 'Moved a fuel record to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'fuel_record_restored';
        v_description := 'Restored a fuel record from Recycle Bin';
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'fuel_record_permanently_deleted';
      v_description := 'Permanently deleted a fuel record';
    end if;

  elsif tg_table_name = 'maintenance_records' then
    if tg_op = 'INSERT' then
      v_action := 'maintenance_recorded';
      v_description := 'Recorded maintenance — ' || new.description || ' (KES ' || to_char(new.cost, 'FM999,999,990.00') || ')';
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'maintenance_record_deleted';
        v_description := 'Moved a maintenance record to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'maintenance_record_restored';
        v_description := 'Restored a maintenance record from Recycle Bin';
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'maintenance_record_permanently_deleted';
      v_description := 'Permanently deleted a maintenance record';
    end if;

  elsif tg_table_name = 'salaries' then
    if tg_op = 'INSERT' then
      v_action := 'salary_entry_created';
      v_description := 'Recorded a ' || new.type::text || ' of KES ' || to_char(new.amount, 'FM999,999,990.00');
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'salary_entry_deleted';
        v_description := 'Moved a salary/allowance entry to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'salary_entry_restored';
        v_description := 'Restored a salary/allowance entry from Recycle Bin';
      elsif old.status is distinct from new.status and new.status = 'paid' then
        v_action := 'salary_paid';
        v_description := 'Paid a ' || new.type::text || ' of KES ' || to_char(new.amount, 'FM999,999,990.00');
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'salary_entry_permanently_deleted';
      v_description := 'Permanently deleted a salary/allowance entry';
    end if;

  elsif tg_table_name = 'other_expenses' then
    if tg_op = 'INSERT' then
      v_action := 'expense_recorded';
      v_description := 'Recorded expense — ' || new.description || ' (KES ' || to_char(new.amount, 'FM999,999,990.00') || ')';
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'expense_deleted';
        v_description := 'Moved an expense to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'expense_restored';
        v_description := 'Restored an expense from Recycle Bin';
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'expense_permanently_deleted';
      v_description := 'Permanently deleted an expense';
    end if;

  elsif tg_table_name = 'driver_advances' then
    if tg_op = 'INSERT' then
      select full_name into v_name from public.profiles where id = new.driver_id;
      v_action := 'advance_given';
      v_description := 'Gave a cash advance of KES ' || to_char(new.amount, 'FM999,999,990.00') || coalesce(' to ' || v_name, '');
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'reported' then
      v_action := 'advance_reported';
      v_description := 'Advance usage reported' || case when new.usage_amount is not null then ' — KES ' || to_char(new.usage_amount, 'FM999,999,990.00') else '' end;
    end if;

  elsif tg_table_name = 'customer_transactions' then
    if tg_op = 'INSERT' then
      select name into v_name from public.customers where id = new.customer_id;
      if new.type = 'debt' then
        v_action := 'debt_recorded';
        v_description := 'Recorded a debt of KES ' || to_char(new.amount, 'FM999,999,990.00') || coalesce(' for ' || v_name, '');
      else
        v_action := 'money_received';
        v_description := 'Received an ' || new.type || ' payment of KES ' || to_char(new.amount, 'FM999,999,990.00') || coalesce(' from ' || v_name, '');
      end if;
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'customer_transaction_deleted';
        v_description := 'Moved a customer ledger entry to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'customer_transaction_restored';
        v_description := 'Restored a customer ledger entry from Recycle Bin';
      elsif new.amount_paid > old.amount_paid then
        select name into v_name from public.customers where id = new.customer_id;
        v_action := 'payment_received';
        v_description := 'Received payment of KES ' || to_char(new.amount_paid - old.amount_paid, 'FM999,999,990.00') || coalesce(' from ' || v_name, '') || ' against a debt';
      end if;
    end if;

  elsif tg_table_name = 'invoices' then
    if tg_op = 'INSERT' then
      v_action := 'invoice_created';
      v_description := 'Created invoice ' || new.invoice_code || ' for KES ' || to_char(new.amount, 'FM999,999,990.00');
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'invoice_deleted';
        v_description := 'Moved invoice ' || new.invoice_code || ' to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'invoice_restored';
        v_description := 'Restored invoice ' || new.invoice_code || ' from Recycle Bin';
      elsif old.status is distinct from new.status and new.status = 'paid' then
        v_action := 'invoice_paid';
        v_description := 'Invoice ' || new.invoice_code || ' marked as paid';
      elsif old.status is distinct from new.status then
        v_action := 'invoice_status_changed';
        v_description := 'Invoice ' || new.invoice_code || ' status changed to ' || new.status::text;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'invoice_permanently_deleted';
      v_description := 'Permanently deleted invoice ' || old.invoice_code;
    end if;

  elsif tg_table_name = 'payments' then
    if tg_op = 'INSERT' then
      v_action := 'payment_received';
      v_description := 'Received payment ' || new.payment_code || ' of KES ' || to_char(new.amount, 'FM999,999,990.00') || ' via ' || new.method::text;
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
      v_action := 'payment_status_changed';
      v_description := 'Payment ' || new.payment_code || ' status changed to ' || new.status::text;
    elsif tg_op = 'DELETE' then
      v_action := 'payment_permanently_deleted';
      v_description := 'Permanently deleted payment ' || old.payment_code;
    end if;

  elsif tg_table_name = 'customers' then
    if tg_op = 'INSERT' then
      v_action := 'customer_created';
      v_description := 'Added customer ' || new.name;
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'customer_deleted';
        v_description := 'Moved customer ' || new.name || ' to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'customer_restored';
        v_description := 'Restored customer ' || new.name || ' from Recycle Bin';
      elsif old.status is distinct from new.status then
        v_action := 'customer_status_changed';
        v_description := 'Customer ' || new.name || ' status changed to ' || new.status;
      else
        v_action := 'customer_updated';
        v_description := 'Updated customer ' || new.name;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'customer_permanently_deleted';
      v_description := 'Permanently deleted customer ' || old.name;
    end if;

  elsif tg_table_name = 'vehicles' then
    if tg_op = 'INSERT' then
      v_action := 'vehicle_added';
      v_description := 'Added vehicle ' || new.vehicle_code || ' (' || new.plate_number || ')';
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'vehicle_deleted';
        v_description := 'Moved vehicle ' || new.vehicle_code || ' to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'vehicle_restored';
        v_description := 'Restored vehicle ' || new.vehicle_code || ' from Recycle Bin';
      elsif old.status is distinct from new.status then
        v_action := 'vehicle_status_changed';
        v_description := 'Vehicle ' || new.vehicle_code || ' status changed to ' || new.status::text;
      else
        v_action := 'vehicle_updated';
        v_description := 'Updated vehicle ' || new.vehicle_code;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'vehicle_permanently_deleted';
      v_description := 'Permanently deleted vehicle ' || old.vehicle_code;
    end if;

  elsif tg_table_name = 'drivers' then
    if tg_op = 'INSERT' then
      select full_name into v_name from public.profiles where id = new.id;
      v_action := 'driver_added';
      v_description := 'Added driver ' || new.driver_code || coalesce(' — ' || v_name, '');
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'driver_deleted';
        v_description := 'Moved driver ' || new.driver_code || ' to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'driver_restored';
        v_description := 'Restored driver ' || new.driver_code || ' from Recycle Bin';
      elsif old.status is distinct from new.status then
        v_action := 'driver_status_changed';
        v_description := 'Driver ' || new.driver_code || ' status changed to ' || new.status::text;
      else
        v_action := 'driver_updated';
        v_description := 'Updated driver ' || new.driver_code;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'driver_permanently_deleted';
      v_description := 'Permanently deleted driver ' || old.driver_code;
    end if;

  elsif tg_table_name = 'warehouses' then
    if tg_op = 'INSERT' then
      v_action := 'warehouse_added';
      v_description := 'Added warehouse ' || new.name;
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'warehouse_deleted';
        v_description := 'Moved warehouse ' || new.name || ' to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'warehouse_restored';
        v_description := 'Restored warehouse ' || new.name || ' from Recycle Bin';
      else
        v_action := 'warehouse_updated';
        v_description := 'Updated warehouse ' || new.name;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'warehouse_permanently_deleted';
      v_description := 'Permanently deleted warehouse ' || old.name;
    end if;

  elsif tg_table_name = 'shipments' then
    if tg_op = 'INSERT' then
      v_action := 'shipment_created';
      v_description := 'Created shipment ' || new.shipment_code;
    elsif tg_op = 'UPDATE' then
      if old.status is distinct from new.status and new.status = 'delivered' then
        v_action := 'shipment_delivered';
        v_description := 'Shipment ' || new.shipment_code || ' marked delivered';
      elsif old.status is distinct from new.status then
        v_action := 'shipment_status_changed';
        v_description := 'Shipment ' || new.shipment_code || ' status changed to ' || new.status::text;
      else
        v_action := 'shipment_updated';
        v_description := 'Updated shipment ' || new.shipment_code;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'shipment_permanently_deleted';
      v_description := 'Permanently deleted shipment ' || old.shipment_code;
    end if;

  elsif tg_table_name = 'assignments' then
    if tg_op = 'INSERT' then
      v_action := 'assignment_created';
      v_description := 'Created assignment ' || new.assignment_code || ' — ' || new.title;
    elsif tg_op = 'UPDATE' then
      if old.status is distinct from new.status and new.status = 'completed' then
        v_action := 'assignment_completed';
        v_description := 'Completed assignment ' || new.assignment_code;
      elsif old.status is distinct from new.status then
        v_action := 'assignment_status_changed';
        v_description := 'Assignment ' || new.assignment_code || ' status changed to ' || new.status::text;
      else
        v_action := 'assignment_updated';
        v_description := 'Updated assignment ' || new.assignment_code;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'assignment_permanently_deleted';
      v_description := 'Permanently deleted assignment ' || old.assignment_code;
    end if;

  elsif tg_table_name = 'documents' then
    if tg_op = 'INSERT' then
      v_action := 'document_uploaded';
      v_description := 'Uploaded document ' || new.name;
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'document_deleted';
        v_description := 'Moved document ' || new.name || ' to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'document_restored';
        v_description := 'Restored document ' || new.name || ' from Recycle Bin';
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'document_permanently_deleted';
      v_description := 'Permanently deleted document ' || old.name;
    end if;

  elsif tg_table_name = 'branches' then
    if tg_op = 'INSERT' then
      v_action := 'branch_added';
      v_description := 'Added branch ' || new.name;
    elsif tg_op = 'UPDATE' then
      v_action := 'branch_updated';
      v_description := 'Updated branch ' || new.name;
    elsif tg_op = 'DELETE' then
      v_action := 'branch_deleted';
      v_description := 'Deleted branch ' || old.name;
    end if;

  elsif tg_table_name = 'profiles' then
    if tg_op = 'INSERT' then
      v_action := 'staff_account_created';
      v_description := 'Created staff account for ' || new.full_name || ' (' || new.role::text || ')';
    elsif tg_op = 'UPDATE' then
      if old.role is distinct from new.role then
        v_action := 'staff_role_changed';
        v_description := 'Role for ' || new.full_name || ' changed from ' || old.role::text || ' to ' || new.role::text;
      elsif old.status is distinct from new.status then
        v_action := 'staff_status_changed';
        v_description := 'Status for ' || new.full_name || ' changed to ' || new.status::text;
      else
        v_action := 'staff_profile_updated';
        v_description := 'Updated staff profile for ' || new.full_name;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'staff_account_deleted';
      v_description := 'Deleted staff account for ' || old.full_name;
    end if;

  elsif tg_table_name = 'partners' then
    if tg_op = 'INSERT' then
      v_action := 'partner_added';
      v_description := 'Added partner ' || new.name || ' (' || new.partner_code || ')';
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'partner_deleted';
        v_description := 'Moved partner ' || new.name || ' to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'partner_restored';
        v_description := 'Restored partner ' || new.name || ' from Recycle Bin';
      else
        v_action := 'partner_updated';
        v_description := 'Updated partner ' || new.name;
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'partner_permanently_deleted';
      v_description := 'Permanently deleted partner ' || old.name;
    end if;

  elsif tg_table_name = 'partner_jobs' then
    if tg_op = 'INSERT' then
      v_action := 'partner_job_created';
      select name into v_name from public.partners where id = new.partner_id;
      v_description := 'Assigned an order to partner ' || coalesce(v_name, '') || ' for KES ' || to_char(new.payout_amount, 'FM999,999,990.00');
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'partner_job_deleted';
        v_description := 'Moved a partner job to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'partner_job_restored';
        v_description := 'Restored a partner job from Recycle Bin';
      elsif old.status is distinct from new.status and new.status = 'approved' then
        v_action := 'partner_job_approved';
        v_description := 'Approved a partner payout of KES ' || to_char(new.payout_amount, 'FM999,999,990.00');
      elsif old.status is distinct from new.status and new.status = 'paid' then
        v_action := 'partner_job_paid';
        v_description := 'Paid a partner payout of KES ' || to_char(new.payout_amount, 'FM999,999,990.00');
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'partner_job_permanently_deleted';
      v_description := 'Permanently deleted a partner job';
    end if;
  end if;

  if v_action is not null then
    insert into public.audit_logs (actor_id, action, target_table, target_id, description)
    values (auth.uid(), v_action, tg_table_name, v_target_id, v_description);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists partners_audit_log on public.partners;
create trigger partners_audit_log after insert or update or delete on public.partners
  for each row execute function public.log_audit_event();

drop trigger if exists partner_jobs_audit_log on public.partner_jobs;
create trigger partner_jobs_audit_log after insert or update or delete on public.partner_jobs
  for each row execute function public.log_audit_event();

-- -----------------------------------------------------------------------------
-- 4. Recycle Bin support (migration 010's reset/list machinery reads this
--    array from itself as it needs — nothing else to add here beyond the
--    table existing with a deleted_at column, which it already has above).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 4. Include partners/partner_jobs in "Reset all data" (migration 010),
--    same reasoning as everything else it already covers.
-- -----------------------------------------------------------------------------
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
    'other_expenses', 'invoices', 'payments', 'warehouses', 'documents',
    'partners', 'partner_jobs'
  ]
  loop
    execute format('update public.%I set deleted_at = now() where deleted_at is null;', t);
  end loop;

  insert into public.audit_logs (actor_id, action, target_table)
  values (auth.uid(), 'reset_all_operational_data', 'all');
end;
$$;

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
