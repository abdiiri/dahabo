import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/site/PublicPage";
import { SectionHeading } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/common/StatusPill";
import { fleetData } from "@/data/mock";
import fleetHeavy1 from "@/assets/fleet-heavy-1.jpg";
import fleetHeavy2 from "@/assets/fleet-heavy-2.jpg";
import fleetHeavy3 from "@/assets/fleet-heavy-3.jpg";

const fleetGallery = [
  { src: fleetHeavy1, alt: "Dahabo prime mover and trailer, KDX 183Z" },
  { src: fleetHeavy2, alt: "Dahabo prime mover hauling a multi-axle livestock trailer" },
  { src: fleetHeavy3, alt: "Dahabo prime mover and tautliner trailer, roadside" },
];

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Our Fleet — Trucks, Reefers & Tankers | Dahabo Logistics" },
      { name: "description", content: "46 GPS-tracked vehicles including prime movers, reefer trucks, flatbeds, tankers and last-mile vans." },
      { property: "og:title", content: "Our Fleet | Dahabo Global Logistics" },
      { property: "og:description", content: "GPS-tracked prime movers, reefers, flatbeds, tankers and vans." },
    ],
  }),
  component: Fleet,
});

function Fleet() {
  return (
    <PublicPage
      eyebrow="Fleet"
      title="A modern, telemetry-equipped fleet"
      description="Every vehicle streams position, fuel and temperature data to the command centre, with preventive maintenance scheduled by odometer and engine hours."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["46", "Vehicles in service"],
          ["18", "Reefer & cold-chain units"],
          ["100%", "GPS coverage"],
          ["4.2 yrs", "Average fleet age"],
        ].map(([v, l]) => (
          <Card key={l} className="gap-1 p-6 shadow-soft">
            <p className="font-display text-3xl font-extrabold text-primary">{v}</p>
            <p className="text-sm text-muted-foreground">{l}</p>
          </Card>
        ))}
      </div>

      <div className="mt-14">
        <SectionHeading eyebrow="On the road" title="Our fleet in action" />
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {fleetGallery.map((img) => (
            <div key={img.src} className="overflow-hidden rounded-xl shadow-soft">
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="aspect-4/3 size-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {fleetData.map((v) => (
          <Card key={v.id} className="card-lift gap-3 p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{v.plate}</p>
                <p className="text-sm text-muted-foreground">{v.type} · {v.capacity}</p>
              </div>
              <StatusPill status={v.status} />
            </div>
            <div className="mt-1 space-y-1.5 text-sm text-muted-foreground">
              <p>Odometer: <span className="text-foreground">{v.odometer}</span></p>
              <p>Next service: <span className="text-foreground">{v.nextService}</span></p>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Utilisation</span>
                <span>{v.utilisation}%</span>
              </div>
              <Progress value={v.utilisation} className="mt-1.5 h-2" />
            </div>
          </Card>
        ))}
      </div>
    </PublicPage>
  );
}
