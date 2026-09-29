-- =============================================================================
-- Migration 046 — Fix "duplicate key value violates ... partners_partner_code_key"
-- =============================================================================
-- Migration 045 declared partners.partner_code as `unique not null` on the
-- column itself, on top of ALSO creating a separate partial index
-- (partners_partner_code_active_key) that only enforces uniqueness among
-- active (not deleted) partners — the same "active-only" pattern every
-- other coded table (orders, trips, customers…) uses so a code can be
-- reused once the row holding it is deleted.
--
-- Having both meant the column-level constraint (which knows nothing about
-- deleted_at) was still blocking that reuse: delete the very first
-- partner, then add a new one, and the new partner gets recomputed as
-- "PTR-1" again (correctly, since no ACTIVE partner holds that code) — but
-- the leftover deleted row still physically holds partner_code = 'PTR-1',
-- so the plain unique constraint rejects it.
--
-- Fix: drop that redundant, overly-strict constraint. The partial index
-- already does the right job on its own.
--
-- Safe to run any number of times.
-- =============================================================================

alter table public.partners drop constraint if exists partners_partner_code_key;

-- Belt and braces: reassign clean, dense codes right now, in case any
-- deleted partner is currently sitting on a code an active one should have.
select public.renumber_partner_codes();
