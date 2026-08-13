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
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/common/StatusPill";
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

  useEffect(() => {
    let active = true;
    listDrivers().then((rows) => active && setDrivers(rows));
    listStaff().then((rows) => active && setStaff(rows));
    listVehicles().then((rows) => active && setVehicles(rows));
    listTrips().then((rows) => active && setTrips(rows));
    listTransportOrders().then((rows) => active && setOrders(rows));
    listVehicleProfitThisMonth().then((rows) => active && setProfit(rows));
    return () => {
      active = false;
    };
  }, []);

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

  return (
    <>
      <PageHeader breadcrumb={["Staff"]} title="Dashboard" description="Your fleet and team at a glance." />

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
              <RouteIcon className="size-4" /> Recent trips
            </h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/staff/trips">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {recentTrips.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No trips yet — start one from the Trips page.</p>
          ) : (
            <ul className="grid gap-2">
              {recentTrips.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.origin} → {t.destination}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.tripCode}
                      {t.driverName ? ` · ${t.driverName}` : ""}
                      {t.distanceKm != null ? ` · ${t.distanceKm.toLocaleString()} km` : ""}
                    </p>
                  </div>
                  <StatusPill status={TRIP_STATUS_LABELS[t.status]} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <ClipboardList className="size-4" /> Pending transport orders
            </h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/staff/transport-orders">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {pendingOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing pending — all caught up.</p>
          ) : (
            <ul className="grid gap-2">
              {pendingOrders.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.pickupLocation} → {o.destination}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.orderCode}
                      {o.customerName ? ` · ${o.customerName}` : ""}
                      {" · KSh "}{o.agreedAmount.toLocaleString()}
                    </p>
                  </div>
                  <StatusPill status={TRANSPORT_ORDER_STATUS_LABELS[o.status]} />
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
              <UserCog className="size-4" /> Drivers
            </h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/staff/drivers">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {drivers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No drivers added yet.</p>
          ) : (
            <ul className="grid gap-2">
              {drivers.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{d.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.driverCode}
                      {d.currentLocation ? ` · ${d.currentLocation}` : ""}
                    </p>
                  </div>
                  <StatusPill status={d.accountStatus === "suspended" ? "Suspended" : "Active"} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Users className="size-4" /> Staff
            </h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/staff/users">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {staff.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No staff added yet.</p>
          ) : (
            <ul className="grid gap-2">
              {staff.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <StatusPill status={s.status === "suspended" ? "Suspended" : "Active"} />
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
          <Button asChild size="sm" variant="outline">
            <Link to="/staff/transport-orders">
              <ClipboardList className="size-4" /> New transport order
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/staff/trips">
              <RouteIcon className="size-4" /> Start a trip
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/staff/fuel">
              <Fuel className="size-4" /> Log fuel
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/staff/drivers">
              <UserCog className="size-4" /> Assign work / cash advance
            </Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
