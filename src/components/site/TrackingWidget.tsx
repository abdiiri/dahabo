import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  MapPin,
  Package,
  Search,
  Truck,
  UserRound,
  Weight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTracking, trackingStages } from "@/data/site";
import { cn } from "@/lib/utils";

type Mode = "tracking" | "reference" | "invoice";

const placeholders: Record<Mode, string> = {
  tracking: "e.g. DGL-102345",
  reference: "e.g. REF-88213",
  invoice: "e.g. INV-2026-0451",
};

export function TrackingWidget({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("tracking");
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "found" | "empty">("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setState("empty");
      return;
    }
    setState("loading");
    window.setTimeout(() => setState("found"), 900);
  };

  const t = mockTracking;

  return (
    <div className={cn("w-full", compact ? "" : "space-y-8")}>
      <Card className="border-border/70 p-5 shadow-lift sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">Track your shipment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search by tracking number, reference number or invoice number.
            </p>
          </div>
          <Badge className="border-0 bg-success/15 text-success">Live status · mock data</Badge>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-5">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
            <TabsTrigger value="tracking">Tracking No.</TabsTrigger>
            <TabsTrigger value="reference">Reference</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (state === "empty") setState("idle");
              }}
              placeholder={placeholders[mode]}
              aria-label="Shipment search"
              aria-invalid={state === "empty"}
              className={cn("h-13 pl-10 text-base", state === "empty" && "border-destructive")}
            />
          </div>
          <Button type="submit" size="lg" className="h-13 bg-gold px-8 text-gold-foreground hover:bg-gold/90">
            {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Track
          </Button>
        </form>
        {state === "empty" ? (
          <p className="mt-2 text-sm font-medium text-destructive">Enter a number to search.</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Try the demo number <button type="button" className="font-semibold text-gold underline-offset-2 hover:underline" onClick={() => setValue("DGL-102345")}>DGL-102345</button>
          </p>
        )}
      </Card>

      {state === "loading" ? (
        <Card className="space-y-4 p-6">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <Skeleton className="h-52 w-full" />
        </Card>
      ) : null}

      {state === "found" ? (
        <Card className="animate-fade-in overflow-hidden p-0 shadow-lift">
          <div className="hero-navy p-6 text-navy-foreground">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Shipment</p>
                <p className="mt-1 font-display text-2xl font-extrabold">{value || t.reference}</p>
                <p className="mt-1 text-sm text-navy-foreground/75">{t.service}</p>
              </div>
              <Badge className="border-0 bg-gold text-gold-foreground">In Transit</Badge>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [MapPin, "From", t.origin],
                [MapPin, "To", t.destination],
                [Clock3, "Estimated arrival", t.eta],
                [Truck, "Vehicle", t.vehicle],
              ].map(([I, label, val]) => {
                const Ico = I as typeof MapPin;
                return (
                  <div key={label as string} className="rounded-xl bg-white/10 p-3.5">
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-navy-foreground/60">
                      <Ico className="size-3.5 text-gold" />
                      {label as string}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{val as string}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <ol className="relative">
              {trackingStages.map((s, i) => {
                const done = i <= t.currentStage;
                const current = i === t.currentStage;
                const ev = t.events[i];
                return (
                  <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
                    {i < trackingStages.length - 1 ? (
                      <span
                        className={cn(
                          "absolute left-[13px] top-7 h-full w-0.5",
                          done ? "bg-success" : "bg-border",
                        )}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 bg-card",
                        done ? "border-success text-success" : "border-border text-muted-foreground",
                        current && "ring-4 ring-success/20",
                      )}
                    >
                      {done ? <CheckCircle2 className="size-4" /> : <Circle className="size-3" />}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={cn("font-semibold", !done && "text-muted-foreground")}>
                        {s.label}
                        {current ? (
                          <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold">
                            Current
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-muted-foreground">{ev ? `${ev.place} · ${ev.time}` : s.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Consignment</p>
                <dl className="mt-3 space-y-2.5 text-sm">
                  {[
                    [Weight, "Weight", t.weight],
                    [Package, "Packages", `${t.packages}`],
                    [UserRound, "Driver", t.driver],
                  ].map(([I, k, v]) => {
                    const Ico = I as typeof Weight;
                    return (
                      <div key={k as string} className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-muted-foreground">
                          <Ico className="size-4 text-gold" />
                          {k as string}
                        </dt>
                        <dd className="font-semibold">{v as string}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
              <div className="rounded-xl border border-dashed border-border bg-surface p-4">
                <p className="text-sm font-semibold">Live GPS map</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vehicle-level GPS tracking will render here once telematics integration goes live.
                </p>
                <div className="surface-grid mt-3 grid h-28 place-items-center rounded-lg bg-background text-xs text-muted-foreground">
                  Map placeholder
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
