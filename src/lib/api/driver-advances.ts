import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { DriverAdvance, NewAdvanceInput, UsageReportInput } from "./types";

const store = localStore<DriverAdvance>("driver_advances", []);

/** Everything staff have given a specific driver — used on the driver detail page. */
export async function listAdvancesForDriver(driverId: string): Promise<DriverAdvance[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("driver_advances")
      .select("*")
      .eq("driver_id", driverId)
      .order("given_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list().filter((a) => a.driverId === driverId);
}

/** The signed-in driver's own advances — used on their dashboard. RLS
 * already restricts a driver to their own rows, but we still scope the
 * query explicitly for the local-demo fallback. */
export async function listMyAdvances(driverId: string): Promise<DriverAdvance[]> {
  return listAdvancesForDriver(driverId);
}

export async function giveAdvance(input: NewAdvanceInput): Promise<DriverAdvance> {
  if (isSupabaseConfigured && supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("driver_advances")
      .insert({
        driver_id: input.driverId,
        amount: input.amount,
        purpose: input.purpose || null,
        given_by: user?.id ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const advance: DriverAdvance = {
    id: `local-${crypto.randomUUID()}`,
    driverId: input.driverId,
    amount: input.amount,
    purpose: input.purpose,
    givenAt: new Date().toISOString(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  return store.insert(advance);
}

/** A driver files how they used a specific advance. */
export async function submitUsageReport(id: string, input: UsageReportInput): Promise<DriverAdvance> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("driver_advances")
      .update({
        usage_amount: input.usageAmount,
        usage_report: input.usageReport,
        status: "reported",
        reported_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const updated = store.update(id, {
    usageAmount: input.usageAmount,
    usageReport: input.usageReport,
    status: "reported",
    reportedAt: new Date().toISOString(),
  });
  if (!updated) throw new Error("Advance not found");
  return updated;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): DriverAdvance {
  return {
    id: row.id,
    driverId: row.driver_id,
    amount: Number(row.amount),
    purpose: row.purpose ?? undefined,
    givenBy: row.given_by ?? undefined,
    givenAt: row.given_at,
    status: row.status,
    usageAmount: row.usage_amount != null ? Number(row.usage_amount) : undefined,
    usageReport: row.usage_report ?? undefined,
    reportedAt: row.reported_at ?? undefined,
    createdAt: row.created_at,
  };
}
