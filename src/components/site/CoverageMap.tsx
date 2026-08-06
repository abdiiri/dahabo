import { MapPin, Navigation, Route as RouteIcon, Satellite, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { coverageBranches, coverageRoutes } from "@/data/site";

export function CoverageMap() {
  return (
    <Card className="overflow-hidden p-0 shadow-lift">
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="hero-navy surface-grid relative min-h-[420px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-navy-foreground">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Coverage</p>
              <p className="mt-1 text-lg font-bold">Kenya & East Africa network</p>
            </div>
            <Badge className="border-0 bg-white/10 text-gold">Google Maps ready</Badge>
          </div>

          <div className="relative mt-6 h-[300px] rounded-xl border border-white/15 bg-white/5">
            {/* Route lines */}
            <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {[
                [52, 44, 78, 74],
                [52, 44, 39, 37],
                [39, 37, 27, 26],
                [39, 37, 22, 40],
                [52, 44, 74, 40],
              ].map(([x1, y1, x2, y2], i) => (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  className="text-gold/60"
                  strokeWidth="0.4"
                  strokeDasharray="2 1.5"
                />
              ))}
            </svg>
            {coverageBranches.map((b) => (
              <div
                key={b.city}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
              >
                <span className="absolute inset-0 -m-3 animate-ping rounded-full bg-gold/25" aria-hidden="true" />
                <span className="relative grid size-6 place-items-center rounded-full bg-gold text-gold-foreground shadow-lift">
                  <MapPin className="size-3.5" />
                </span>
                <span className="pointer-events-none absolute left-1/2 top-7 w-max -translate-x-1/2 rounded-md bg-background/95 px-2 py-1 text-[11px] font-semibold text-foreground opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
                  {b.city} — {b.role}
                </span>
              </div>
            ))}
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-widest text-navy-foreground/50">
              Interactive map placeholder
            </p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold">
              <RouteIcon className="size-4 text-gold" /> Main routes
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {coverageRoutes.map((r) => (
                <li key={r} className="flex gap-2">
                  <Navigation className="mt-0.5 size-3.5 shrink-0 text-gold" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-bold">
              <Warehouse className="size-4 text-gold" /> Warehouses
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Nairobi (12,000 sqm), Mombasa (6,000 sqm), Nakuru and Kisumu cross-dock facilities.
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Satellite className="size-4 text-gold" /> Future GPS layer
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Live vehicle positions, geofenced branches and ETA overlays will render on this map.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
