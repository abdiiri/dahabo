import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notifications } from "@/data/mock";

export const Route = createFileRoute("/staff/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | Dahabo Staff Portal" },
      { name: "description", content: "Shipment, finance, driver, customer and system notifications in one centre." },
      { property: "og:title", content: "Notifications | Dahabo Staff Portal" },
      { property: "og:description", content: "Shipment, finance, driver, customer and system notifications in one centre." },
    ],
  }),
  component: Page,
});

const cats = ["All", "Shipment", "Finance", "Drivers", "Customers", "System"];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Staff", "Notifications"]} title="Notification centre" description="Everything the operations platform wants you to know." />
      <Tabs defaultValue="All">
        <TabsList className="flex-wrap">{cats.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}</TabsList>
        {cats.map((c) => (
          <TabsContent key={c} value={c} className="mt-4 space-y-3">
            {notifications.filter((n) => c === "All" || n.category === c).map((n) => (
              <Card key={n.id} className="flex-row items-start gap-4 p-4 shadow-soft">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-gold" />
                <div className="min-w-0 flex-1"><p className="font-medium">{n.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{n.time}</p></div>
                <Badge variant="secondary">{n.category}</Badge>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
