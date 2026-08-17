import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore, nextTableRef, extractRefNumber, renumberFleetCodes } from "./local-store";
import { getTrip } from "./trips";
import type { FuelRecord, NewFuelRecordInput } from "./types";

const store = localStore<FuelRecord>("fuel_records", []);
const SELECT = "*, vehicles(vehicle_code, plate_number)";

export async function listFuelRecords(): Promise<FuelRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("fuel_records")
      .select(SELECT)
      .is("deleted_at", null)
      .order("filled_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

export async function createFuelRecord(input: NewFuelRecordInput): Promise<FuelRecord> {
  if (isSupabaseConfigured && supabase) {
    // fuel_code is assigned by the fuel_records_set_code trigger in the
    // database (migration 015): it reuses the linked trip's number (so a
    // fill-up against TRIP-4 becomes FUEL-4), or draws a fresh sequential
    // number when there's no linked trip. Intentionally not sent from here.
    const { data, error } = await supabase
      .from("fuel_records")
      .insert({
        vehicle_id: input.vehicleId,
        trip_id: input.tripId ?? null,
        branch_id: input.branch ?? null,
        liters: input.liters,
        cost: input.cost,
        odometer_km: input.odometerKm ?? null,
        filled_at: input.filledAt ?? new Date().toISOString(),
        notes: input.notes ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  // Reuse the linked trip's reference number (and, through it, the
  // transport order's number) so a fill-up on TRIP-4 shows as FUEL-4.
  // Falls back to a fresh number if there's no linked trip. Unlike orders
  // and trips, several fuel records can share one number — a trip is
  // commonly refuelled more than once.
  let ref: number | undefined;
  if (input.tripId) {
    const trip = await getTrip(input.tripId);
    ref = extractRefNumber(trip?.tripCode);
  }
  if (ref === undefined) {
    ref = nextTableRef(store.list().map((f) => f.fuelCode));
  }

  const record: FuelRecord = {
    id: `local-${crypto.randomUUID()}`,
    fuelCode: `FUEL-${ref}`,
    vehicleId: input.vehicleId,
    tripId: input.tripId,
    branch: input.branch,
    liters: input.liters,
    cost: input.cost,
    odometerKm: input.odometerKm,
    filledAt: input.filledAt ?? new Date().toISOString(),
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  return store.insert(record);
}

export type EditFuelRecordInput = Partial<
  Pick<
    NewFuelRecordInput,
    "vehicleId" | "branch" | "liters" | "cost" | "odometerKm" | "filledAt" | "notes"
  >
>;

export async function editFuelRecord(id: string, input: EditFuelRecordInput): Promise<FuelRecord> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("fuel_records")
      .update({
        ...(input.vehicleId !== undefined ? { vehicle_id: input.vehicleId } : {}),
        ...(input.branch !== undefined ? { branch_id: input.branch || null } : {}),
        ...(input.liters !== undefined ? { liters: input.liters } : {}),
        ...(input.cost !== undefined ? { cost: input.cost } : {}),
        ...(input.odometerKm !== undefined ? { odometer_km: input.odometerKm ?? null } : {}),
        ...(input.filledAt !== undefined ? { filled_at: input.filledAt } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const updated = store.update(id, input as Partial<FuelRecord>);
  if (!updated) throw new Error("Fuel record not found");
  return updated;
}

/** Moves the fuel record to the Recycle Bin (soft delete) — restorable there any time. */
export async function deleteFuelRecord(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("fuel_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.remove(id);
  renumberFleetCodes();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): FuelRecord {
  return {
    id: row.id,
    fuelCode: row.fuel_code,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicles
      ? `${row.vehicles.vehicle_code} · ${row.vehicles.plate_number}`
      : undefined,
    tripId: row.trip_id ?? undefined,
    branch: row.branch_id ?? undefined,
    liters: Number(row.liters) || 0,
    cost: Number(row.cost) || 0,
    odometerKm: row.odometer_km ?? undefined,
    filledAt: row.filled_at,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}
