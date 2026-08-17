import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, KeyRound, UserCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { integrations } from "@/data/mock";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  PERMISSION_MODULES,
  CONFIGURABLE_ROLES,
  listAllRolePermissions,
  setRolePermission,
  getEffective,
  type RolePermissionRow,
  type PermissionAction,
} from "@/lib/api/permissions";
import { STAFF_ROLE_LABELS } from "@/lib/api/types";

export const Route = createFileRoute("/staff/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Roles | Dahabo Staff Portal" },
      { name: "description", content: "Platform preferences, role permissions and future integration slots." },
      { property: "og:title", content: "Settings & Roles | Dahabo Staff Portal" },
      { property: "og:description", content: "Platform preferences, role permissions and future integration slots." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Staff", "Settings"]} title="Settings" description="Your account, preferences, permissions and integrations." />
      <Tabs defaultValue="Account">
        <TabsList>
          <TabsTrigger value="Account">My account</TabsTrigger>
          <TabsTrigger value="Preferences">Preferences</TabsTrigger>
          <TabsTrigger value="Roles">Roles &amp; permissions</TabsTrigger>
          <TabsTrigger value="Integrations">Integrations</TabsTrigger>
        </TabsList>
        <TabsContent value="Account" className="mt-4">
          <AccountTab />
        </TabsContent>
        <TabsContent value="Preferences" className="mt-4">
          <Card className="gap-4 p-6 shadow-soft">
            {["Email digests", "SMS dispatch alerts", "Delay escalations", "Weekly performance report"].map((s) => (
              <div key={s} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                <Label className="font-medium">{s}</Label><Switch defaultChecked />
              </div>
            ))}
          </Card>
        </TabsContent>
        <TabsContent value="Roles" className="mt-4">
          <RolesPermissionsTab />
        </TabsContent>
        <TabsContent value="Integrations" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((i) => (
            <Card key={i} className="flex-row items-center justify-between gap-3 p-5 shadow-soft">
              <div><p className="font-semibold">{i}</p><p className="text-xs text-muted-foreground">Ready to connect</p></div>
              <Switch />
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}

function AccountTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveName() {
    if (!user || !supabase) return;
    if (!fullName.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Name updated");
    } catch (err) {
      toast.error("Couldn't update your name", { description: getErrorMessage(err) });
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword() {
    setPasswordError(null);
    if (password.length < 8) {
      setPasswordError("At least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setPasswordError("Passwords don't match.");
      return;
    }
    if (!supabase) return;
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password changed");
      setPassword("");
      setConfirm("");
    } catch (err) {
      toast.error("Couldn't change password", { description: getErrorMessage(err) });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-4 p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <UserCircle className="size-4" /> Your name
        </h2>
        <p className="text-xs text-muted-foreground">This is what shows up across the portal once you're signed in.</p>
        <div className="grid gap-1.5">
          <Label className="text-sm">Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm">Email</Label>
          <Input value={profile?.email ?? ""} disabled />
        </div>
        <Button onClick={saveName} disabled={savingName} className="w-fit">
          {savingName ? <Loader2 className="size-4 animate-spin" /> : null}
          Save name
        </Button>
      </Card>

      <Card className="gap-4 p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <KeyRound className="size-4" /> Change password
        </h2>
        <p className="text-xs text-muted-foreground">Choose a new password for signing in.</p>
        <div className="grid gap-1.5">
          <Label className="text-sm">New password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm">Confirm new password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {passwordError ? <p className="text-xs font-medium text-destructive">{passwordError}</p> : null}
        <Button onClick={savePassword} disabled={savingPassword} className="w-fit">
          {savingPassword ? <Loader2 className="size-4 animate-spin" /> : null}
          Change password
        </Button>
      </Card>
    </div>
  );
}

function RolesPermissionsTab() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [rows, setRows] = useState<RolePermissionRow[] | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAllRolePermissions().then((r) => active && setRows(r));
    return () => {
      active = false;
    };
  }, []);

  async function toggle(role: (typeof CONFIGURABLE_ROLES)[number], moduleKey: string, action: PermissionAction, next: boolean) {
    const key = `${role}:${moduleKey}:${action}`;
    setBusyKey(key);
    // Optimistic update so the switch feels instant.
    setRows((prev) => {
      const list = prev ?? [];
      const idx = list.findIndex((r) => r.role === role && r.module === moduleKey);
      if (idx === -1) {
        return [
          ...list,
          {
            id: `${role}:${moduleKey}`,
            role,
            module: moduleKey,
            canCreate: action === "create" ? next : true,
            canEdit: action === "edit" ? next : true,
            canDelete: action === "delete" ? next : true,
          },
        ];
      }
      const copy = [...list];
      const row = { ...copy[idx] };
      if (action === "create") row.canCreate = next;
      if (action === "edit") row.canEdit = next;
      if (action === "delete") row.canDelete = next;
      copy[idx] = row;
      return copy;
    });
    try {
      await setRolePermission(role, moduleKey, action, next);
    } catch (err) {
      toast.error("Couldn't update permission", { description: getErrorMessage(err) });
      // Roll back by re-fetching the real state.
      listAllRolePermissions().then(setRows);
    } finally {
      setBusyKey(null);
    }
  }

  if (!isAdmin) {
    return (
      <Card className="flex-row items-start gap-3 p-5 shadow-soft">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-semibold">Only admins can change this</p>
          <p className="text-sm text-muted-foreground">
            Ask an admin to update what each role is allowed to create, edit or delete.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Turn a switch off to stop everyone with that role from doing it — anywhere in the portal.
        Admin accounts always keep full access. A switch left on keeps today's behaviour.
      </p>
      {CONFIGURABLE_ROLES.map((role) => (
        <Card key={role} className="gap-3 p-5 shadow-soft">
          <h3 className="font-bold">{STAFF_ROLE_LABELS[role]}</h3>
          {rows === null ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-2">Module</th>
                    <th className="px-2 py-2 text-center">Create</th>
                    <th className="px-2 py-2 text-center">Edit</th>
                    <th className="px-2 py-2 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((m) => {
                    const eff = getEffective(rows, role, m.key);
                    return (
                      <tr key={m.key} className="border-b border-border last:border-0">
                        <td className="py-2 pr-2 font-medium">{m.label}</td>
                        {(["create", "edit", "delete"] as PermissionAction[]).map((action) => {
                          const checked = action === "create" ? eff.canCreate : action === "edit" ? eff.canEdit : eff.canDelete;
                          const key = `${role}:${m.key}:${action}`;
                          return (
                            <td key={action} className="px-2 py-2 text-center">
                              <Switch
                                checked={checked}
                                disabled={busyKey === key}
                                onCheckedChange={(v) => toggle(role, m.key, action, v)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
