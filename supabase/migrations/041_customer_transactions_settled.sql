-- =============================================================================
-- Migration 041 — Settle flag for "extra" / "upfront" customer transactions
-- =============================================================================
-- Problem this fixes: "extra" and "upfront" rows had no way to mark that the
-- money against them is finalized/settled (order delivered, advance fully
-- used up) rather than still sitting as an open advance. Both types' money
-- was always counted in Total received the moment it came in — this flag
-- only changes which breakdown card ("Extra / advance balance" vs "Upfront
-- received") it shows under, moving it out of both once settled.
--
-- What this does: adds customer_transactions.settled (boolean, default
-- false). Meaningless for "debt" rows, which already have their own
-- outstanding/partial/settled status derived from amount_paid. Safe to run
-- more than once.
-- =============================================================================

alter table public.customer_transactions
  add column if not exists settled boolean not null default false;
