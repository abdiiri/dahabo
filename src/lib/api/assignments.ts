import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { Assignment, NewAssignmentInput } from "./types";

const store = localStore<Assignment>("assignments", []);

function generateAssignmentCode(existing: Assignment[]): string {
  const max = existing.reduce((m, a) => {
    const n = Number(a.assignmentCode.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 1000);
  return `ASG-${max + 1}`;
}

export async function listAssignmentsForDriver(driverId: string): Promise<Assignment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseAssignment);
  }
  return store.list().filter((a) => a.driverId === driverId);
}

export async function createAssignment(input: NewAssignmentInput): Promise<Assignment> {
  if (isSupabaseConfigured && supabase) {
    const assignmentCode = `ASG-${Date.now().toString().slice(-6)}`;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("assignments")
      .insert({
        assignment_code: assignmentCode,
        driver_id: input.driverId,
        type: input.type,
        title: input.title,
        notes: input.notes ?? null,
        origin: input.origin ?? null,
        destination: input.destination ?? null,
        scheduled_start: input.scheduledStart ?? null,
        scheduled_end: input.scheduledEnd ?? null,
        assigned_by: user?.id ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapSupabaseAssignment(data);
  }

  const existing = store.list();
  const assignment: Assignment = {
    id: `local-${crypto.randomUUID()}`,
    assignmentCode: generateAssignmentCode(existing),
    driverId: input.driverId,
    type: input.type,
    title: input.title,
    notes: input.notes,
    origin: input.origin,
    destination: input.destination,
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
    status: "scheduled",
    assignedBy: "You",
    createdAt: new Date().toISOString(),
  };
  return store.insert(assignment);
}

export async function updateAssignmentStatus(
  id: string,
  status: Assignment["status"],
): Promise<Assignment | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("assignments")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapSupabaseAssignment(data);
  }
  return store.update(id, { status });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseAssignment(row: any): Assignment {
  return {
    id: row.id,
    assignmentCode: row.assignment_code,
    driverId: row.driver_id,
    type: row.type,
    title: row.title,
    notes: row.notes ?? undefined,
    origin: row.origin ?? undefined,
    destination: row.destination ?? undefined,
    scheduledStart: row.scheduled_start ?? undefined,
    scheduledEnd: row.scheduled_end ?? undefined,
    status: row.status,
    assignedBy: row.assigned_by ?? undefined,
    createdAt: row.created_at,
  };
}
