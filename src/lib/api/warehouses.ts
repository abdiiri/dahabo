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
    const { data, error } = await supabase.from("warehouses").select(SELECT).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
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
