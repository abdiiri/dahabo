import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import { getTransportOrder, updateTransportOrderStatus } from "./transport-orders";
import { listPartners } from "./partners";
import type { PartnerJob, NewPartnerJobInput, DriverPaymentStatus } from "./types";

const store = localStore<PartnerJob>("partner_jobs", []);

const SELECT = "*, partners(name), transport_orders(order_code, agreed_amount, customers(name))";

export async function listPartnerJobs(): Promise<PartnerJob[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("partner_jobs")
      .select(SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

/** Hands a transport order to a partner instead of running it through
 * Dahabo's own fleet — no Trip, no Driver Payment, no Fuel record, and it
 * never touches Vehicle Profit, since none of that applies to a vehicle
 * and driver Dahabo doesn't own. Moves the linked order to "in_progress",
 * the same transition starting a Trip causes. */
export async function createPartnerJob(input: NewPartnerJobInput): Promise<PartnerJob> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("partner_jobs")
      .insert({
        partner_id: input.partnerId,
        transport_order_id: input.transportOrderId,
        payout_amount: input.payoutAmount,
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    const created = mapRow(data);
    await updateTransportOrderStatus(input.transportOrderId, "in_progress").catch(() => undefined);
    return created;
  }

  const [partners, order] = await Promise.all([
    listPartners(),
    getTransportOrder(input.transportOrderId),
  ]);
  const partner = partners.find((p) => p.id === input.partnerId);
  const job: PartnerJob = {
    id: `local-${crypto.randomUUID()}`,
    partnerId: input.partnerId,
    partnerName: partner?.name,
    transportOrderId: input.transportOrderId,
    orderCode: order?.orderCode,
    customerName: order?.customerName,
    agreedAmount: order?.agreedAmount,
    payoutAmount: input.payoutAmount,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const created = store.insert(job);
  await updateTransportOrderStatus(input.transportOrderId, "in_progress").catch(() => undefined);
  return created;
}

export async function updatePartnerJobStatus(
  id: string,
  status: DriverPaymentStatus,
): Promise<PartnerJob | undefined> {
  if (isSupabaseConfigured && supabase) {
    const patch: Record<string, unknown> = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("partner_jobs")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapRow(data);
  }
  return store.update(id, {
    status,
    paidAt: status === "paid" ? new Date().toISOString() : undefined,
  });
}

/** Soft-deletes a partner job (moves it to the Recycle Bin). The order and
 * the partner themselves are untouched — same as deleting a driver payment
 * doesn't affect the trip it came from. */
export async function deletePartnerJob(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("partner_jobs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.remove(id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PartnerJob {
  return {
    id: row.id,
    partnerId: row.partner_id,
    partnerName: row.partners?.name ?? undefined,
    transportOrderId: row.transport_order_id,
    orderCode: row.transport_orders?.order_code ?? undefined,
    customerName: row.transport_orders?.customers?.name ?? undefined,
    agreedAmount: row.transport_orders?.agreed_amount
      ? Number(row.transport_orders.agreed_amount)
      : undefined,
    payoutAmount: Number(row.payout_amount) || 0,
    status: row.status,
    paidAt: row.paid_at ?? undefined,
    createdAt: row.created_at,
  };
}
