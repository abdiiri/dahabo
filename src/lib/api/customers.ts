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
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
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
