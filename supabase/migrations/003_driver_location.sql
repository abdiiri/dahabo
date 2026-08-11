-- =============================================================================
-- Migration 003 — driver location check-ins
-- =============================================================================
-- Run this once in your Supabase project's SQL editor.
-- =============================================================================

alter table public.drivers
  add column if not exists current_location text,
  add column if not exists location_updated_at timestamptz;

-- schema.sql already lets a driver update their own row ("drivers update
-- (staff or self)"). This trigger narrows that down to just the location
-- check-in fields — everything else about their own compliance record
-- (national ID, licence, etc.) can only be changed by staff.
create or replace function public.protect_driver_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    new.driver_code := old.driver_code;
    new.national_id := old.national_id;
    new.license_number := old.license_number;
    new.license_class := old.license_class;
    new.license_expiry := old.license_expiry;
    new.date_of_birth := old.date_of_birth;
    new.address := old.address;
    new.next_of_kin_name := old.next_of_kin_name;
    new.next_of_kin_phone := old.next_of_kin_phone;
    new.base_branch_id := old.base_branch_id;
    new.assigned_vehicle_id := old.assigned_vehicle_id;
    new.status := old.status;
    new.rating := old.rating;
    new.total_trips := old.total_trips;
  end if;
  return new;
end;
$$;

create trigger drivers_protect_fields before update on public.drivers
  for each row execute function public.protect_driver_fields();

-- =============================================================================
-- Done.
-- =============================================================================
