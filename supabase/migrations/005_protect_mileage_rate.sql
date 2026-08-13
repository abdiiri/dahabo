-- =============================================================================
-- Migration 005 — protect drivers.mileage_rate_per_km from self-editing
-- =============================================================================
-- A driver can update their own row (see policy "drivers update (staff or
-- self)"). The existing protect_driver_fields() trigger already reverts
-- sensitive fields for non-staff editors, but it predates the
-- mileage_rate_per_km column added in migration 004, so that field was left
-- unguarded — a driver could otherwise set their own pay rate. This closes
-- that gap. Safe to run any number of times.
-- =============================================================================

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
    new.mileage_rate_per_km := old.mileage_rate_per_km;
  end if;
  return new;
end;
$$;
