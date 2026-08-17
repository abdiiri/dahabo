import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore, nextTableRef, renumberFleetCodes } from "./local-store";
import type { TransportOrder, NewTransportOrderInput } from "./types";

const store = localStore<TransportOrder>("transport_orders", []);

export async function listTransportOrders(): Promise<TransportOrder[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("transport_orders")
      .select("*, customers(name)")
      .is("deleted_at", null)
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
    // order_code is assigned by the transport_orders_set_code trigger in the
    // database (migration 015) — it always starts a new sequential number
    // (TO-1, TO-2, TO-3…), so it's intentionally not sent from here.
    const { data, error } = await supabase
      .from("transport_orders")
      .insert({
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
    orderCode: `TO-${nextTableRef(existing.map((o) => o.orderCode))}`,
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

export type EditTransportOrderInput = Partial<
  Pick<
    NewTransportOrderInput,
    "customerId" | "branch" | "pickupLocation" | "destination" | "agreedAmount" | "notes"
  >
>;

export async function editTransportOrder(
  id: string,
  input: EditTransportOrderInput,
): Promise<TransportOrder> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("transport_orders")
      .update({
        ...(input.customerId !== undefined ? { customer_id: input.customerId || null } : {}),
        ...(input.branch !== undefined ? { branch_id: input.branch || null } : {}),
        ...(input.pickupLocation !== undefined ? { pickup_location: input.pickupLocation } : {}),
        ...(input.destination !== undefined ? { destination: input.destination } : {}),
        ...(input.agreedAmount !== undefined ? { agreed_amount: input.agreedAmount } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      })
      .eq("id", id)
      .select("*, customers(name)")
      .single();
    if (error) throw error;
    return mapSupabaseOrder(data);
  }

  const updated = store.update(id, input as Partial<TransportOrder>);
  if (!updated) throw new Error("Transport order not found");
  return updated;
}

/** Moves the transport order to the Recycle Bin (soft delete) — restorable
 * there any time. Doesn't touch any trip already linked to it. */
export async function deleteTransportOrder(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("transport_orders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.remove(id);
  renumberFleetCodes();
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
