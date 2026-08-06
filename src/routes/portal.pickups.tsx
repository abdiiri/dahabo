import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/common/StatusPill";
import { shipments } from "@/data/mock";

export const Route = createFileRoute("/portal/pickups")({
  head: () => ({
    meta: [
      { title: "Pickup Requests | Dahabo Customer Portal" },
      { name: "description", content: "Schedule a collection and follow the status of your pickup requests." },
      { property: "og:title", content: "Pickup Requests | Dahabo Customer Portal" },
      { property: "og:description", content: "Schedule a collection and follow the status of your pickup requests." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Portal", "Pickups"]} title="Pickup requests" description="Schedule collections and track their status." />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="gap-4 p-6 shadow-soft">
          <h2 className="text-lg font-bold">New pickup request</h2>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); toast.success("Pickup request submitted — reference PU-2261."); }}>
            <div className="grid gap-2"><Label htmlFor="addr">Pickup address</Label><Input id="addr" placeholder="Warehouse 4, Industrial Area" /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="d">Date</Label><Input id="d" type="date" /></div>
              <div className="grid gap-2"><Label htmlFor="t">Time window</Label><Input id="t" placeholder="09:00 – 12:00" /></div>
            </div>
            <div className="grid gap-2"><Label htmlFor="n">Notes</Label><Textarea id="n" rows={4} placeholder="Pallet count, handling instructions…" /></div>
            <Button type="submit">Submit request</Button>
          </form>
        </Card>
        <Card className="gap-2 p-6 shadow-soft">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent requests</h2>
          {shipments.slice(0, 7).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{s.id}</p><p className="truncate text-xs text-muted-foreground">{s.origin} · {s.weight}</p></div>
              <StatusPill status={s.status} />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
