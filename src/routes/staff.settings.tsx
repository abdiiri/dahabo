import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roles, integrations } from "@/data/mock";

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
      <PageHeader breadcrumb={["Staff", "Settings"]} title="Settings" description="Preferences, permissions and integrations." />
      <Tabs defaultValue="Preferences">
        <TabsList><TabsTrigger value="Preferences">Preferences</TabsTrigger><TabsTrigger value="Roles">Roles &amp; permissions</TabsTrigger><TabsTrigger value="Integrations">Integrations</TabsTrigger></TabsList>
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
