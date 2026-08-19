import {
  CUSTOMER_TRANSACTION_CURRENCY_SYMBOLS,
  type CustomerTransactionCurrency,
} from "@/lib/api/types";

/** Formats an amount with its currency's short prefix, e.g. "KSh 12,000". */
export function formatMoney(amount: number, currency: CustomerTransactionCurrency): string {
  return `${CUSTOMER_TRANSACTION_CURRENCY_SYMBOLS[currency]} ${amount.toLocaleString()}`;
}

/** Sums a list of (amount, currency) entries grouped by currency and formats
 * each group — e.g. "KSh 12,000 + $350" when a customer's ledger has entries
 * in more than one currency. Totaling across currencies without converting
 * them would just be wrong, so mixed totals are shown side by side instead
 * of added together. Zero totals are dropped; an empty list falls back to
 * "KSh 0" so summary cards never render blank. */
export function formatMoneyGroups(
  entries: { amount: number; currency: CustomerTransactionCurrency }[],
): string {
  const totals = new Map<CustomerTransactionCurrency, number>();
  for (const e of entries) {
    totals.set(e.currency, (totals.get(e.currency) ?? 0) + e.amount);
  }
  const parts = [...totals.entries()]
    .filter(([, total]) => total !== 0)
    .sort(([a], [b]) => (a === "KES" ? -1 : b === "KES" ? 1 : a.localeCompare(b)))
    .map(([currency, total]) => formatMoney(total, currency));
  return parts.length > 0 ? parts.join(" + ") : formatMoney(0, "KES");
}
