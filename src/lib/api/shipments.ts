import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { Shipment } from "./types";

// No seed data — this starts empty until real shipments are recorded.
const store = localStore<Shipment>("shipments", []);

export async function listShipments(): Promise<Shipment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("shipments")
      .select("*, customers(name), drivers(full_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Shipment {
  return {
    id: row.id,
    shipmentCode: row.shipment_code,
    customer: row.customers?.name ?? undefined,
    origin: row.origin,
    destination: row.destination,
    status: row.status,
    service: row.service ?? undefined,
    eta: row.eta ?? undefined,
    driver: row.drivers?.full_name ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}
