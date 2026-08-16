-- =============================================================================
-- Migration 011 — Delete a transport order, taking its trips/payments/fuel with it
-- =============================================================================
-- Admin-only. Soft-deletes a single transport order along with everything
-- that only exists because of it:
--   • its trips
--   • the driver payments generated from those trips
--   • the fuel records logged against those trips
-- Everything lands in the Recycle Bin exactly like any other soft delete —
-- restoring the order does NOT automatically restore its trips/payments/fuel;
-- restore those separately from the Recycle Bin if needed.
-- Safe to run more than once.
-- =============================================================================

create or replace function public.delete_transport_order_cascade(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do this.';
  end if;

  update public.driver_payments
    set deleted_at = now()
    where deleted_at is null
      and trip_id in (
        select id from public.trips
        where transport_order_id = p_order_id and deleted_at is null
      );

  update public.fuel_records
    set deleted_at = now()
    where deleted_at is null
      and trip_id in (
        select id from public.trips
        where transport_order_id = p_order_id and deleted_at is null
      );

  update public.trips
    set deleted_at = now()
    where deleted_at is null
      and transport_order_id = p_order_id;

  update public.transport_orders
    set deleted_at = now()
    where deleted_at is null
      and id = p_order_id;

  insert into public.audit_logs (actor_id, action, target_table, target_id)
  values (auth.uid(), 'delete_transport_order_cascade', 'transport_orders', p_order_id::text);
end;
$$;
