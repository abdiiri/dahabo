import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { revenueSeries, deliverySeries, topRoutes } from "@/data/mock";

export const Route = createFileRoute("/staff/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Dahabo Staff Portal" },
      { name: "description", content: "Revenue, delivery performance and route profitability reporting with export." },
      { property: "og:title", content: "Reports | Dahabo Staff Portal" },
      { property: "og:description", content: "Revenue, delivery performance and route profitability reporting with export." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Staff", "Reports"]} title="Reports" description="Performance and profitability analytics." actions={<Button><FileBarChart className="size-4" /> Generate report</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-3 p-5 shadow-soft">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Revenue trend (KES M)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="gap-3 p-5 shadow-soft">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Deliveries</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deliverySeries}>
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
          {topRoutes.map((r) => (
            <div key={r.route} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <div><p className="font-semibold">{r.route}</p><p className="text-xs text-muted-foreground">{r.trips} trips</p></div>
              <div className="text-right"><p className="font-semibold">{r.revenue}</p><p className="text-xs text-muted-foreground">{r.growth}</p></div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
