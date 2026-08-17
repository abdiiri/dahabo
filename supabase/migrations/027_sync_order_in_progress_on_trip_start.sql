-- =============================================================================
-- Migration 027 — Transport order tracks its trip's status both ways
-- =============================================================================
-- sync_transport_order_from_trip() (migration 007) only ever pushed a linked
-- transport order to 'completed' when its trip finished. It never touched
-- the order when the trip actually started, so a trip sitting 'in_progress'
-- left its order stuck on 'pending'/'assigned' the whole time it was on the
-- road — the two only ever agreed with each other at the very end.
--
-- This extends the same trigger so the order also flips to 'in_progress'
-- the moment its trip is created/starts (trips are always created with
-- status 'in_progress' — see trips.ts), and still completes automatically
-- when the trip does. A trip's status update never moves its order
-- backwards out of 'completed' or 'cancelled'.
--
-- Safe to run any number of times.
-- =============================================================================

create or replace function public.sync_transport_order_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.transport_order_id is not null then
    if new.status = 'completed' then
      update public.transport_orders
      set status = 'completed'
      where id = new.transport_order_id and status <> 'completed';
    elsif new.status = 'in_progress' then
      update public.transport_orders
      set status = 'in_progress'
      where id = new.transport_order_id and status not in ('in_progress', 'completed', 'cancelled');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_sync_transport_order on public.trips;
create trigger trips_sync_transport_order after insert or update on public.trips
  for each row execute function public.sync_transport_order_from_trip();

-- -----------------------------------------------------------------------------
-- Backfill: any order whose trip is already in progress or completed, but
-- which is still sitting on an earlier status because the old trigger never
-- caught the "trip started" half of this.
-- -----------------------------------------------------------------------------
update public.transport_orders o
set status = 'completed'
from public.trips t
where t.transport_order_id = o.id
  and t.status = 'completed'
  and t.deleted_at is null
  and o.status <> 'completed';

update public.transport_orders o
set status = 'in_progress'
from public.trips t
where t.transport_order_id = o.id
  and t.status = 'in_progress'
  and t.deleted_at is null
  and o.status not in ('in_progress', 'completed', 'cancelled');

-- =============================================================================
-- Done. Safe to run this file again at any time.
-- =============================================================================
