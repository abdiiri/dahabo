import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listNotifications, type NotificationEntry } from "@/lib/api/notifications";

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
  const [notifications, setNotifications] = useState<NotificationEntry[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    listNotifications().then((rows) => active && setNotifications(rows));
    return () => {
      active = false;
    };
  }, []);

  if (notifications === null) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const searched = q ? notifications.filter((n) => n.title.toLowerCase().includes(q)) : notifications;

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Notifications"]} title="Notification centre" description="Everything the operations platform wants you to know." />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notifications…"
          className="pl-9"
        />
      </div>
      <Tabs defaultValue="All">
        <TabsList className="flex-wrap">{cats.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}</TabsList>
        {cats.map((c) => {
          const filtered = searched.filter((n) => c === "All" || n.category === c);
          return (
            <TabsContent key={c} value={c} className="mt-4 space-y-3">
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {q ? "No notifications match your search." : "No notifications here yet."}
                </p>
              ) : (
                filtered.map((n) => (
                  <Card key={n.id} className="flex-row items-start gap-4 p-4 shadow-soft">
                    <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.read ? "bg-muted-foreground/40" : "bg-gold"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge variant="secondary">{n.category}</Badge>
                  </Card>
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
