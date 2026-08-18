import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { Customer } from "./types";

// No seed data — this starts empty until real customers are added.
const store = localStore<Customer>("customers", []);

export async function listCustomers(): Promise<Customer[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

export type NewCustomerInput = {
  name: string;
  contact?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  tier?: string | undefined;
};

export async function createCustomer(input: NewCustomerInput): Promise<Customer> {
  if (isSupabaseConfigured && supabase) {
    const customerCode = `CUS-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from("customers")
      .insert({
        customer_code: customerCode,
        name: input.name,
        contact_name: input.contact || null,
        email: input.email || null,
        phone: input.phone || null,
        tier: input.tier || "SME",
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const existing = store.list();
  const max = existing.reduce((m, c) => {
    const n = Number((c.customerCode ?? "").replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 4000);
  const customer: Customer = {
    id: `local-${crypto.randomUUID()}`,
    customerCode: `CUS-${max + 1}`,
    name: input.name,
    contact: input.contact,
    email: input.email,
    phone: input.phone,
    tier: input.tier || "SME",
    outstanding: 0,
    status: "active",
  };
  return store.insert(customer);
}

export type EditCustomerInput = Partial<
  Pick<NewCustomerInput, "name" | "contact" | "email" | "phone" | "tier">
>;

export async function editCustomer(id: string, input: EditCustomerInput): Promise<Customer> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.contact !== undefined ? { contact_name: input.contact || null } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.tier !== undefined ? { tier: input.tier || "SME" } : {}),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const updated = store.update(id, input as Partial<Customer>);
  if (!updated) throw new Error("Customer not found");
  return updated;
}

/** Internal — called by lib/api/customer-transactions.ts to keep the
 * customer's cached `outstanding` figure in sync whenever their debt
 * ledger changes. Not for use elsewhere; the customers UI never sets this
 * directly. */
export async function setCustomerOutstanding(id: string, outstanding: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("customers")
      .update({ outstanding_balance: outstanding })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.update(id, { outstanding });
}

/** Moves the customer to the Recycle Bin (soft delete) — restorable there any time. */
export async function deleteCustomer(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.remove(id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Customer {
  return {
    id: row.id,
    customerCode: row.customer_code,
    name: row.name,
    contact: row.contact_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    tier: row.tier ?? "SME",
    outstanding: Number(row.outstanding_balance ?? 0),
    status: row.status ?? "active",
  };
}
