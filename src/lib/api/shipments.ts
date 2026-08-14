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
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

export type NewShipmentInput = {
  customerId?: string | undefined;
  origin: string;
  destination: string;
  service?: string | undefined;
  weightKg?: number | undefined;
  eta?: string | undefined;
};

export async function createShipment(input: NewShipmentInput): Promise<Shipment> {
  if (isSupabaseConfigured && supabase) {
    const shipmentCode = `DGL-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from("shipments")
      .insert({
        shipment_code: shipmentCode,
        customer_id: input.customerId || null,
        origin: input.origin,
        destination: input.destination,
        service: input.service || null,
        weight_kg: input.weightKg ?? null,
        eta: input.eta || null,
      })
      .select("*, customers(name), drivers(full_name)")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const shipment: Shipment = {
    id: `local-${crypto.randomUUID()}`,
    shipmentCode: `DGL-${Date.now().toString().slice(-6)}`,
    origin: input.origin,
    destination: input.destination,
    status: "pending",
    service: input.service,
    eta: input.eta,
    updatedAt: new Date().toISOString(),
  };
  return store.insert(shipment);
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
