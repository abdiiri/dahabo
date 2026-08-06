import { createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, Phone } from "lucide-react";
import { PublicPage } from "@/components/site/PublicPage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveMap } from "@/components/common/LiveMap";
import { branches } from "@/data/mock";

export const Route = createFileRoute("/branches")({
  head: () => ({
    meta: [
      { title: "Branches & Depots — Kenya, Uganda, Djibouti | Dahabo" },
      { name: "description", content: "Find Dahabo Global Logistics offices and depots in Nairobi, Mombasa, Kisumu, Eldoret, Kampala and Djibouti." },
      { property: "og:title", content: "Branches & Depots | Dahabo Global Logistics" },
      { property: "og:description", content: "Six regional offices across Kenya, Uganda and Djibouti." },
    ],
  }),
  component: Branches,
});

function Branches() {
  return (
    <PublicPage
      eyebrow="Network"
      title="Six branches across the regional corridors"
      description="Offices and depots positioned on the Northern and Central corridors, staffed by local teams with clearing authority."
    >
      <LiveMap />
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <Card key={b.name} className="card-lift gap-3 p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">{b.name}</h2>
              <Badge variant="secondary">{b.country}</Badge>
            </div>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold" /> {b.address}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4 shrink-0 text-gold" /> {b.phone}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0 text-gold" /> {b.hours}
            </p>
          </Card>
        ))}
      </div>
    </PublicPage>
  );
}
