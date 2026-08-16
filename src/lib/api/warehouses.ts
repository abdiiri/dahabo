import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";

export type Warehouse = {
  id: string;
  warehouseCode: string;
  name: string;
  city?: string | undefined;
  capacityPct?: number | undefined;
  sizeSqm?: number | undefined;
  dockCount?: number | undefined;
  managerName?: string | undefined;
};

const store = localStore<Warehouse>("warehouses", []);
const SELECT = "*, profiles(full_name)";

export async function listWarehouses(): Promise<Warehouse[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("warehouses").select(SELECT).is("deleted_at", null).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

/** Moves the warehouse to the Recycle Bin (soft delete) — restorable there any time. */
export async function deleteWarehouse(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("warehouses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.remove(id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Warehouse {
  return {
    id: row.id,
    warehouseCode: row.warehouse_code,
    name: row.name,
    city: row.city ?? undefined,
    capacityPct: row.capacity_pct ?? undefined,
    sizeSqm: row.size_sqm ?? undefined,
    dockCount: row.dock_count ?? undefined,
    managerName: row.profiles?.full_name ?? undefined,
  };
}
