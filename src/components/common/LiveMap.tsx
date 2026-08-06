import { Building2, Layers, MapPin, Navigation, Package, Truck } from "lucide-react";
import { mapMarkers } from "@/data/mock";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const iconFor: Record<string, typeof Truck> = {
  Vehicle: Truck,
  Warehouse: Building2,
  Customer: Building2,
  Destination: MapPin,
  Pickup: Package,
};

export function LiveMap({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "surface-grid relative isolate overflow-hidden rounded-2xl border border-border bg-surface",
        compact ? "h-[280px]" : "h-[420px]",
        className,
      )}
      role="img"
      aria-label="Live operations map placeholder — ready for Google Maps integration"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_60%_20%,color-mix(in_oklab,var(--color-gold)_14%,transparent),transparent_70%)]" />

      <svg className="absolute inset-0 size-full" aria-hidden>
        <path
          d="M 12% 22% Q 30% 40% 35% 45% T 74% 66%"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="2"
          strokeDasharray="7 6"
          opacity="0.8"
        />
        <path
          d="M 35% 45% Q 50% 30% 66% 20%"
          fill="none"
          stroke="var(--color-chart-4)"
          strokeWidth="2"
          strokeDasharray="7 6"
          opacity="0.7"
        />
      </svg>

      {mapMarkers.map((m) => {
        const Icon = iconFor[m.kind] ?? MapPin;
        return (
          <div
            key={m.id}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full border shadow-soft transition-transform group-hover:scale-110",
                m.kind === "Vehicle"
                  ? "border-gold/40 bg-gold text-gold-foreground"
                  : m.kind === "Warehouse"
                    ? "border-border bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-lg ring-1 ring-border group-hover:block">
              {m.label}
            </span>
          </div>
        );
      })}

      <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="gap-1.5">
          <Navigation className="size-3" /> Live view
        </Badge>
        <Badge variant="outline" className="gap-1.5 bg-card/80">
          <Layers className="size-3" /> Google Maps ready
        </Badge>
      </div>

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-xl bg-card/85 px-3 py-2 text-[11px] font-medium shadow-soft backdrop-blur">
        {["Vehicles", "Warehouses", "Customers", "Destinations", "Pickups", "Routes"].map((l) => (
          <span key={l} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full bg-gold" />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
