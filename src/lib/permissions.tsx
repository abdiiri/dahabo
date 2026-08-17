import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { listRolePermissions, getEffective, type PermissionAction } from "@/lib/api/permissions";
import type { RolePermissionRow } from "@/lib/api/permissions";

type PermissionsContextValue = {
  loading: boolean;
  /** Can the signed-in staff member do `action` in `module`? Admins are
   * always true. Anyone else defaults to true until an admin turns a
   * switch off in Settings -> Roles & permissions. */
  can: (moduleKey: string, action: PermissionAction) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue>({
  loading: false,
  can: () => true,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const role = profile?.role;
  const [rows, setRows] = useState<RolePermissionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Admins (and signed-out / driver / no-profile states) never need a
    // fetch — admins are always fully allowed, and the driver app doesn't
    // use this at all.
    if (!role || role === "admin" || role === "driver") {
      setRows([]);
      return;
    }

    let active = true;
    setLoading(true);
    listRolePermissions(role)
      .then((r) => active && setRows(r))
      .finally(() => active && setLoading(false));

    // Live-apply changes an admin makes elsewhere, without needing a
    // page reload.
    let unsubscribe: (() => void) | undefined;
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`role_permissions:${role}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "role_permissions", filter: `role=eq.${role}` },
          () => {
            listRolePermissions(role).then((r) => active && setRows(r));
          },
        )
        .subscribe();
      unsubscribe = () => {
        supabase.removeChannel(channel);
      };
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [role]);

  const can = (moduleKey: string, action: PermissionAction) => {
    if (!role || role === "admin") return true;
    if (role === "driver") return true; // the driver app doesn't use this system
    const eff = getEffective(rows, role, moduleKey);
    if (action === "create") return eff.canCreate;
    if (action === "edit") return eff.canEdit;
    return eff.canDelete;
  };

  return (
    <PermissionsContext.Provider value={{ loading, can }}>{children}</PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
