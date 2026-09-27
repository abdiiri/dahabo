import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore, nextTableRef } from "./local-store";
import type { Partner, NewPartnerInput, EditPartnerInput } from "./types";

// No seed data — starts empty until real partners are added.
const store = localStore<Partner>("partners", []);

/** Keeps demo-mode partner codes dense (1, 2, 3… with no gaps) after a
 * delete — mirrors the partners_renumber database trigger used once
 * Supabase is connected (migration 045). New partners are prepended by
 * store.insert(), so the stored list is newest-first — reverse it to get
 * creation order, oldest first. */
function renumberPartnerCodes(): void {
  const rows = [...store.list()].reverse();
  rows.forEach((p, i) => {
    store.update(p.id, { partnerCode: `PTR-${i + 1}` });
  });
}

export async function listPartners(): Promise<Partner[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

export async function createPartner(input: NewPartnerInput): Promise<Partner> {
  if (isSupabaseConfigured && supabase) {
    // partner_code is assigned by the partners_set_code trigger in the
    // database (migration 045) — always the next dense number after the
    // highest active partner (PTR-1, PTR-2, PTR-3…), so it's intentionally
    // not sent from here.
    const { data, error } = await supabase
      .from("partners")
      .insert({
        name: input.name,
        phone: input.phone || null,
        vehicle_plate: input.vehiclePlate,
        driver_name: input.driverName,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const existing = store.list();
  const partner: Partner = {
    id: `local-${crypto.randomUUID()}`,
    partnerCode: `PTR-${nextTableRef(existing.map((p) => p.partnerCode))}`,
    name: input.name,
    phone: input.phone,
    vehiclePlate: input.vehiclePlate,
    driverName: input.driverName,
    createdAt: new Date().toISOString(),
  };
  return store.insert(partner);
}

export async function editPartner(id: string, input: EditPartnerInput): Promise<Partner> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("partners")
      .update({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.vehiclePlate !== undefined ? { vehicle_plate: input.vehiclePlate } : {}),
        ...(input.driverName !== undefined ? { driver_name: input.driverName } : {}),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const updated = store.update(id, input as Partial<Partner>);
  if (!updated) throw new Error("Partner not found");
  return updated;
}

/** Moves the partner to the Recycle Bin (soft delete) — restorable there
 * any time. Doesn't touch any partner job already recorded against them;
 * those keep the partner's name as it was, same as deleting a driver
 * doesn't rewrite their past driver payments. Remaining partners' codes
 * renumber down to stay dense, matching Customers/Fleet/Transport Orders. */
export async function deletePartner(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("partners")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.remove(id);
  renumberPartnerCodes();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Partner {
  return {
    id: row.id,
    partnerCode: row.partner_code,
    name: row.name,
    phone: row.phone ?? undefined,
    vehiclePlate: row.vehicle_plate,
    driverName: row.driver_name,
    createdAt: row.created_at,
  };
}
