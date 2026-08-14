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
