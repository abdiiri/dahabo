import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/site/PublicPage";
import { TrackingWidget } from "@/components/site/TrackingWidget";
import { Reveal } from "@/components/site/Reveal";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/site/Icon";
import { trackingStages } from "@/data/site";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Shipment — Dahabo Global Logistics" },
      {
        name: "description",
        content:
          "Track your Dahabo consignment by tracking number, reference number or invoice number and follow every milestone from pickup to delivery.",
      },
      { property: "og:title", content: "Track Your Shipment — Dahabo Global Logistics" },
      { property: "og:description", content: "Live milestone tracking from pickup through to delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  return (
    <PublicPage
      eyebrow="Track Shipment"
      title="Follow your cargo, milestone by milestone"
      description="Search using a tracking number, a customer reference or an invoice number. Status updates flow in from the control tower as the consignment moves."
    >
      <TrackingWidget />

      <Reveal className="mt-16 block">
        <h2 className="text-2xl font-extrabold">How a Dahabo shipment moves</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trackingStages.map((s, i) => (
            <Card key={s.key} className="card-lift gap-2 p-5">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-bold text-gold">
                  {i + 1}
                </span>
                <Icon name="ChevronRight" className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-1 font-bold">{s.label}</p>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </Card>
          ))}
        </div>
      </Reveal>
    </PublicPage>
  );
}
