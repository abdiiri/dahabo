-- =============================================================================
-- Migration 007 — auto-complete the linked transport order when a trip
-- finishes, same pattern as the mileage-payment trigger in migration 004.
-- Safe to run more than once.
-- =============================================================================

create or replace function public.sync_transport_order_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and new.transport_order_id is not null then
    update public.transport_orders
    set status = 'completed'
    where id = new.transport_order_id and status <> 'completed';
  end if;
  return new;
end;
$$;

drop trigger if exists trips_sync_transport_order on public.trips;
create trigger trips_sync_transport_order after insert or update on public.trips
  for each row execute function public.sync_transport_order_from_trip();
