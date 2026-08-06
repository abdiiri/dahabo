import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notifications } from "@/data/mock";

export const Route = createFileRoute("/portal/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | Dahabo Customer Portal" },
      { name: "description", content: "Shipment, billing and account notifications for your organisation." },
      { property: "og:title", content: "Notifications | Dahabo Customer Portal" },
      { property: "og:description", content: "Shipment, billing and account notifications for your organisation." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Portal", "Notifications"]} title="Notifications" description="Updates on your shipments and billing." />
      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className="flex-row items-start gap-4 p-4 shadow-soft">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-gold" />
            <div className="min-w-0 flex-1"><p className="font-medium">{n.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{n.time}</p></div>
            <Badge variant="secondary">{n.category}</Badge>
          </Card>
        ))}
      </div>
    </>
  );
}
