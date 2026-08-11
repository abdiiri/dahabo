import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Users, UserCog, Wallet, ClipboardList, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/common/StatusPill";
import { listDrivers } from "@/lib/api/drivers";
import { listStaff } from "@/lib/api/staff";
import type { Driver, StaffMember } from "@/lib/api/types";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Dahabo Staff Portal" },
      { name: "description", content: "Overview of drivers, staff and pending cash advances." },
    ],
  }),
  component: Page,
});

function Page() {
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [staff, setStaff] = useState<StaffMember[] | null>(null);

  useEffect(() => {
    let active = true;
    listDrivers().then((rows) => active && setDrivers(rows));
    listStaff().then((rows) => active && setStaff(rows));
    return () => {
      active = false;
    };
  }, []);

  const loading = drivers === null || staff === null;
  const activeDrivers = (drivers ?? []).filter((d) => d.accountStatus !== "suspended");
  const suspendedDrivers = (drivers ?? []).filter((d) => d.accountStatus === "suspended");
  const activeStaff = (staff ?? []).filter((s) => s.status !== "suspended");

  return (
    <>
      <PageHeader breadcrumb={["Staff"]} title="Dashboard" description="Your team at a glance." />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Drivers" value={String(drivers!.length)} icon={UserCog} />
            <StatCard label="Active drivers" value={String(activeDrivers.length)} icon={UserCog} />
            <StatCard label="Deactivated drivers" value={String(suspendedDrivers.length)} icon={UserCog} />
            <StatCard label="Staff" value={String(activeStaff.length)} icon={Users} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
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
              {drivers!.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No drivers added yet.</p>
              ) : (
                <ul className="grid gap-2">
                  {drivers!.slice(0, 5).map((d) => (
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
              {staff!.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No staff added yet.</p>
              ) : (
                <ul className="grid gap-2">
                  {staff!.slice(0, 5).map((s) => (
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
          </div>

          <Card className="gap-2 p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Wallet className="size-4" /> Cash advances & work
            </h2>
            <p className="text-sm text-muted-foreground">
              Open a driver's profile to assign work, hand them a cash advance, or see the location they last reported.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-1 w-fit">
              <Link to="/staff/drivers">
                <ClipboardList className="size-4" /> Go to drivers
              </Link>
            </Button>
          </Card>
        </>
      )}
    </>
  );
}
