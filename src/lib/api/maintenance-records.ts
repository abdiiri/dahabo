import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { MaintenanceRecord, NewMaintenanceRecordInput } from "./types";

const store = localStore<MaintenanceRecord>("maintenance_records", []);
const SELECT = "*, vehicles(vehicle_code, plate_number)";

export async function listMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("maintenance_records")
      .select(SELECT)
      .is("deleted_at", null)
      .order("service_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

export async function createMaintenanceRecord(
  input: NewMaintenanceRecordInput,
): Promise<MaintenanceRecord> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("maintenance_records")
      .insert({
        vehicle_id: input.vehicleId,
        branch_id: input.branch ?? null,
        description: input.description,
        vendor: input.vendor ?? null,
        cost: input.cost,
        odometer_km: input.odometerKm ?? null,
        service_date: input.serviceDate ?? new Date().toISOString().slice(0, 10),
        next_service_date: input.nextServiceDate ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const record: MaintenanceRecord = {
    id: `local-${crypto.randomUUID()}`,
    vehicleId: input.vehicleId,
    branch: input.branch,
    description: input.description,
    vendor: input.vendor,
    cost: input.cost,
    odometerKm: input.odometerKm,
    serviceDate: input.serviceDate ?? new Date().toISOString().slice(0, 10),
    nextServiceDate: input.nextServiceDate,
    createdAt: new Date().toISOString(),
  };
  return store.insert(record);
}

export type EditMaintenanceRecordInput = Partial<
  Pick<
    NewMaintenanceRecordInput,
    | "vehicleId"
    | "branch"
    | "description"
    | "vendor"
    | "cost"
    | "odometerKm"
    | "serviceDate"
    | "nextServiceDate"
  >
>;

export async function editMaintenanceRecord(
  id: string,
  input: EditMaintenanceRecordInput,
): Promise<MaintenanceRecord> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("maintenance_records")
      .update({
        ...(input.vehicleId !== undefined ? { vehicle_id: input.vehicleId } : {}),
        ...(input.branch !== undefined ? { branch_id: input.branch || null } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.vendor !== undefined ? { vendor: input.vendor || null } : {}),
        ...(input.cost !== undefined ? { cost: input.cost } : {}),
        ...(input.odometerKm !== undefined ? { odometer_km: input.odometerKm ?? null } : {}),
        ...(input.serviceDate !== undefined ? { service_date: input.serviceDate } : {}),
        ...(input.nextServiceDate !== undefined
          ? { next_service_date: input.nextServiceDate || null }
          : {}),
      })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const updated = store.update(id, input as Partial<MaintenanceRecord>);
  if (!updated) throw new Error("Maintenance record not found");
  return updated;
}

/** Moves the maintenance record to the Recycle Bin (soft delete) — restorable there any time. */
export async function deleteMaintenanceRecord(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("maintenance_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.remove(id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MaintenanceRecord {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicles
      ? `${row.vehicles.vehicle_code} · ${row.vehicles.plate_number}`
      : undefined,
    branch: row.branch_id ?? undefined,
    description: row.description,
    vendor: row.vendor ?? undefined,
    cost: Number(row.cost) || 0,
    odometerKm: row.odometer_km ?? undefined,
    serviceDate: row.service_date,
    nextServiceDate: row.next_service_date ?? undefined,
    createdAt: row.created_at,
  };
}
