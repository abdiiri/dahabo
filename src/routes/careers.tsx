import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, GraduationCap, HeartPulse, TrendingUp } from "lucide-react";
import { PublicPage } from "@/components/site/PublicPage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jobs } from "@/data/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers at Dahabo Global Logistics" },
      { name: "description", content: "Open roles in operations, fleet, compliance, warehousing and finance across our East African network." },
      { property: "og:title", content: "Careers | Dahabo Global Logistics" },
      { property: "og:description", content: "Join a regional logistics operator investing in its people." },
    ],
  }),
  component: Careers,
});

function Careers() {
  return (
    <PublicPage
      eyebrow="Careers"
      title="Build a career that keeps the region moving"
      description="We hire for judgement and reliability, then invest heavily in training. Every role has a defined progression path."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: HeartPulse, t: "Medical cover", d: "Comprehensive inpatient and outpatient cover for staff and dependants." },
          { icon: GraduationCap, t: "Training", d: "Funded certification in logistics, safety and customs practice." },
          { icon: TrendingUp, t: "Progression", d: "Structured career bands with twice-yearly reviews." },
          { icon: Briefcase, t: "Stability", d: "Permanent contracts with pension and leave benefits." },
        ].map((b) => (
          <Card key={b.t} className="gap-2 p-6 shadow-soft">
            <span className="grid size-11 place-items-center rounded-xl bg-gold/18 text-gold">
              <b.icon className="size-5" />
            </span>
            <h3 className="mt-2 font-bold">{b.t}</h3>
            <p className="text-sm text-muted-foreground">{b.d}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-16 text-2xl font-extrabold">Open positions</h2>
      <div className="mt-6 space-y-3">
        {jobs.map((j) => (
          <Card
            key={j.title}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5 shadow-soft sm:flex sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{j.title}</p>
              <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{j.dept}</Badge>
                <Badge variant="outline">{j.location}</Badge>
                <Badge variant="outline">{j.type}</Badge>
              </p>
            </div>
            <Button variant="outline" onClick={() => toast.success(`Application form for ${j.title} (demo)`)}>
              Apply
            </Button>
          </Card>
        ))}
      </div>
    </PublicPage>
  );
}
