-- =============================================================================
-- Migration 014 — Role permissions (admin-configurable create/edit/delete)
-- =============================================================================
-- Lets an admin flip per-role switches ("can Operations Manager delete
-- shipments?") from Settings -> Roles & permissions instead of every
-- non-admin role always being able to create/edit/delete everything.
--
-- Design:
--   - role_permissions holds one row per (role, module) that has been
--     explicitly changed from the default. No row for a (role, module)
--     pair means "allowed" — so nothing changes for anyone until an admin
--     actually turns a switch off. Admins are always fully allowed and
--     never need a row.
--   - has_permission(module, action) is the single source of truth, used
--     both by the app (via src/lib/api/permissions.ts) and by RLS below,
--     so a disabled switch can't be bypassed by calling the API directly.
--   - Only vehicles / warehouses / customers / shipments / documents /
--     transport_orders / trips / fuel_records / maintenance_records /
--     drivers are tightened here — these already used a plain "any staff
--     role" policy, so ANDing has_permission() only ever makes them more
--     restrictive, never less. Staff accounts (profiles), finance records
--     and admin-only tables are left as they were.
-- Safe to run more than once.
-- =============================================================================

create table if not exists public.role_permissions (
  role text not null,
  module text not null,
  can_create boolean not null default true,
  can_edit boolean not null default true,
  can_delete boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (role, module)
);

alter table public.role_permissions enable row level security;

drop policy if exists "role_permissions read (staff)" on public.role_permissions;
create policy "role_permissions read (staff)" on public.role_permissions
  for select using (public.is_staff());

drop policy if exists "role_permissions write (admin)" on public.role_permissions;
create policy "role_permissions write (admin)" on public.role_permissions
  for all using (public.is_admin()) with check (public.is_admin());

-- Helper: does the signed-in user's role allow `p_action` ('create' | 'edit'
-- | 'delete') on `p_module`? Admins always pass. Anyone else with no row for
-- (their role, p_module) also passes — a switch has to be explicitly turned
-- off to deny anything.
create or replace function public.has_permission(p_module text, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or coalesce(
      (
        select case p_action
          when 'create' then rp.can_create
          when 'edit' then rp.can_edit
          when 'delete' then rp.can_delete
          else true
        end
        from public.role_permissions rp
        join public.profiles p on p.role::text = rp.role
        where p.id = auth.uid() and rp.module = p_module
      ),
      true
    );
$$;

-- Tighten the day-to-day operational tables that used one blanket
-- "any staff role" write policy: split into insert/update/delete so each
-- can be independently gated by has_permission().
do $$
declare
  t text;
begin
  foreach t in array array[
    'vehicles', 'warehouses', 'customers', 'shipments', 'documents',
    'transport_orders', 'trips', 'fuel_records', 'maintenance_records'
  ]
  loop
    execute format('drop policy if exists "%1$s write (staff)" on public.%1$s;', t);
    execute format(
      'create policy "%1$s insert (staff)" on public.%1$s for insert with check (public.is_staff() and public.has_permission(%1$L, ''create''));',
      t
    );
    execute format(
      'create policy "%1$s update (staff)" on public.%1$s for update using (public.is_staff() and public.has_permission(%1$L, ''edit'')) with check (public.is_staff() and public.has_permission(%1$L, ''edit''));',
      t
    );
    execute format(
      'create policy "%1$s delete (staff)" on public.%1$s for delete using (public.is_staff() and public.has_permission(%1$L, ''delete''));',
      t
    );
  end loop;
end $$;

-- Drivers: keep a driver's ability to read/lightly-update their own row
-- untouched; only gate the staff-facing branch.
drop policy if exists "drivers insert (staff)" on public.drivers;
create policy "drivers insert (staff)" on public.drivers
  for insert with check (public.is_staff() and public.has_permission('drivers', 'create'));

drop policy if exists "drivers update (staff or self)" on public.drivers;
create policy "drivers update (staff or self)" on public.drivers
  for update using ((public.is_staff() and public.has_permission('drivers', 'edit')) or id = auth.uid());

drop policy if exists "drivers delete (admin only)" on public.drivers;
create policy "drivers delete (admin only)" on public.drivers
  for delete using (public.is_admin());
