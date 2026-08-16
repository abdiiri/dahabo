-- =============================================================================
-- Migration 012 — Delete a trip, taking its driver payment and fuel records with it
-- =============================================================================
-- Any staff member (same access level as editing a trip) can soft-delete a
-- trip. Its driver payment and any fuel records logged against it go with
-- it. Everything lands in the Recycle Bin — restore each piece separately
-- there if needed. Safe to run more than once.
-- =============================================================================

create or replace function public.delete_trip_cascade(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can do this.';
  end if;

  update public.driver_payments
    set deleted_at = now()
    where deleted_at is null and trip_id = p_trip_id;

  update public.fuel_records
    set deleted_at = now()
    where deleted_at is null and trip_id = p_trip_id;

  update public.trips
    set deleted_at = now()
    where deleted_at is null and id = p_trip_id;

  insert into public.audit_logs (actor_id, action, target_table, target_id)
  values (auth.uid(), 'delete_trip_cascade', 'trips', p_trip_id::text);
end;
$$;
