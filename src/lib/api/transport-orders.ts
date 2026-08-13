import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { TransportOrder, NewTransportOrderInput } from "./types";

const store = localStore<TransportOrder>("transport_orders", []);

function generateOrderCode(existing: TransportOrder[]): string {
  const max = existing.reduce((m, o) => {
    const n = Number(o.orderCode.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 1000);
  return `TO-${max + 1}`;
}

export async function listTransportOrders(): Promise<TransportOrder[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("transport_orders")
      .select("*, customers(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseOrder);
  }
  return store.list();
}

export async function getTransportOrder(id: string): Promise<TransportOrder | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("transport_orders")
      .select("*, customers(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapSupabaseOrder(data) : undefined;
  }
  return store.get(id);
}

export async function createTransportOrder(input: NewTransportOrderInput): Promise<TransportOrder> {
  if (isSupabaseConfigured && supabase) {
    const orderCode = `TO-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from("transport_orders")
      .insert({
        order_code: orderCode,
        customer_id: input.customerId ?? null,
        branch_id: input.branch ?? null,
        pickup_location: input.pickupLocation,
        destination: input.destination,
        agreed_amount: input.agreedAmount,
        notes: input.notes ?? null,
      })
      .select("*, customers(name)")
      .single();
    if (error) throw error;
    return mapSupabaseOrder(data);
  }

  const existing = store.list();
  const order: TransportOrder = {
    id: `local-${crypto.randomUUID()}`,
    orderCode: generateOrderCode(existing),
    customerId: input.customerId,
    branch: input.branch,
    pickupLocation: input.pickupLocation,
    destination: input.destination,
    agreedAmount: input.agreedAmount,
    status: "pending",
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  return store.insert(order);
}

export async function updateTransportOrderStatus(
  id: string,
  status: TransportOrder["status"],
): Promise<TransportOrder | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("transport_orders")
      .update({ status })
      .eq("id", id)
      .select("*, customers(name)")
      .single();
    if (error) throw error;
    return mapSupabaseOrder(data);
  }
  return store.update(id, { status });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseOrder(row: any): TransportOrder {
  return {
    id: row.id,
    orderCode: row.order_code,
    customerId: row.customer_id ?? undefined,
    customerName: row.customers?.name ?? undefined,
    branch: row.branch_id ?? undefined,
    pickupLocation: row.pickup_location,
    destination: row.destination,
    agreedAmount: Number(row.agreed_amount) || 0,
    status: row.status,
    notes: row.notes ?? undefined,
    requestedBy: row.requested_by ?? undefined,
    createdAt: row.created_at,
  };
}
