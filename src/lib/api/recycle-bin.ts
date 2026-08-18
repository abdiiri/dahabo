import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type RecycleBinTable =
  | "vehicles"
  | "drivers"
  | "customers"
  | "customer_transactions"
  | "shipments"
  | "transport_orders"
  | "trips"
  | "fuel_records"
  | "maintenance_records"
  | "driver_payments"
  | "salaries"
  | "other_expenses"
  | "invoices"
  | "payments"
  | "warehouses"
  | "documents";

export const RECYCLE_BIN_TABLES: { table: RecycleBinTable; label: string; labelField: string }[] = [
  { table: "vehicles", label: "Vehicles", labelField: "plate_number" },
  { table: "drivers", label: "Drivers", labelField: "full_name" },
  { table: "customers", label: "Customers", labelField: "name" },
  { table: "customer_transactions", label: "Customer ledger", labelField: "id" },
  { table: "shipments", label: "Shipments", labelField: "shipment_code" },
  { table: "transport_orders", label: "Transport orders", labelField: "order_code" },
  { table: "trips", label: "Trips", labelField: "trip_code" },
  { table: "fuel_records", label: "Fuel records", labelField: "fuel_code" },
  { table: "maintenance_records", label: "Maintenance records", labelField: "description" },
  { table: "driver_payments", label: "Driver payments", labelField: "id" },
  { table: "salaries", label: "Salaries & payments", labelField: "id" },
  { table: "other_expenses", label: "Other expenses", labelField: "description" },
  { table: "invoices", label: "Invoices", labelField: "invoice_code" },
  { table: "payments", label: "Payments", labelField: "id" },
  { table: "warehouses", label: "Warehouses", labelField: "name" },
  { table: "documents", label: "Documents", labelField: "name" },
];

export type RecycleBinItem = {
  id: string;
  table: RecycleBinTable;
  tableLabel: string;
  label: string;
  deletedAt: string;
};

/** Lists every soft-deleted row across all tables. Local/demo mode has
 * nothing to show here — soft-delete is a Supabase-only feature. */
export async function listRecycleBin(): Promise<RecycleBinItem[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const results = await Promise.all(
    RECYCLE_BIN_TABLES.map(async ({ table, label, labelField }) => {
      const { data, error } = await supabase!
        .from(table)
        .select("id, deleted_at" + (labelField !== "id" ? `, ${labelField}` : ""))
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error || !data) return [];
      return data.map((row: Record<string, unknown>): RecycleBinItem => ({
        id: row.id as string,
        table,
        tableLabel: label,
        label: labelField !== "id" ? String(row[labelField] ?? row.id) : String(row.id),
        deletedAt: row.deleted_at as string,
      }));
    }),
  );

  return results.flat().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function restoreRecord(table: RecycleBinTable, id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from(table).update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function permanentlyDelete(table: RecycleBinTable, id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

/** Admin-only. Soft-deletes every row in every operational table — a clean
 * slate for handing the system to a client. Fully reversible from the
 * Recycle Bin until someone permanently deletes an item, or empties it. */
export async function resetAllOperationalData(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error("No database connected.");
  const { error } = await supabase.rpc("reset_all_operational_data");
  if (error) throw error;
}
