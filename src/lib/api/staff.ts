import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import { staffUsers } from "@/data/mock";
import type { StaffMember, NewStaffInput, StaffRole } from "./types";

const ROLE_MAP: Record<string, StaffRole> = {
  "Super Admin": "admin",
  Admin: "admin",
  "Operations Manager": "operations_manager",
  "Finance Officer": "finance_officer",
  "Warehouse Manager": "warehouse_manager",
  "Fleet Manager": "fleet_manager",
  Driver: "driver",
};

function seedStaff(): StaffMember[] {
  return staffUsers
    .filter((u) => u.role !== "Driver")
    .map((u, i) => ({
      id: u.id,
      staffCode: u.id,
      fullName: u.name,
      email: u.email,
      phone: undefined,
      role: ROLE_MAP[u.role] ?? "staff",
      jobTitle: u.role,
      department: undefined,
      branch: u.branch,
      status: u.status === "Suspended" ? "suspended" : "active",
      mustChangePassword: false,
      dateJoined: `202${3 + (i % 3)}-01-01`,
      createdAt: "2024-01-01T00:00:00Z",
    }));
}

const store = localStore<StaffMember>("staff", seedStaff());

function generateStaffCode(existing: StaffMember[]): string {
  const max = existing.reduce((m, s) => {
    const n = Number(s.staffCode.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 100);
  return `USR-${max + 1}`;
}

export async function listStaff(): Promise<StaffMember[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("role", "driver")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseProfile);
  }
  return store.list();
}

export async function createStaff(input: NewStaffInput): Promise<StaffMember> {
  if (isSupabaseConfigured && supabase) {
    // Passwordless invite: creates the auth user + profiles row (via the
    // database trigger) and emails the new staff member a sign-in link.
    // No service-role key required — safe to call from the browser.
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: { shouldCreateUser: true, data: { full_name: input.fullName } },
    });
    if (signInError) throw signInError;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", input.email)
      .single();
    if (profileError) throw profileError;

    const staffCode = `USR-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from("profiles")
      .update({
        role: input.role,
        phone: input.phone ?? null,
        full_name: input.fullName,
        job_title: input.jobTitle ?? null,
        department: input.department ?? null,
        staff_code: staffCode,
      })
      .eq("id", profile.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapSupabaseProfile(data);
  }

  const existing = store.list();
  const member: StaffMember = {
    id: `local-${crypto.randomUUID()}`,
    staffCode: generateStaffCode(existing),
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    role: input.role,
    jobTitle: input.jobTitle,
    department: input.department,
    branch: input.branch,
    status: "active",
    mustChangePassword: true,
    dateJoined: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  return store.insert(member);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseProfile(row: any): StaffMember {
  return {
    id: row.id,
    staffCode: row.staff_code ?? row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role,
    jobTitle: row.job_title ?? undefined,
    department: row.department ?? undefined,
    branch: row.branch_id ?? undefined,
    status: row.status,
    mustChangePassword: Boolean(row.must_change_password),
    dateJoined: row.date_joined ?? row.created_at?.slice(0, 10) ?? "",
    createdAt: row.created_at,
  };
}
