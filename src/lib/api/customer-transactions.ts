import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import { setCustomerOutstanding } from "./customers";
import type {
  CustomerTransaction,
  CustomerTransactionMode,
  CustomerTransactionStatus,
  CustomerTransactionType,
} from "./types";

// This is the ledger behind the Customers <-> Finance link: every debt
// given to a customer and every payment/extra amount received from one
// lives here, keyed by customerId. Customer.outstanding is a cached total
// derived from this table — see recalcOutstanding() below, which is the
// only thing allowed to write it.

const store = localStore<CustomerTransaction>("customer_transactions", []);
const SELECT = "*, customers(name)";

export async function listCustomerTransactions(): Promise<CustomerTransaction[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("customer_transactions")
      .select(SELECT)
      .is("deleted_at", null)
      .order("entry_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return [...store.list()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Every ledger entry for one customer, newest first. Handy for a
 * customer-specific view without re-filtering the full list yourself. */
export async function listCustomerTransactionsFor(
  customerId: string,
): Promise<CustomerTransaction[]> {
  const all = await listCustomerTransactions();
  return all.filter((t) => t.customerId === customerId);
}

/** Outstanding = remaining balance on this customer's unpaid "debt" rows.
 * "extra" and "upfront" rows are recorded for the books but don't reduce
 * it — see the CustomerTransactionType doc comment in types.ts for why. */
export function getTransactionStatus(t: CustomerTransaction): CustomerTransactionStatus {
  if (t.type === "extra") return "extra";
  if (t.type === "upfront") return "upfront";
  if (t.amountPaid <= 0) return "outstanding";
  if (t.amountPaid < t.amount) return "partial";
  return "settled";
}

export function remainingBalance(t: CustomerTransaction): number {
  if (t.type === "extra" || t.type === "upfront") return 0;
  return Math.max(t.amount - t.amountPaid, 0);
}

async function recalcOutstanding(customerId: string): Promise<void> {
  const mine = await listCustomerTransactionsFor(customerId);
  const total = mine.reduce((sum, t) => sum + (t.type === "debt" ? remainingBalance(t) : 0), 0);
  await setCustomerOutstanding(customerId, total);
}

export type NewDebtInput = {
  customerId: string;
  amount: number;
  mode: CustomerTransactionMode;
  date: string;
  reference?: string | undefined;
  notes?: string | undefined;
};

export type NewExtraInput = NewDebtInput;

export type NewUpfrontInput = NewDebtInput;

export type RecordPaymentInput = {
  amount: number;
  mode: CustomerTransactionMode;
  date: string;
  reference?: string | undefined;
};

async function insertTransaction(
  type: CustomerTransactionType,
  input: NewDebtInput,
): Promise<CustomerTransaction> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("customer_transactions")
      .insert({
        customer_id: input.customerId,
        type,
        amount: input.amount,
        mode: input.mode,
        entry_date: input.date,
        reference: input.reference || null,
        notes: input.notes || null,
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    const row = mapRow(data);
    if (type === "debt") await recalcOutstanding(input.customerId);
    return row;
  }

  const row: CustomerTransaction = {
    id: `local-${crypto.randomUUID()}`,
    customerId: input.customerId,
    type,
    amount: input.amount,
    amountPaid: 0,
    mode: input.mode,
    reference: input.reference,
    date: input.date,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  store.insert(row);
  if (type === "debt") await recalcOutstanding(input.customerId);
  return row;
}

/** Record credit extended to a customer — increases their outstanding balance. */
export async function createDebt(input: NewDebtInput): Promise<CustomerTransaction> {
  return insertTransaction("debt", input);
}

/** Record money received beyond what was owed (an advance/over-payment).
 * Kept on the customer's record for reference; doesn't touch outstanding. */
export async function createExtra(input: NewExtraInput): Promise<CustomerTransaction> {
  return insertTransaction("extra", input);
}

/** Record money received upfront that matches the exact price of an order —
 * not extra, not a debt. Kept on the customer's record for reference;
 * doesn't touch outstanding. */
export async function createUpfront(input: NewUpfrontInput): Promise<CustomerTransaction> {
  return insertTransaction("upfront", input);
}

/** Apply a payment against an existing debt row — full or partial. Reduces
 * that customer's outstanding balance by the payment amount. */
export async function recordPayment(
  id: string,
  input: RecordPaymentInput,
): Promise<CustomerTransaction> {
  const existing = isSupabaseConfigured && supabase ? undefined : store.get(id);
  if (isSupabaseConfigured && supabase) {
    const { data: current, error: fetchError } = await supabase
      .from("customer_transactions")
      .select(SELECT)
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;
    const row = mapRow(current);
    const amountPaid = Math.min(row.amountPaid + input.amount, row.amount);
    const { data, error } = await supabase
      .from("customer_transactions")
      .update({ amount_paid: amountPaid, paid_date: input.date, mode: input.mode })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    const updated = mapRow(data);
    await recalcOutstanding(updated.customerId);
    return updated;
  }

  if (!existing) throw new Error("Ledger entry not found");
  const amountPaid = Math.min(existing.amountPaid + input.amount, existing.amount);
  const updated = store.update(id, { amountPaid, paidDate: input.date, mode: input.mode });
  if (!updated) throw new Error("Ledger entry not found");
  await recalcOutstanding(updated.customerId);
  return updated;
}

/** Moves the ledger entry to the Recycle Bin (soft delete) and re-totals
 * the customer's outstanding balance to match. */
export async function deleteCustomerTransaction(id: string): Promise<void> {
  const existing = isSupabaseConfigured && supabase ? undefined : store.get(id);
  let customerId = existing?.customerId;

  if (isSupabaseConfigured && supabase) {
    const { data: current } = await supabase
      .from("customer_transactions")
      .select("customer_id")
      .eq("id", id)
      .single();
    customerId = current?.customer_id;
    const { error } = await supabase
      .from("customer_transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  } else {
    store.remove(id);
  }

  if (customerId) await recalcOutstanding(customerId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CustomerTransaction {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customers?.name ?? undefined,
    type: row.type,
    amount: Number(row.amount) || 0,
    amountPaid: Number(row.amount_paid) || 0,
    mode: row.mode,
    reference: row.reference ?? undefined,
    date: row.entry_date,
    paidDate: row.paid_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}
