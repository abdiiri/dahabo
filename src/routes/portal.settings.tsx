import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export const Route = createFileRoute("/portal/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Dahabo Customer Portal" },
      { name: "description", content: "Notification preferences, language and appearance settings." },
      { property: "og:title", content: "Settings | Dahabo Customer Portal" },
      { property: "og:description", content: "Notification preferences, language and appearance settings." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Portal", "Settings"]} title="Settings" description="Notifications, language and appearance." />
      <Card className="gap-4 p-6 shadow-soft">
        {["Email shipment updates", "SMS delivery alerts", "Invoice reminders", "Marketing updates"].map((s) => (
          <div key={s} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
            <Label className="font-medium">{s}</Label><Switch defaultChecked />
          </div>
        ))}
      </Card>
      <Card className="flex-row items-center justify-between gap-4 p-6 shadow-soft">
        <div><p className="font-medium">Appearance</p><p className="text-sm text-muted-foreground">Switch between light and dark mode.</p></div>
        <ThemeToggle />
      </Card>
    </>
  );
}
