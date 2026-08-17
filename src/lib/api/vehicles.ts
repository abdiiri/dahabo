import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore, nextTableRef } from "./local-store";
import { fleetData } from "@/data/mock";
import type { Vehicle, NewVehicleInput, VehicleType, VehicleStatus } from "./types";

const TYPE_MAP: Record<string, VehicleType> = {
  "Prime Mover": "prime_mover",
  "Reefer Truck": "reefer_truck",
  Flatbed: "flatbed",
  "Box Truck": "box_truck",
  Tanker: "tanker",
  Van: "van",
  Pickup: "pickup",
  Lowbed: "lowbed",
};

function seedVehicles(): Vehicle[] {
  return fleetData.map((v) => ({
    id: v.id,
    vehicleCode: v.id,
    plateNumber: v.plate,
    type: TYPE_MAP[v.type] ?? "other",
    capacity: v.capacity,
    status: v.status === "Active" ? "active" : v.status === "Idle" ? "idle" : "maintenance",
    odometerKm: Number(v.odometer.replace(/[^\d]/g, "")) || 0,
    nextServiceDate: v.nextService,
    branch: undefined,
    createdAt: "2024-01-01T00:00:00Z",
  }));
}

const store = localStore<Vehicle>("vehicles", seedVehicles());

/** Keeps demo-mode vehicle codes dense (1, 2, 3… with no gaps) after a
 * delete — mirrors the vehicles_renumber database trigger used once
 * Supabase is connected (migration 024). */
function renumberVehicleCodes(): void {
  const rows = [...store.list()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  rows.forEach((v, i) => {
    store.update(v.id, { vehicleCode: `VEH-${i + 1}` });
  });
}

export async function listVehicles(): Promise<Vehicle[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseVehicle);
  }
  return store.list();
}

export async function createVehicle(input: NewVehicleInput): Promise<Vehicle> {
  if (isSupabaseConfigured && supabase) {
    // vehicle_code is assigned by the vehicles_set_code trigger in the
    // database (migration 024) — it always hands out the next dense
    // number after the highest active vehicle (VEH-1, VEH-2, VEH-3…), so
    // it's intentionally not sent from here.
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        plate_number: input.plateNumber,
        type: input.type,
        capacity: input.capacity ?? null,
        odometer_km: input.odometerKm ?? 0,
        next_service_date: input.nextServiceDate ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapSupabaseVehicle(data);
  }

  const existing = store.list();
  const vehicle: Vehicle = {
    id: `local-${crypto.randomUUID()}`,
    vehicleCode: `VEH-${nextTableRef(existing.map((v) => v.vehicleCode))}`,
    plateNumber: input.plateNumber,
    type: input.type,
    capacity: input.capacity,
    status: "active",
    odometerKm: input.odometerKm ?? 0,
    nextServiceDate: input.nextServiceDate,
    branch: input.branch,
    createdAt: new Date().toISOString(),
  };
  return store.insert(vehicle);
}

/** Moves the vehicle to the Recycle Bin (soft delete) — restorable there
 * any time. Remaining vehicles' codes renumber down to stay dense
 * (1, 2, 3… with no gaps), matching Transport Orders / Trips / Fuel. */
export async function deleteVehicle(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("vehicles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.remove(id);
  renumberVehicleCodes();
}

export type EditVehicleInput = Partial<{
  plateNumber: string;
  type: VehicleType;
  capacity: string;
  status: VehicleStatus;
  odometerKm: number;
  nextServiceDate: string;
  branch: string;
  excludedFromProfit: boolean;
}>;

export async function editVehicle(id: string, input: EditVehicleInput): Promise<Vehicle> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("vehicles")
      .update({
        ...(input.plateNumber !== undefined ? { plate_number: input.plateNumber } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.capacity !== undefined ? { capacity: input.capacity || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.odometerKm !== undefined ? { odometer_km: input.odometerKm } : {}),
        ...(input.nextServiceDate !== undefined
          ? { next_service_date: input.nextServiceDate || null }
          : {}),
        ...(input.branch !== undefined ? { branch_id: input.branch || null } : {}),
        ...(input.excludedFromProfit !== undefined
          ? { excluded_from_profit: input.excludedFromProfit }
          : {}),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapSupabaseVehicle(data);
  }

  const updated = store.update(id, input as Partial<Vehicle>);
  if (!updated) throw new Error("Vehicle not found");
  return updated;
}

/** Excludes (or re-includes) this vehicle from this month's profit totals —
 * used by the Vehicle Profit page's delete button. This is deliberately
 * NOT the same as deleting the vehicle: Fleet, and this vehicle's trips,
 * fuel and maintenance records, are all untouched. Only what shows up in
 * Vehicle Profit and the Dashboard's net profit figure changes. */
export async function setVehicleProfitExclusion(id: string, excluded: boolean): Promise<Vehicle> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("vehicles")
      .update({ excluded_from_profit: excluded })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapSupabaseVehicle(data);
  }

  const updated = store.update(id, { excludedFromProfit: excluded });
  if (!updated) throw new Error("Vehicle not found");
  return updated;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseVehicle(row: any): Vehicle {
  return {
    id: row.id,
    vehicleCode: row.vehicle_code,
    plateNumber: row.plate_number,
    type: row.type,
    capacity: row.capacity ?? undefined,
    status: row.status,
    odometerKm: row.odometer_km ?? 0,
    nextServiceDate: row.next_service_date ?? undefined,
    branch: row.branch_id ?? undefined,
    createdAt: row.created_at,
    excludedFromProfit: row.excluded_from_profit ?? false,
  };
}
