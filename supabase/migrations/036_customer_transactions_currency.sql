-- Adds currency support to the customer ledger (Finance tab). Every
-- existing row defaults to KES, matching how the app has behaved so far;
-- new entries can be given, received, and edited in any of six currencies
-- covering Dahabo's Kenya/Uganda/Tanzania/Ethiopia/Somalia corridors plus
-- USD for international deals.

alter table public.customer_transactions
  add column currency text not null default 'KES'
    check (currency in ('KES', 'USD', 'UGX', 'TZS', 'ETB', 'SOS'));
