-- =============================================================================
-- Migration 009 — missing RLS policies
-- =============================================================================
-- These 9 tables had row-level security turned ON but no policies were ever
-- written for them — which means Postgres denies everyone by default,
-- including admins, for both reads and writes. Reads silently return zero
-- rows (no error), which is why this stayed invisible; writes fail outright,
-- which is what surfaced this. This adds the missing policies, following the
-- same staff/finance/admin split used everywhere else in this project. Safe
-- to run more than once.
-- =============================================================================

-- customers, vehicles, warehouses, documents, shipments: day-to-day
-- operations — any staff role (not driver) can read and write.
do $$
declare
  t text;
begin
  foreach t in array array['customers', 'vehicles', 'warehouses', 'documents', 'shipments']
  loop
    execute format('drop policy if exists "%1$s read (staff)" on public.%1$s;', t);
    execute format('create policy "%1$s read (staff)" on public.%1$s for select using (public.is_staff());', t);
    execute format('drop policy if exists "%1$s write (staff)" on public.%1$s;', t);
    execute format('create policy "%1$s write (staff)" on public.%1$s for all using (public.is_staff()) with check (public.is_staff());', t);
  end loop;
end $$;

-- invoices, payments: financial records — finance/admin manage them.
do $$
declare
  t text;
begin
  foreach t in array array['invoices', 'payments']
  loop
    execute format('drop policy if exists "%1$s read (finance)" on public.%1$s;', t);
    execute format('create policy "%1$s read (finance)" on public.%1$s for select using (public.is_finance());', t);
    execute format('drop policy if exists "%1$s write (finance)" on public.%1$s;', t);
    execute format('create policy "%1$s write (finance)" on public.%1$s for all using (public.is_finance()) with check (public.is_finance());', t);
  end loop;
end $$;

-- branches: any staff can see them (used throughout the app as reference
-- data); only admins add/rename/remove one.
drop policy if exists "branches read (staff)" on public.branches;
create policy "branches read (staff)" on public.branches
  for select using (public.is_staff());
drop policy if exists "branches write (admin)" on public.branches;
create policy "branches write (admin)" on public.branches
  for all using (public.is_admin()) with check (public.is_admin());

-- audit_logs: staff can read for compliance visibility; nothing in the app
-- writes to it directly, so no insert/update/delete policy is needed.
drop policy if exists "audit_logs read (staff)" on public.audit_logs;
create policy "audit_logs read (staff)" on public.audit_logs
  for select using (public.is_staff());
