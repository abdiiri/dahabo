import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";

export type AuditLogEntry = {
  id: string;
  actorName?: string | undefined;
  action: string;
  description?: string | undefined;
  targetTable?: string | undefined;
  targetId?: string | undefined;
  /** Human-readable label for the record the action happened to — e.g. the
   * driver's name for a driver payment, a plate number for a fuel record,
   * or a code (order/trip/invoice/…) for anything that has one. */
  targetName?: string | undefined;
  ipAddress?: string | undefined;
  createdAt: string;
};

/** Table names shown as a friendly word when there's no targetName to fall
 * back on (e.g. "Driver payment" instead of "driver_payments"). */
const TABLE_LABELS: Record<string, string> = {
  transport_orders: "Order",
  trips: "Trip",
  driver_payments: "Driver payment",
  fuel_records: "Fuel record",
  maintenance_records: "Maintenance record",
  salaries: "Salary/allowance",
  other_expenses: "Expense",
  driver_advances: "Driver advance",
  customer_transactions: "Customer ledger",
  invoices: "Invoice",
  payments: "Payment",
  customers: "Customer",
  vehicles: "Vehicle",
  drivers: "Driver",
  warehouses: "Warehouse",
  shipments: "Shipment",
  assignments: "Assignment",
  documents: "Document",
  branches: "Branch",
  profiles: "Staff account",
  role_permissions: "Permissions",
};

/** What to show in the Audit Logs "Target" column: the resolved name when we
 * have one (e.g. a driver's name for a driver payment), otherwise a friendly
 * table label, otherwise a plain dash. */
export function formatTarget(row: Pick<AuditLogEntry, "targetTable" | "targetName" | "targetId">): string {
  if (row.targetName) return row.targetName;
  if (row.targetTable) return TABLE_LABELS[row.targetTable] ?? formatAction(row.targetTable);
  return "—";
}

const store = localStore<AuditLogEntry>("audit_logs", []);
const SELECT = "*, profiles(full_name)";

export async function listAuditLogs(): Promise<AuditLogEntry[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("audit_logs").select(SELECT).order("created_at", { ascending: false }).limit(300);
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

/** A friendly fallback label for actions logged before a readable
 * `description` was recorded, or for actions with no bespoke text —
 * turns e.g. "trip_completed" into "Trip completed". */
export function formatAction(action: string): string {
  const spaced = action.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AuditLogEntry {
  return {
    id: row.id,
    actorName: row.profiles?.full_name ?? undefined,
    action: row.action,
    description: row.description ?? undefined,
    targetTable: row.target_table ?? undefined,
    targetId: row.target_id ?? undefined,
    targetName: row.target_name ?? undefined,
    ipAddress: row.ip_address ?? undefined,
    createdAt: row.created_at,
  };
}
