import { createFileRoute } from "@tanstack/react-router";
import { Package, Truck, CheckCircle2, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusPill } from "@/components/common/StatusPill";
import { LiveMap } from "@/components/common/LiveMap";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { shipments, invoices, notifications } from "@/data/mock";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Customer Dashboard | Dahabo Portal" },
      { name: "description", content: "Track your shipments, invoices and pickup requests from one dashboard." },
      { property: "og:title", content: "Customer Dashboard | Dahabo Portal" },
      { property: "og:description", content: "Track your shipments, invoices and pickup requests from one dashboard." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Portal", "Dashboard"]} title="Welcome back, Jane" description="Here's what's moving on your account today." actions={<Button>Request pickup</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active shipments" value="12" delta="+3" icon={Package} />
        <StatCard label="In transit" value="7" delta="+1" icon={Truck} tone="gold" />
        <StatCard label="Delivered this month" value="48" delta="+11%" icon={CheckCircle2} tone="success" />
        <StatCard label="Outstanding balance" value="KES 412,000" delta="-6%" trend="down" icon={CreditCard} tone="warning" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="gap-3 p-5 shadow-soft">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Live shipment map</h2>
          <LiveMap />
        </Card>
        <div className="space-y-6">
          <Card className="gap-2 p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent shipments</h2>
            {shipments.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{s.id}</p><p className="truncate text-xs text-muted-foreground">{s.origin} → {s.destination}</p></div>
                <StatusPill status={s.status} />
              </div>
            ))}
          </Card>
          <Card className="gap-2 p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Latest invoices</h2>
            {invoices.slice(0, 4).map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{i.id}</p><p className="text-xs text-muted-foreground">Due {i.due}</p></div>
                <StatusPill status={i.status} />
              </div>
            ))}
          </Card>
          <Card className="gap-2 p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Notifications</h2>
            {notifications.slice(0, 4).map((n) => (
              <p key={n.id} className="border-b border-border py-2 text-sm last:border-0">{n.title}</p>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
