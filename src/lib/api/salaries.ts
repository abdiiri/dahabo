import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import { listDrivers } from "./drivers";
import type { Salary, NewSalaryInput, DriverPaymentStatus } from "./types";

const store = localStore<Salary>("salaries", []);

export async function listSalaries(): Promise<Salary[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("salaries")
      .select("*")
      .is("deleted_at", null)
      .order("period_month", { ascending: false });
    if (error) throw error;
    // Fetched as a separate step (not a relational embed) so this keeps
    // working even if the database's cached schema hasn't caught up with
    // the driver_id column/relationship yet.
    const drivers = await listDrivers();
    const nameById = new Map(drivers.map((d) => [d.id, d.fullName]));
    return (data ?? []).map((row) => mapRow(row, nameById));
  }
  return store.list();
}

/** input.profileId here doubles as either a driver id or a staff profile id
 * — createSalary figures out which based on isDriver. Kept simple: most use
 * of this is "pay a driver something outside their mileage pay". */
export async function createSalary(input: NewSalaryInput, isDriver = true): Promise<Salary> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("salaries")
      .insert({
        driver_id: isDriver ? input.profileId : null,
        profile_id: isDriver ? null : input.profileId,
        type: input.type,
        amount: input.amount,
        period_month: input.periodMonth,
        notes: input.notes || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const record: Salary = {
    id: `local-${crypto.randomUUID()}`,
    profileId: input.profileId,
    type: input.type,
    amount: input.amount,
    periodMonth: input.periodMonth,
    status: "pending",
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  return store.insert(record);
}

export async function markSalaryPaid(id: string): Promise<Salary | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("salaries")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }
  return store.update(id, { status: "paid" as DriverPaymentStatus });
}

export type EditSalaryInput = Partial<
  Pick<NewSalaryInput, "type" | "amount" | "periodMonth" | "notes">
>;

export async function editSalary(id: string, input: EditSalaryInput): Promise<Salary> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("salaries")
      .update({
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.periodMonth !== undefined ? { period_month: input.periodMonth } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const updated = store.update(id, input as Partial<Salary>);
  if (!updated) throw new Error("Payment record not found");
  return updated;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any, nameById?: Map<string, string>): Salary {
  return {
    id: row.id,
    profileId: row.driver_id ?? row.profile_id,
    personName: (row.driver_id ? nameById?.get(row.driver_id) : undefined) ?? undefined,
    type: row.type,
    amount: Number(row.amount) || 0,
    periodMonth: row.period_month,
    status: row.status,
    paidAt: row.paid_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}
