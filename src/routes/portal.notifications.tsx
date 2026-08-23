import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? notifications.filter((n) => n.title.toLowerCase().includes(q)) : notifications;

  return (
    <>
      <PageHeader breadcrumb={["Portal", "Notifications"]} title="Notifications" description="Updates on your shipments and billing." />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notifications…"
          className="pl-9"
        />
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No notifications match your search.</p>
        ) : (
          filtered.map((n) => (
            <Card key={n.id} className="flex-row items-start gap-4 p-4 shadow-soft">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-gold" />
              <div className="min-w-0 flex-1"><p className="font-medium">{n.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{n.time}</p></div>
              <Badge variant="secondary">{n.category}</Badge>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
