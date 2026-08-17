import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import type { StaffRole } from "./types";

/** Every module an admin can independently switch create/edit/delete for.
 * The `key` must match the RLS policies added in
 * supabase/migrations/014_role_permissions.sql for modules that are also
 * enforced at the database level. */
export const PERMISSION_MODULES: { key: string; label: string }[] = [
  { key: "staff", label: "Staff" },
  { key: "drivers", label: "Drivers" },
  { key: "vehicles", label: "Fleet / Vehicles" },
  { key: "customers", label: "Customers" },
  { key: "shipments", label: "Shipments" },
  { key: "transport_orders", label: "Transport Orders" },
  { key: "trips", label: "Trips" },
  { key: "fuel_records", label: "Fuel Records" },
  { key: "maintenance_records", label: "Maintenance" },
  { key: "warehouses", label: "Warehouses" },
  { key: "documents", label: "Documents" },
];

/** Roles an admin can configure. Admin itself is never listed here — an
 * admin always has full access to everything. */
export const CONFIGURABLE_ROLES: StaffRole[] = [
  "operations_manager",
  "finance_officer",
  "warehouse_manager",
  "fleet_manager",
  "staff",
];

export type PermissionAction = "create" | "edit" | "delete";

export type RolePermissionRow = {
  id: string;
  role: StaffRole;
  module: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

function rowId(role: string, moduleKey: string) {
  return `${role}:${moduleKey}`;
}

const local = localStore<RolePermissionRow>("role_permissions", []);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RolePermissionRow {
  return {
    id: rowId(row.role, row.module),
    role: row.role,
    module: row.module,
    canCreate: row.can_create ?? true,
    canEdit: row.can_edit ?? true,
    canDelete: row.can_delete ?? true,
  };
}

/** All saved permission overrides, across every configurable role. Modules
 * with no row default to fully allowed — see has_permission() in the
 * migration and getEffective() below. */
export async function listAllRolePermissions(): Promise<RolePermissionRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("role_permissions").select("*");
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return local.list();
}

/** Saved permission overrides for a single role. */
export async function listRolePermissions(role: StaffRole): Promise<RolePermissionRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("role_permissions").select("*").eq("role", role);
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return local.list().filter((r) => r.role === role);
}

/** Flip one switch (create/edit/delete) for one role + module. Admin-only
 * at the database level (see migration). */
export async function setRolePermission(
  role: StaffRole,
  moduleKey: string,
  action: PermissionAction,
  value: boolean,
): Promise<RolePermissionRow> {
  if (isSupabaseConfigured && supabase) {
    const { data: existing } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role", role)
      .eq("module", moduleKey)
      .maybeSingle();

    const next = {
      role,
      module: moduleKey,
      can_create: action === "create" ? value : (existing?.can_create ?? true),
      can_edit: action === "edit" ? value : (existing?.can_edit ?? true),
      can_delete: action === "delete" ? value : (existing?.can_delete ?? true),
    };
    const { data, error } = await supabase
      .from("role_permissions")
      .upsert(next, { onConflict: "role,module" })
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const id = rowId(role, moduleKey);
  const existing = local.get(id);
  const next: RolePermissionRow = {
    id,
    role,
    module: moduleKey,
    canCreate: action === "create" ? value : (existing?.canCreate ?? true),
    canEdit: action === "edit" ? value : (existing?.canEdit ?? true),
    canDelete: action === "delete" ? value : (existing?.canDelete ?? true),
  };
  return existing ? (local.update(id, next) as RolePermissionRow) : local.insert(next);
}

/** Resolves the effective create/edit/delete flags for a role + module out
 * of a list of saved rows — missing rows default to fully allowed, same as
 * has_permission() on the database side. */
export function getEffective(
  rows: RolePermissionRow[],
  role: StaffRole,
  moduleKey: string,
): { canCreate: boolean; canEdit: boolean; canDelete: boolean } {
  const row = rows.find((r) => r.role === role && r.module === moduleKey);
  return {
    canCreate: row?.canCreate ?? true,
    canEdit: row?.canEdit ?? true,
    canDelete: row?.canDelete ?? true,
  };
}
