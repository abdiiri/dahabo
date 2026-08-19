import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";

export type AuditLogEntry = {
  id: string;
  actorName?: string | undefined;
  action: string;
  description?: string | undefined;
  targetTable?: string | undefined;
  targetId?: string | undefined;
  ipAddress?: string | undefined;
  createdAt: string;
};

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
    ipAddress: row.ip_address ?? undefined,
    createdAt: row.created_at,
  };
}
