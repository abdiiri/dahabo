import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, KeyRound, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roles, integrations } from "@/data/mock";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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
        <TabsContent value="Roles" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.role} className="gap-2 p-5 shadow-soft">
              <h3 className="font-bold">{r.role}</h3>
              <p className="text-sm text-muted-foreground">{r.scope}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{r.permissions.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}</div>
            </Card>
          ))}
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
