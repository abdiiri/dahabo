import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/common/StatusPill";
import { LiveMap } from "@/components/common/LiveMap";
import { trackingTimeline } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/tracking")({
  head: () => ({
    meta: [
      { title: "Shipment Tracking | Dahabo Customer Portal" },
      { name: "description", content: "Live milestone tracking and vehicle telemetry for your active shipments." },
      { property: "og:title", content: "Shipment Tracking | Dahabo Customer Portal" },
      { property: "og:description", content: "Live milestone tracking and vehicle telemetry for your active shipments." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Portal", "Tracking"]} title="Shipment tracking" description="Live milestones for DGL-102345." />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="gap-4 p-6 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Waybill</p><p className="text-xl font-extrabold">DGL-102345</p></div>
            <StatusPill status="In Transit" />
          </div>
          <Progress value={58} className="h-2" />
          <ol className="mt-2 border-t border-border pt-5">
            {trackingTimeline.map((t, i) => (
              <li key={t.label} className="relative flex gap-4 pb-6 last:pb-0">
                {i < trackingTimeline.length - 1 ? <span className="absolute left-[11px] top-6 h-full w-px bg-border" /> : null}
                <span className={cn("z-10 mt-1 size-6 shrink-0 rounded-full ring-4 ring-card", t.done ? "bg-success" : "bg-secondary")} />
                <div className="min-w-0"><p className={cn("text-sm font-semibold", !t.done && "text-muted-foreground")}>{t.label}</p><p className="text-xs text-muted-foreground">{t.place} · {t.time}</p></div>
              </li>
            ))}
          </ol>
        </Card>
        <LiveMap className="h-full min-h-[420px]" />
      </div>
    </>
  );
}
