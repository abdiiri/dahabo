import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Loader2,
  Users,
  UserCog,
  ClipboardList,
  ArrowRight,
  Truck,
  Route as RouteIcon,
  TrendingUp,
  Fuel,
  AlertTriangle,
  RefreshCw,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  XCircle,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/common/StatusPill";
import { cn, getErrorMessage } from "@/lib/utils";
import { listDrivers } from "@/lib/api/drivers";
import { listStaff } from "@/lib/api/staff";
import { listVehicles } from "@/lib/api/vehicles";
import { listTrips } from "@/lib/api/trips";
import { listTransportOrders } from "@/lib/api/transport-orders";
import { listVehicleProfitThisMonth } from "@/lib/api/vehicle-profit";
import {
  TRIP_STATUS_LABELS,
  TRANSPORT_ORDER_STATUS_LABELS,
  type Driver,
  type StaffMember,
  type Vehicle,
  type Trip,
  type TransportOrder,
  type VehicleProfitMonth,
} from "@/lib/api/types";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Dahabo Staff Portal" },
      { name: "description", content: "Overview of the fleet, drivers, staff and pending work." },
    ],
  }),
  component: Page,
});

function Page() {
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [orders, setOrders] = useState<TransportOrder[] | null>(null);
  const [profit, setProfit] = useState<VehicleProfitMonth[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function load(onlyIfActive: () => boolean) {
    setError(null);
    // Promise.allSettled so one failing call can't leave the page stuck
    // spinning forever — every section gets its own real value or an empty
    // fallback, and any failure is shown instead of hidden.
    return Promise.allSettled([
      listDrivers(),
      listStaff(),
      listVehicles(),
      listTrips(),
      listTransportOrders(),
      listVehicleProfitThisMonth(),
    ]).then(([d, s, v, t, o, p]) => {
      if (!onlyIfActive()) return;
      setDrivers(d.status === "fulfilled" ? d.value : []);
      setStaff(s.status === "fulfilled" ? s.value : []);
      setVehicles(v.status === "fulfilled" ? v.value : []);
      setTrips(t.status === "fulfilled" ? t.value : []);
      setOrders(o.status === "fulfilled" ? o.value : []);
      setProfit(p.status === "fulfilled" ? p.value : []);
      const failed = [d, s, v, t, o, p].find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (failed) setError(getErrorMessage(failed.reason, "Some dashboard data couldn't be loaded."));
    });
  }

  useEffect(() => {
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, []);

  function handleManualRefresh() {
    setRefreshing(true);
    load(() => true).finally(() => setRefreshing(false));
  }

  const loading = drivers === null || staff === null || vehicles === null || trips === null || orders === null || profit === null;

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={["Staff"]} title="Dashboard" description="Your fleet and team at a glance." />
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </>
    );
  }

  const activeVehicles = vehicles.filter((v) => v.status === "active");
  const tripsInProgress = trips.filter((t) => t.status === "in_progress");
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "assigned");
  const netProfitThisMonth = profit.reduce((sum, p) => sum + p.netProfit, 0);
  const activeDrivers = drivers.filter((d) => d.accountStatus !== "suspended");
  const activeStaff = staff.filter((s) => s.status !== "suspended");
  const recentTrips = [...trips].slice(0, 5);

  const tripStatusMeta: Record<Trip["status"], { icon: typeof CircleDot; tone: string; iconClass: string }> = {
    scheduled: { icon: CalendarClock, tone: "bg-warning/12 text-warning", iconClass: "" },
    in_progress: { icon: CircleDot, tone: "bg-chart-4/15 text-chart-4", iconClass: "animate-pulse" },
    completed: { icon: CheckCircle2, tone: "bg-success/12 text-success", iconClass: "" },
    cancelled: { icon: XCircle, tone: "bg-destructive/12 text-destructive", iconClass: "" },
  };

  function initials(name: string) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }

  return (
    <>
      <PageHeader
        breadcrumb={["Staff"]}
        title="Dashboard"
        description="Your fleet and team at a glance."
        actions={
          <Button size="sm" variant="outline" onClick={handleManualRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card className="mb-6 flex-row items-center gap-3 border-destructive/30 bg-destructive/5 p-4 shadow-soft">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      ) : null}

      {/* Fleet snapshot — the numbers that matter day to day */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active vehicles" value={String(activeVehicles.length)} icon={Truck} tone="gold" />
        <StatCard label="Trips in progress" value={String(tripsInProgress.length)} icon={RouteIcon} tone="default" />
        <StatCard
          label="Net profit (this month)"
          value={`KSh ${netProfitThisMonth.toLocaleString()}`}
          icon={TrendingUp}
          tone={netProfitThisMonth >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Pending transport orders"
          value={String(pendingOrders.length)}
          icon={ClipboardList}
          tone={pendingOrders.length > 0 ? "warning" : "default"}
        />
      </section>

      {/* Recent activity — the actual workflow, front and center */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <RouteIcon className="size-3.5" />
              </span>
              Recent trips
            </h2>
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
              <Link to="/staff/trips">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {recentTrips.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <RouteIcon className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">No trips yet — start one from the Trips page.</p>
            </div>
          ) : (
            <ul className="-mx-2">
              {recentTrips.map((t, i) => {
                const meta = tripStatusMeta[t.status];
                const StatusIcon = meta.icon;
                return (
                  <li key={t.id}>
                    <Link
                      to="/staff/trips"
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/60",
                        i !== 0 && "border-t border-border/70",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full transition-transform group-hover:scale-105",
                          meta.tone,
                        )}
                      >
                        <StatusIcon className={cn("size-4", meta.iconClass)} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                          <span className="truncate">{t.origin}</span>
                          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{t.destination}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <span className="font-mono tracking-tight">{t.tripCode}</span>
                          {t.driverName ? (
                            <>
                              <span aria-hidden className="text-border">·</span>
                              <span className="flex items-center gap-1">
                                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-navy text-[9px] font-bold text-navy-foreground">
                                  {initials(t.driverName)}
                                </span>
                                {t.driverName}
                              </span>
                            </>
                          ) : null}
                          {t.startedAt ? (
                            <>
                              <span aria-hidden className="text-border">·</span>
                              <span>{new Date(t.startedAt).toLocaleDateString()}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <StatusPill status={TRIP_STATUS_LABELS[t.status]} className="shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="gap-4 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <ClipboardList className="size-3.5" />
              </span>
              Pending transport orders
            </h2>
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
              <Link to="/staff/transport-orders">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <ClipboardList className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">Nothing pending — all caught up.</p>
            </div>
          ) : (
            <ul className="-mx-2">
              {pendingOrders.slice(0, 5).map((o, i) => (
                <li key={o.id}>
                  <Link
                    to="/staff/transport-orders"
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/60",
                      i !== 0 && "border-t border-border/70",
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/18 text-gold transition-transform group-hover:scale-105">
                      <MapPin className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        <span className="truncate">{o.pickupLocation}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{o.destination}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <span className="font-mono tracking-tight">{o.orderCode}</span>
                        {o.customerName ? (
                          <>
                            <span aria-hidden className="text-border">·</span>
                            <span className="truncate">{o.customerName}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold tabular-nums">KSh {o.agreedAmount.toLocaleString()}</span>
                      <StatusPill status={TRANSPORT_ORDER_STATUS_LABELS[o.status]} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Team */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Drivers" value={String(drivers.length)} icon={UserCog} />
        <StatCard label="Active drivers" value={String(activeDrivers.length)} icon={UserCog} tone="success" />
        <StatCard label="Staff" value={String(activeStaff.length)} icon={Users} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <UserCog className="size-3.5" />
              </span>
              Drivers
            </h2>
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
              <Link to="/staff/drivers">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {drivers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No drivers added yet.</p>
          ) : (
            <ul className="-mx-2">
              {drivers.slice(0, 5).map((d, i) => (
                <li key={d.id}>
                  <Link
                    to="/staff/drivers"
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-secondary/60",
                      i !== 0 && "border-t border-border/70",
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-navy-foreground transition-transform group-hover:scale-105">
                      {initials(d.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{d.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.driverCode}
                        {d.currentLocation ? ` · ${d.currentLocation}` : ""}
                      </p>
                    </div>
                    <StatusPill
                      className="shrink-0"
                      status={d.accountStatus === "suspended" ? "Suspended" : "Active"}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <Users className="size-3.5" />
              </span>
              Staff
            </h2>
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
              <Link to="/staff/users">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {staff.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No staff added yet.</p>
          ) : (
            <ul className="-mx-2">
              {staff.slice(0, 5).map((s, i) => (
                <li key={s.id}>
                  <Link
                    to="/staff/users"
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-secondary/60",
                      i !== 0 && "border-t border-border/70",
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/18 text-xs font-bold text-gold transition-transform group-hover:scale-105">
                      {initials(s.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{s.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <StatusPill className="shrink-0" status={s.status === "suspended" ? "Suspended" : "Active"} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Quick actions */}
      <Card className="gap-3 p-6 shadow-soft">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="card-lift">
            <Link to="/staff/transport-orders">
              <ClipboardList className="size-4" /> New transport order
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="card-lift">
            <Link to="/staff/trips">
              <RouteIcon className="size-4" /> Start a trip
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="card-lift">
            <Link to="/staff/fuel">
              <Fuel className="size-4" /> Log fuel
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="card-lift">
            <Link to="/staff/drivers">
              <UserCog className="size-4" /> Assign work / cash advance
            </Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
