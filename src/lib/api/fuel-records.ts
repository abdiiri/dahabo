import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { FuelRecord, NewFuelRecordInput } from "./types";

const store = localStore<FuelRecord>("fuel_records", []);
const SELECT = "*, vehicles(vehicle_code, plate_number)";

export async function listFuelRecords(): Promise<FuelRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("fuel_records").select(SELECT).order("filled_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

export async function createFuelRecord(input: NewFuelRecordInput): Promise<FuelRecord> {
  if (isSupabaseConfigured && supabase) {
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

  const record: FuelRecord = {
    id: `local-${crypto.randomUUID()}`,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): FuelRecord {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicles ? `${row.vehicles.vehicle_code} · ${row.vehicles.plate_number}` : undefined,
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
