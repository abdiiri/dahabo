import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
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

function generateVehicleCode(existing: Vehicle[]): string {
  const max = existing.reduce((m, v) => {
    const n = Number(v.vehicleCode.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 2200);
  return `VEH-${max + 1}`;
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
    const vehicleCode = `VEH-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        vehicle_code: vehicleCode,
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
    vehicleCode: generateVehicleCode(existing),
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

export type EditVehicleInput = Partial<{
  plateNumber: string;
  type: VehicleType;
  capacity: string;
  status: VehicleStatus;
  odometerKm: number;
  nextServiceDate: string;
  branch: string;
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

/** Moves the vehicle to the Recycle Bin (soft delete) — restorable there any time. */
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
  };
}
