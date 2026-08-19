-- =============================================================================
-- Migration 035 — Readable "Target" for the Audit Logs tab
-- =============================================================================
-- Until now, the Audit Logs "Target" column showed the raw table name plus
-- the first 8 characters of a UUID (e.g. "driver_payments · a3f8b21c"), which
-- means nothing to a human. This migration adds audit_logs.target_name — a
-- short, human-readable label for whatever record the action happened to
-- (a driver's name for a driver payment, a plate number for a fuel record, a
-- code for an order/trip/invoice/etc.) — and repoints public.log_audit_event()
-- to fill it in for every table it already understands.
--
-- Safe to run more than once.
-- =============================================================================

alter table public.audit_logs add column if not exists target_name text;

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
  v_target_name text;
  v_name text;
begin
  v_target_id := coalesce(new.id, old.id)::text;

  if tg_table_name = 'transport_orders' then
    v_target_name := coalesce(new.order_code, old.order_code);
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
    v_target_name := coalesce(new.trip_code, old.trip_code);
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
    -- Target: the driver being paid, not the driver_payments row id.
    select full_name into v_name from public.profiles where id = coalesce(new.driver_id, old.driver_id);
    v_target_name := v_name;
    if tg_op = 'UPDATE' and old.status is distinct from new.status then
      if new.status = 'approved' then
        v_action := 'driver_payment_approved';
        v_description := 'Approved a driver payment of KES ' || to_char(new.amount, 'FM999,999,990.00') || coalesce(' for ' || v_name, '');
      elsif new.status = 'paid' then
        v_action := 'driver_payment_paid';
        v_description := 'Paid a driver payment of KES ' || to_char(new.amount, 'FM999,999,990.00') || coalesce(' to ' || v_name, '');
      end if;
    end if;

  elsif tg_table_name = 'fuel_records' then
    -- Target: the vehicle the fuel was logged against.
    select plate_number into v_name from public.vehicles where id = coalesce(new.vehicle_id, old.vehicle_id);
    v_target_name := v_name;
    if tg_op = 'INSERT' then
      v_action := 'fuel_logged';
      v_description := 'Logged fuel purchase — ' || new.liters || 'L for KES ' || to_char(new.cost, 'FM999,999,990.00') || coalesce(' (' || v_name || ')', '');
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
    -- Target: the vehicle serviced.
    select plate_number into v_name from public.vehicles where id = coalesce(new.vehicle_id, old.vehicle_id);
    v_target_name := v_name;
    if tg_op = 'INSERT' then
      v_action := 'maintenance_recorded';
      v_description := 'Recorded maintenance — ' || new.description || ' (KES ' || to_char(new.cost, 'FM999,999,990.00') || ')' || coalesce(' for ' || v_name, '');
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
    -- Target: the staff member the salary/allowance belongs to.
    select full_name into v_name from public.profiles where id = coalesce(new.profile_id, old.profile_id);
    v_target_name := v_name;
    if tg_op = 'INSERT' then
      v_action := 'salary_entry_created';
      v_description := 'Recorded a ' || new.type::text || ' of KES ' || to_char(new.amount, 'FM999,999,990.00') || coalesce(' for ' || v_name, '');
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_action := 'salary_entry_deleted';
        v_description := 'Moved a salary/allowance entry to Recycle Bin';
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_action := 'salary_entry_restored';
        v_description := 'Restored a salary/allowance entry from Recycle Bin';
      elsif old.status is distinct from new.status and new.status = 'paid' then
        v_action := 'salary_paid';
        v_description := 'Paid a ' || new.type::text || ' of KES ' || to_char(new.amount, 'FM999,999,990.00') || coalesce(' to ' || v_name, '');
      end if;
    elsif tg_op = 'DELETE' then
      v_action := 'salary_entry_permanently_deleted';
      v_description := 'Permanently deleted a salary/allowance entry';
    end if;

  elsif tg_table_name = 'other_expenses' then
    -- Target: the vehicle the expense was recorded against, if any.
    if coalesce(new.vehicle_id, old.vehicle_id) is not null then
      select plate_number into v_name from public.vehicles where id = coalesce(new.vehicle_id, old.vehicle_id);
      v_target_name := v_name;
    end if;
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
    -- Target: the driver who received the advance.
    select full_name into v_name from public.profiles where id = coalesce(new.driver_id, old.driver_id);
    v_target_name := v_name;
    if tg_op = 'INSERT' then
      v_action := 'advance_given';
      v_description := 'Gave a cash advance of KES ' || to_char(new.amount, 'FM999,999,990.00') || coalesce(' to ' || v_name, '');
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'reported' then
      v_action := 'advance_reported';
      v_description := 'Advance usage reported' || coalesce(' — ' || v_name, '') || case when new.usage_amount is not null then ' (KES ' || to_char(new.usage_amount, 'FM999,999,990.00') || ')' else '' end;
    end if;

  elsif tg_table_name = 'customer_transactions' then
    -- Target: the customer the ledger entry belongs to.
    select name into v_name from public.customers where id = coalesce(new.customer_id, old.customer_id);
    v_target_name := v_name;
    if tg_op = 'INSERT' then
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
        v_action := 'payment_received';
        v_description := 'Received payment of KES ' || to_char(new.amount_paid - old.amount_paid, 'FM999,999,990.00') || coalesce(' from ' || v_name, '') || ' against a debt';
      end if;
    end if;

  elsif tg_table_name = 'invoices' then
    v_target_name := coalesce(new.invoice_code, old.invoice_code);
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
    v_target_name := coalesce(new.payment_code, old.payment_code);
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
    v_target_name := coalesce(new.name, old.name);
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
    v_target_name := coalesce(new.plate_number, old.plate_number);
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
    -- Target: the driver's own name.
    select full_name into v_name from public.profiles where id = coalesce(new.id, old.id);
    v_target_name := coalesce(v_name, new.driver_code, old.driver_code);
    if tg_op = 'INSERT' then
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
    v_target_name := coalesce(new.name, old.name);
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
    v_target_name := coalesce(new.shipment_code, old.shipment_code);
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
    v_target_name := coalesce(new.assignment_code, old.assignment_code);
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
    v_target_name := coalesce(new.name, old.name);
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
    v_target_name := coalesce(new.name, old.name);
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
    v_target_name := coalesce(new.full_name, old.full_name);
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
  end if;

  if v_action is not null then
    insert into public.audit_logs (actor_id, action, target_table, target_id, target_name, description)
    values (auth.uid(), v_action, tg_table_name, v_target_id, v_target_name, v_description);
  end if;

  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------------
