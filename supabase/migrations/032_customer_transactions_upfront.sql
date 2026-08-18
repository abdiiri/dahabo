-- =============================================================================
-- Migration 032 — Add "upfront" customer transaction type
-- =============================================================================
-- Problem this fixes: public.customer_transactions.type only allowed 'debt'
-- and 'extra'. The app now has a third ledger entry type, "upfront" — used
-- when a customer pays the exact price of an order in advance (not extra,
-- not a debt). Inserting an 'upfront' row would fail against the old check
-- constraint.
--
-- What this does: drops and recreates the type check constraint to also
-- allow 'upfront'. Existing rows (all 'debt' or 'extra') are unaffected.
-- Safe to run more than once.
-- =============================================================================

alter table public.customer_transactions
  drop constraint if exists customer_transactions_type_check;

alter table public.customer_transactions
  add constraint customer_transactions_type_check
  check (type in ('debt', 'extra', 'upfront'));
