-- =============================================================================
-- Migration 045 — Let staff move a trip to a different transport order
-- =============================================================================
-- Until now, transport_order_id on a trip could only be set when the trip
-- was first created (Start Trip). If the wrong order got picked at that
-- point, the only way to fix it was a manual database edit — nothing in
-- the app could correct it.
--
-- This adds a dedicated RPC, reassign_trip_order(), that:
--   • Moves the trip onto the new order (or unlinks it if the new order is
--     null).
--   • Lets the existing trips_sync_transport_order trigger (migration 027)
--     push the NEW order forward to in_progress/completed as usual — that
--     part needs no new code, it already reacts to any trip update.
--   • Explicitly corrects the OLD order, which nothing previously handled:
--     if it has no other trip left that justifies being in_progress or
--     completed, it drops back to pending. A cancelled order is left
--     alone either way — that's a deliberate terminal state, not something
--     this should override.
--
-- Safe to run any number of times.
-- =============================================================================

create or replace function public.reassign_trip_order(p_trip_id uuid, p_new_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_order_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only staff can do this.';
  end if;

  select transport_order_id into v_old_order_id
  from public.trips
  where id = p_trip_id;

  update public.trips
  set transport_order_id = p_new_order_id
  where id = p_trip_id;

  if v_old_order_id is not null and v_old_order_id is distinct from p_new_order_id then
    if exists (
      select 1 from public.trips
      where transport_order_id = v_old_order_id and deleted_at is null and status = 'completed'
    ) then
      update public.transport_orders
      set status = 'completed'
      where id = v_old_order_id and status <> 'cancelled';
    elsif exists (
      select 1 from public.trips
      where transport_order_id = v_old_order_id and deleted_at is null and status in ('in_progress', 'scheduled')
    ) then
      update public.transport_orders
      set status = 'in_progress'
      where id = v_old_order_id and status <> 'cancelled';
    else
      update public.transport_orders
      set status = 'pending'
      where id = v_old_order_id and status in ('in_progress', 'completed');
    end if;
  end if;

  insert into public.audit_logs (actor_id, action, target_table, target_id)
  values (auth.uid(), 'reassign_trip_order', 'trips', p_trip_id::text);
end;
$$;

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
