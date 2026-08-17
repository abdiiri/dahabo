-- =============================================================================
-- Migration 028 — Block completing an order while its trip is still moving
-- =============================================================================
-- The Transport Orders page has its own "Mark complete" action, completely
-- independent of the trip. Nothing stopped someone from clicking it while
-- the linked trip was still 'in_progress' or 'scheduled' — the order would
-- flip to Completed immediately, but the trip (and the revenue/mileage pay
-- it carries into Vehicle Profit) would stay exactly where it was. The two
-- records would silently disagree from then on: order says done, trip says
-- not done, and nothing in the app would surface that gap.
--
-- This adds a trigger on transport_orders that raises a clear error if
-- something tries to set status = 'completed' while a non-deleted, linked
-- trip is still 'in_progress' or 'scheduled'. A cancelled trip doesn't
-- block it — a cancelled trip shouldn't stop staff from completing the
-- order some other way. The trips_sync_transport_order trigger (migration
-- 027) is unaffected: it only ever sets an order to 'completed' once its
-- own trip already IS completed, so it never trips this guard.
--
-- Safe to run any number of times.
-- =============================================================================

create or replace function public.guard_transport_order_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_code text;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    select trip_code into v_trip_code
    from public.trips
    where transport_order_id = new.id
      and deleted_at is null
      and status in ('in_progress', 'scheduled')
    limit 1;

    if v_trip_code is not null then
      raise exception
        'Cannot mark % complete — its trip % is still on the road. Complete the trip first.',
        new.order_code, v_trip_code
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists transport_orders_guard_complete on public.transport_orders;
create trigger transport_orders_guard_complete before update on public.transport_orders
  for each row execute function public.guard_transport_order_complete();

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
