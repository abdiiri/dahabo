import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import { staffUsers } from "@/data/mock";
import { deleteAuthAccount, createStaffAccount } from "./accounts.server";
import { generateTempPassword } from "./drivers";
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
      status: u.status === "Suspended" ? "suspended" : "active",
      mustChangePassword: false,
      dateJoined: `202${3 + (i % 3)}-01-01`,
      createdAt: "2024-01-01T00:00:00Z",
    }));
}

const store = localStore<StaffMember>("staff", seedStaff());

function generateStaffCode(existing: StaffMember[]): string {
  // Numbering starts at 1 (USR-001) and counts up from whatever the
  // highest existing code is, so every new hire gets the next number in
  // sequence rather than a timestamp or an arbitrary jump.
  const max = existing.reduce((m, s) => {
    const n = Number(s.staffCode.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `USR-${String(max + 1).padStart(3, "0")}`;
}

/**
 * Forces staff codes to be dense and start at 1 (USR-001, USR-002, ...) by
 * creation order, and writes back any row whose code doesn't already match.
 *
 * This exists because the demo/local store only seeds data the first time
 * a browser has none — a browser that already ran an earlier build has
 * old codes (e.g. USR-101+) sitting in its localStorage, and just changing
 * the seed data doesn't touch what's already saved there. Running this on
 * every read self-heals that regardless of what's cached, and is a no-op
 * once codes are already correct.
 */
function normalizeStaffCodes(rows: StaffMember[]): StaffMember[] {
  const byAge = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const codeById = new Map(byAge.map((r, i) => [r.id, `USR-${String(i + 1).padStart(3, "0")}`]));
  let changed = false;
  const next = rows.map((r) => {
    const code = codeById.get(r.id)!;
    if (r.staffCode === code) return r;
    changed = true;
    return { ...r, staffCode: code };
  });
  if (changed) {
    next.forEach((r) => store.update(r.id, { staffCode: r.staffCode } as Partial<StaffMember>));
  }
  return next;
}

/**
 * Supabase counterpart to `normalizeStaffCodes` above — same self-healing
 * idea (dense codes starting at USR-001 by creation order), but writing
 * mismatches back to the `profiles` table instead of local storage. This
 * is what actually fixes accounts that already exist in a connected
 * Supabase project: accounts created by hand (no staff_code at all, so the
 * UI fell back to showing the raw row id) or by the old timestamp-based
 * generator (e.g. USR-466543) both get corrected here, not just newly
 * created ones.
 */
async function normalizeStaffCodesSupabase(rows: StaffMember[]): Promise<StaffMember[]> {
  // rows must already be sorted oldest-first for the numbering to be stable.
  // The Supabase query builder is thenable (works with Promise.all) but
  // isn't literally typed as Promise<unknown> — PromiseLike covers both.
  const updates: PromiseLike<unknown>[] = [];
  const next = rows.map((r, i) => {
    const code = `USR-${String(i + 1).padStart(3, "0")}`;
    if (r.staffCode === code) return r;
    updates.push(supabase!.from("profiles").update({ staff_code: code }).eq("id", r.id));
    return { ...r, staffCode: code };
  });
  if (updates.length > 0) await Promise.all(updates);
  return next;
}

export async function listStaff(): Promise<StaffMember[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("role", "driver")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const normalized = await normalizeStaffCodesSupabase((data ?? []).map(mapSupabaseProfile));
    // Oldest-first was required for numbering; newest-first is what the
    // staff table actually displays.
    return [...normalized].reverse();
  }
  return normalizeStaffCodes(store.list());
}

export async function createStaff(input: NewStaffInput): Promise<StaffMember> {
  if (isSupabaseConfigured && supabase) {
    // Admin-created account, same admin API used for driver logins — the
    // admin sets a temporary password here and hands it to the staff
    // member directly; they're forced to change it on first sign-in.
    const result = await createStaffAccount({
      data: {
        email: input.email,
        password: input.password ?? generateTempPassword(),
        fullName: input.fullName,
        phone: input.phone,
        role: input.role,
        jobTitle: input.jobTitle,
        department: input.department,
      },
    });

    const { data: existingRows, error: existingError } = await supabase
      .from("profiles")
      .select("*")
      .neq("role", "driver")
      .order("created_at", { ascending: true });
    if (existingError) throw existingError;
    // Normalize whatever's already there first — this also catches
    // accounts created by hand (no staff_code) or by the old timestamp
    // generator, so the new hire's number is always a true "next in
    // sequence" rather than built on top of stale/broken codes.
    const normalizedExisting = await normalizeStaffCodesSupabase(
      (existingRows ?? []).map(mapSupabaseProfile),
    );
    const staffCode = `USR-${String(normalizedExisting.length + 1).padStart(3, "0")}`;
    const { data, error } = await supabase
      .from("profiles")
      .update({ staff_code: staffCode })
      .eq("id", result.id)
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
    status: "active",
    mustChangePassword: true,
    dateJoined: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  return store.insert(member);
}

export type EditStaffInput = Partial<
  Pick<NewStaffInput, "fullName" | "phone" | "role" | "jobTitle" | "department">
>;

export async function editStaff(id: string, input: EditStaffInput): Promise<StaffMember> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.jobTitle !== undefined ? { job_title: input.jobTitle || null } : {}),
        ...(input.department !== undefined ? { department: input.department || null } : {}),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapSupabaseProfile(data);
  }

  const updated = store.update(id, input as Partial<StaffMember>);
  if (!updated) throw new Error("Staff member not found");
  return updated;
}

/** Permanently removes the staff member's login and profile. */
export async function deleteStaff(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await deleteAuthAccount({ data: { userId: id } });
    return;
  }
  store.remove(id);
}

/** Deactivate (or reactivate) a staff member's login. A suspended account
 * is blocked at sign-in even with the correct password — see src/lib/auth.tsx. */
export async function setStaffAccountStatus(id: string, active: boolean): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("profiles")
      .update({ status: active ? "active" : "suspended" })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.update(id, { status: active ? "active" : "suspended" } as Partial<StaffMember>);
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
    status: row.status,
    mustChangePassword: Boolean(row.must_change_password),
    dateJoined: row.date_joined ?? row.created_at?.slice(0, 10) ?? "",
    createdAt: row.created_at,
  };
}
