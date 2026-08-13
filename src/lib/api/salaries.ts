import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { Salary, NewSalaryInput, DriverPaymentStatus } from "./types";

const store = localStore<Salary>("salaries", []);
const SELECT = "*, drivers(full_name), profiles(full_name)";

export async function listSalaries(): Promise<Salary[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("salaries").select(SELECT).order("period_month", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
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
      .select(SELECT)
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
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapRow(data);
  }
  return store.update(id, { status: "paid" as DriverPaymentStatus });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Salary {
  return {
    id: row.id,
    profileId: row.driver_id ?? row.profile_id,
    personName: row.drivers?.full_name ?? row.profiles?.full_name ?? undefined,
    type: row.type,
    amount: Number(row.amount) || 0,
    periodMonth: row.period_month,
    status: row.status,
    paidAt: row.paid_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}
