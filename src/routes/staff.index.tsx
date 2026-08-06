import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, BadgeDollarSign, CalendarClock, CheckCircle2, Clock, CreditCard, Package,
  Truck, UserCheck, Users, Warehouse, Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusPill } from "@/components/common/StatusPill";
import { LiveMap } from "@/components/common/LiveMap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  activityFeed, calendarEvents, customerGrowth, deliverySeries, notifications,
  revenueSeries, shipments, topRoutes, vehicleUsage,
} from "@/data/mock";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Operations Command Centre | Dahabo Staff Portal" },
      { name: "description", content: "Executive logistics dashboard: revenue, shipments, fleet, warehouse capacity and live operations map." },
      { property: "og:title", content: "Operations Command Centre | Dahabo Staff Portal" },
      { property: "og:description", content: "Executive logistics dashboard: revenue, shipments, fleet, warehouse capacity and live operations map." },
    ],
  }),
  component: Page,
});

const stats = [
  { label: "Today's Revenue", value: "KES 1.84M", delta: "+8.2%", icon: BadgeDollarSign, tone: "gold" as const },
  { label: "Monthly Revenue", value: "KES 46.2M", delta: "+12.4%", icon: BadgeDollarSign, tone: "success" as const },
  { label: "Total Shipments", value: "1,284", delta: "+4.1%", icon: Package },
  { label: "In Transit", value: "62", delta: "+6", icon: Truck, tone: "default" as const },
  { label: "Delivered", value: "1,142", delta: "+38", icon: CheckCircle2, tone: "success" as const },
  { label: "Delayed", value: "7", delta: "-3", trend: "down" as const, icon: AlertTriangle, tone: "danger" as const },
  { label: "Pending Quotes", value: "23", delta: "+5", icon: Clock, tone: "warning" as const },
  { label: "Vehicles Active", value: "38 / 46", delta: "+2", icon: Truck },
  { label: "Drivers Online", value: "41", delta: "+4", icon: UserCheck, tone: "success" as const },
  { label: "Warehouse Capacity", value: "72%", delta: "+3%", icon: Warehouse, tone: "warning" as const },
  { label: "Customers", value: "316", delta: "+9", icon: Users },
  { label: "Outstanding", value: "KES 8.7M", delta: "-2.4%", trend: "down" as const, icon: CreditCard, tone: "danger" as const },
];

const chartColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "10px",
  color: "var(--color-popover-foreground)",
  fontSize: 12,
};

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3 p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {action ? <Button variant="ghost" size="sm" className="h-7 text-xs">{action}</Button> : null}
      </div>
      {children}
    </Card>
  );
}

function Page() {
  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Command Centre"]}
        title="Operations Command Centre"
        description="Live view of revenue, freight movements, fleet and warehouse performance."
        actions={<><Button variant="outline">Export briefing</Button><Button>Create shipment</Button></>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_2fr_0.85fr]">
        <div className="space-y-6">
          <Panel title="Today's shipments" action="View all">
            <ScrollArea className="h-[190px] pr-3">
              {shipments.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{s.id}</p><p className="truncate text-xs text-muted-foreground">{s.origin} → {s.destination}</p></div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </ScrollArea>
          </Panel>
          <Panel title="Urgent deliveries">
            {shipments.filter((s) => s.status === "Delayed").slice(0, 3).map((s) => (
              <div key={s.id} className="rounded-lg border border-destructive/25 bg-destructive/8 p-3">
                <p className="text-sm font-semibold">{s.id}</p>
                <p className="text-xs text-muted-foreground">{s.customer} · ETA {s.eta}</p>
              </div>
            ))}
          </Panel>
          <Panel title="Pending pickups">
            {shipments.slice(6, 9).map((s) => (
              <div key={s.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
                <CalendarClock className="size-4 shrink-0 text-gold" />
                <div className="min-w-0"><p className="truncate text-sm font-medium">{s.customer}</p><p className="truncate text-xs text-muted-foreground">{s.origin} · {s.weight}</p></div>
              </div>
            ))}
          </Panel>
        </div>

        <div className="space-y-6">
          <Card className="gap-3 p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Live operations map</h2>
              <Badge variant="secondary">9 assets tracked</Badge>
            </div>
            <LiveMap />
          </Card>
          <Panel title="Activity feed" action="Full log">
            <ol className="mt-1">
              {activityFeed.map((a, i) => (
                <li key={a.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < activityFeed.length - 1 ? <span className="absolute left-[9px] top-5 h-full w-px bg-border" /> : null}
                  <span className="z-10 mt-1 size-5 shrink-0 rounded-full bg-gold ring-4 ring-card" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{a.meta}</p></div>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Notifications" action="Mark read">
            <ScrollArea className="h-[190px] pr-3">
              {notifications.map((n) => (
                <div key={n.id} className="border-b border-border py-2.5 last:border-0">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.category} · {n.time}</p>
                </div>
              ))}
            </ScrollArea>
          </Panel>
          <Panel title="Vehicle maintenance">
            {["VEH-2205 · service due 12 Aug", "VEH-2211 · brake inspection", "VEH-2207 · reefer calibration"].map((m) => (
              <p key={m} className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-0">
                <Wrench className="size-4 shrink-0 text-warning" /> {m}
              </p>
            ))}
          </Panel>
          <Panel title="Calendar">
            {calendarEvents.map((d) => (
              <div key={d.day} className="border-b border-border py-2.5 last:border-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{d.day}</p>
                {d.items.map((it) => (
                  <p key={it.label} className="mt-1.5 flex items-center gap-2 text-sm"><span className="text-xs tabular-nums text-muted-foreground">{it.t}</span> {it.label}</p>
                ))}
              </div>
            ))}
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Revenue vs target (KES M)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueSeries}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#rev)" />
              <Line type="monotone" dataKey="target" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Deliveries this week">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deliverySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="delivered" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="delayed" fill="var(--color-chart-5)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Vehicle usage">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={vehicleUsage} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {vehicleUsage.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Customer growth">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={customerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="customers" stroke="var(--color-chart-3)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Top routes">
          {topRoutes.map((r) => (
            <div key={r.route} className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{r.route}</p><p className="text-xs text-muted-foreground">{r.trips} trips · {r.revenue}</p></div>
              <Badge variant={r.growth.startsWith("-") ? "destructive" : "secondary"}>{r.growth}</Badge>
            </div>
          ))}
        </Panel>
        <Panel title="Monthly performance">
          {[["On-time delivery", 98], ["Fleet utilisation", 82], ["Warehouse capacity", 72], ["Invoice collection", 91]].map(([l, v]) => (
            <div key={l as string} className="py-2">
              <div className="flex justify-between text-xs font-medium"><span className="text-muted-foreground">{l as string}</span><span>{v as number}%</span></div>
              <Progress value={v as number} className="mt-1.5 h-2" />
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
