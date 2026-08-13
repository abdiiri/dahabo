import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { getRevenueTrend, getDeliveriesTrend, getTopRoutes, type RevenuePoint, type DeliveryPoint, type RouteStat } from "@/lib/api/reports";

export const Route = createFileRoute("/staff/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Dahabo Staff Portal" },
      { name: "description", content: "Revenue, delivery performance and route profitability reporting." },
      { property: "og:title", content: "Reports | Dahabo Staff Portal" },
      { property: "og:description", content: "Revenue, delivery performance and route profitability reporting." },
    ],
  }),
  component: Page,
});

function Page() {
  const [revenue, setRevenue] = useState<RevenuePoint[] | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryPoint[] | null>(null);
  const [routes, setRoutes] = useState<RouteStat[] | null>(null);

  useEffect(() => {
    let active = true;
    getRevenueTrend().then((r) => active && setRevenue(r));
    getDeliveriesTrend().then((r) => active && setDeliveries(r));
    getTopRoutes().then((r) => active && setRoutes(r));
    return () => {
      active = false;
    };
  }, []);

  const loading = revenue === null || deliveries === null || routes === null;

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Reports"]} title="Reports" description="Performance and profitability analytics." />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="gap-3 p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Revenue trend (KSh)</h2>
            {revenue!.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No completed trip revenue yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenue!}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card className="gap-3 p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Deliveries (last 7 days)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deliveries!}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="delivered" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="gap-2 p-5 shadow-soft lg:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Route profitability</h2>
            {routes!.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No completed trips with revenue yet.</p>
            ) : (
              routes!.map((r) => (
                <div key={r.route} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                  <div><p className="font-semibold">{r.route}</p><p className="text-xs text-muted-foreground">{r.trips} trips</p></div>
                  <div className="text-right"><p className="font-semibold">{r.revenue}</p></div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}
    </>
  );
}