-- role_permissions keeps its own small trigger (composite key, no single id) —
-- give it a readable target_name too: "role — module".
-- -----------------------------------------------------------------------------
create or replace function public.log_role_permission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, target_table, target_id, target_name, description)
  values (
    auth.uid(),
    'permissions_updated',
    'role_permissions',
    coalesce(new.role, old.role) || ':' || coalesce(new.module, old.module),
    coalesce(new.role, old.role) || ' — ' || coalesce(new.module, old.module),
    'Updated permissions for ' || coalesce(new.role, old.role) || ' on ' || coalesce(new.module, old.module)
  );
  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------------
-- Backfill target_name for existing rows where we can still resolve it, so
-- the tab doesn't show gaps for history captured before this migration.
-- -----------------------------------------------------------------------------
update public.audit_logs a
set target_name = case
  when a.target_table = 'driver_payments' then (select p.full_name from public.driver_payments dp join public.profiles p on p.id = dp.driver_id where dp.id::text = a.target_id)
  when a.target_table = 'driver_advances' then (select p.full_name from public.driver_advances da join public.profiles p on p.id = da.driver_id where da.id::text = a.target_id)
  when a.target_table = 'salaries' then (select p.full_name from public.salaries s join public.profiles p on p.id = s.profile_id where s.id::text = a.target_id)
  when a.target_table = 'fuel_records' then (select v.plate_number from public.fuel_records f join public.vehicles v on v.id = f.vehicle_id where f.id::text = a.target_id)
  when a.target_table = 'maintenance_records' then (select v.plate_number from public.maintenance_records m join public.vehicles v on v.id = m.vehicle_id where m.id::text = a.target_id)
  when a.target_table = 'other_expenses' then (select v.plate_number from public.other_expenses e join public.vehicles v on v.id = e.vehicle_id where e.id::text = a.target_id)
  when a.target_table = 'customer_transactions' then (select c.name from public.customer_transactions ct join public.customers c on c.id = ct.customer_id where ct.id::text = a.target_id)
  when a.target_table = 'transport_orders' then (select order_code from public.transport_orders where id::text = a.target_id)
  when a.target_table = 'trips' then (select trip_code from public.trips where id::text = a.target_id)
  when a.target_table = 'invoices' then (select invoice_code from public.invoices where id::text = a.target_id)
  when a.target_table = 'payments' then (select payment_code from public.payments where id::text = a.target_id)
  when a.target_table = 'customers' then (select name from public.customers where id::text = a.target_id)
  when a.target_table = 'vehicles' then (select plate_number from public.vehicles where id::text = a.target_id)
  when a.target_table = 'drivers' then (select full_name from public.profiles where id::text = a.target_id)
  when a.target_table = 'warehouses' then (select name from public.warehouses where id::text = a.target_id)
  when a.target_table = 'shipments' then (select shipment_code from public.shipments where id::text = a.target_id)
  when a.target_table = 'assignments' then (select assignment_code from public.assignments where id::text = a.target_id)
  when a.target_table = 'documents' then (select name from public.documents where id::text = a.target_id)
  when a.target_table = 'branches' then (select name from public.branches where id::text = a.target_id)
  when a.target_table = 'profiles' then (select full_name from public.profiles where id::text = a.target_id)
  else null
end
where a.target_name is null and a.target_table is not null;
