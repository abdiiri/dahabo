import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { DriverPayment, DriverPaymentStatus } from "./types";

// Local/demo-mode only: keyed by trip id so completeTrip() in trips.ts can
// upsert one row per trip, mirroring what the Supabase trigger does for real.
const store = localStore<DriverPayment>("driver_payments", []);

const SELECT = "*, trips(trip_code), drivers(full_name)";

export async function listDriverPayments(): Promise<DriverPayment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("driver_payments").select(SELECT).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabasePayment);
  }
  return store.list();
}

export async function updateDriverPaymentStatus(id: string, status: DriverPaymentStatus): Promise<DriverPayment | undefined> {
  if (isSupabaseConfigured && supabase) {
    const patch: Record<string, unknown> = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { data, error } = await supabase.from("driver_payments").update(patch).eq("id", id).select(SELECT).single();
    if (error) throw error;
    return mapSupabasePayment(data);
  }
  return store.update(id, { status, paidAt: status === "paid" ? new Date().toISOString() : undefined });
}

/**
 * Local/demo-mode only — called from trips.completeTrip() to mirror the
 * Supabase trigger (trips_sync_driver_payment) that runs automatically when
 * a real database is connected.
 */
export function syncLocalDriverPayment(params: {
  tripId: string;
  tripCode: string;
  driverId: string;
  driverName?: string | undefined;
  distanceKm: number;
  ratePerKm: number;
}) {
  const existing = store.list().find((p) => p.tripId === params.tripId);
  const amount = params.distanceKm * params.ratePerKm;
  if (existing) {
    if (existing.status !== "pending") return; // don't clobber an approved/paid figure
    store.update(existing.id, { distanceKm: params.distanceKm, ratePerKm: params.ratePerKm, amount });
    return;
  }
  store.insert({
    id: `local-${crypto.randomUUID()}`,
    tripId: params.tripId,
    tripCode: params.tripCode,
    driverId: params.driverId,
    driverName: params.driverName,
    distanceKm: params.distanceKm,
    ratePerKm: params.ratePerKm,
    amount,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabasePayment(row: any): DriverPayment {
  return {
    id: row.id,
    tripId: row.trip_id,
    tripCode: row.trips?.trip_code ?? undefined,
    driverId: row.driver_id,
    driverName: row.drivers?.full_name ?? undefined,
    distanceKm: row.distance_km,
    ratePerKm: Number(row.rate_per_km) || 0,
    amount: Number(row.amount) || 0,
    status: row.status,
    paidAt: row.paid_at ?? undefined,
    createdAt: row.created_at,
  };
}
