import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2, Truck, UserCog, Users, UserCheck, ClipboardList, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusPill } from "@/components/common/StatusPill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddDriverDialog } from "@/components/staff/AddDriverDialog";
import { AddVehicleDialog } from "@/components/staff/AddVehicleDialog";
import { AddStaffDialog } from "@/components/staff/AddStaffDialog";
import { listDrivers } from "@/lib/api/drivers";
import { listVehicles } from "@/lib/api/vehicles";
import { listStaff } from "@/lib/api/staff";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  DRIVER_STATUS_LABELS,
  STAFF_ROLE_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  type Driver,
  type StaffMember,
  type Vehicle,
} from "@/lib/api/types";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Dahabo Staff Portal" },
      { name: "description", content: "Live counts of drivers, vehicles and staff from your connected database." },
      { property: "og:title", content: "Dashboard | Dahabo Staff Portal" },
      { property: "og:description", content: "Live counts of drivers, vehicles and staff from your connected database." },
    ],
  }),
  component: Page,
});

const chartColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "10px",
  color: "var(--color-popover-foreground)",
  fontSize: 12,
};

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="gap-3 p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function countBy<T>(rows: T[], key: (row: T) => string): { name: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

function Page() {
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [staff, setStaff] = useState<StaffMember[] | null>(null);

  useEffect(() => {
    let active = true;
    listDrivers().then((rows) => active && setDrivers(rows));
    listVehicles().then((rows) => active && setVehicles(rows));
    listStaff().then((rows) => active && setStaff(rows));
    return () => {
      active = false;
    };
  }, []);

  const loading = drivers === null || vehicles === null || staff === null;

  const stats = useMemo(() => {
    if (!drivers || !vehicles || !staff) return [];
    const driversAvailable = drivers.filter((d) => d.status === "available").length;
    const driversOnRoute = drivers.filter((d) => d.status === "on_route").length;
    const vehiclesActive = vehicles.filter((v) => v.status === "active").length;
    const vehiclesMaintenance = vehicles.filter((v) => v.status === "maintenance").length;
    return [
      { label: "Total Drivers", value: String(drivers.length), icon: UserCog },
      { label: "Drivers Available", value: String(driversAvailable), icon: UserCheck, tone: "success" as const },
      { label: "Drivers On Route", value: String(driversOnRoute), icon: Truck },
      { label: "Total Vehicles", value: String(vehicles.length), icon: Truck },
      { label: "Vehicles Active", value: String(vehiclesActive), icon: Truck, tone: "success" as const },
      { label: "In Maintenance", value: String(vehiclesMaintenance), icon: Truck, tone: vehiclesMaintenance > 0 ? "warning" as const : "default" as const },
      { label: "Staff Accounts", value: String(staff.length), icon: Users },
    ];
  }, [drivers, vehicles, staff]);

  const vehiclesByType = useMemo(() => {
    if (!vehicles) return [];
    return countBy(vehicles, (v) => VEHICLE_TYPE_LABELS[v.type]);
  }, [vehicles]);

  const driversByStatus = useMemo(() => {
    if (!drivers) return [];
    return countBy(drivers, (d) => DRIVER_STATUS_LABELS[d.status]);
  }, [drivers]);

  const recentDrivers = useMemo(
    () => [...(drivers ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [drivers],
  );
  const recentVehicles = useMemo(
    () => [...(vehicles ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [vehicles],
  );

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Dashboard"]}
        title="Dashboard"
        description={
          isSupabaseConfigured
            ? "Live counts from your connected Supabase database."
            : "Local demo mode — connect Supabase to see your real data here (see docs/SUPABASE_SETUP.md)."
        }
        actions={
          <>
            <AddDriverDialog onCreated={() => { listDrivers().then(setDrivers); }} />
            <AddVehicleDialog onCreated={() => { listVehicles().then(setVehicles); }} />
          </>
        }
      />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {drivers!.length === 0 && vehicles!.length === 0 && staff!.length <= 1 ? (
            <Card className="gap-3 p-8 text-center shadow-soft">
              <ClipboardList className="mx-auto size-8 text-muted-foreground" />
              <h2 className="text-lg font-bold">Your database is empty — that's expected</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Start by adding your first driver or vehicle. Every number on this dashboard reflects your real
                data — nothing here is sample content.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <AddDriverDialog onCreated={() => { listDrivers().then(setDrivers); }} />
                <AddVehicleDialog onCreated={() => { listVehicles().then(setVehicles); }} />
                <AddStaffDialog onCreated={() => { listStaff().then(setStaff); }} />
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel
                title="Recently added drivers"
                action={
                  <Link to="/staff/drivers" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-gold">
                    View all <ArrowRight className="size-3.5" />
                  </Link>
                }
              >
                {recentDrivers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No drivers added yet.</p>
                ) : (
                  recentDrivers.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{d.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{d.driverCode} · {d.phone}</p>
                      </div>
                      <StatusPill status={DRIVER_STATUS_LABELS[d.status]} />
                    </div>
                  ))
                )}
              </Panel>

              <Panel
                title="Recently added vehicles"
                action={
                  <Link to="/staff/fleet" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-gold">
                    View all <ArrowRight className="size-3.5" />
                  </Link>
                }
              >
                {recentVehicles.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No vehicles added yet.</p>
                ) : (
                  recentVehicles.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{v.plateNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">{v.vehicleCode} · {VEHICLE_TYPE_LABELS[v.type]}</p>
                      </div>
                      <StatusPill status={VEHICLE_STATUS_LABELS[v.status]} />
                    </div>
                  ))
                )}
              </Panel>

              {vehiclesByType.length > 0 && (
                <Panel title="Fleet by vehicle type">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={vehiclesByType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                        {vehiclesByType.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </Panel>
              )}

              {driversByStatus.length > 0 && (
                <Panel title="Drivers by status">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={driversByStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} stroke="var(--color-muted-foreground)" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>
              )}

              <Panel
                title="Staff accounts"
                action={
                  <Link to="/staff/users" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-gold">
                    View all <ArrowRight className="size-3.5" />
                  </Link>
                }
              >
                {staff!.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No staff accounts yet.</p>
                ) : (
                  staff!.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{s.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.staffCode} · {STAFF_ROLE_LABELS[s.role]}</p>
                      </div>
                    </div>
                  ))
                )}
              </Panel>
            </div>
          )}
        </>
      )}
    </>
  );
}
