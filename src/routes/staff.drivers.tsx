import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, UserCog } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { AddDriverDialog } from "@/components/staff/AddDriverDialog";
import { listDrivers } from "@/lib/api/drivers";
import { LICENSE_CLASS_LABELS, type Driver } from "@/lib/api/types";

export const Route = createFileRoute("/staff/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers | Dahabo Staff Portal" },
      { name: "description", content: "Driver roster, licences, work assignments and cash advances." },
      { property: "og:title", content: "Drivers | Dahabo Staff Portal" },
      { property: "og:description", content: "Driver roster, licences, work assignments and cash advances." },
    ],
  }),
  component: Page,
});

const columns: Column<Driver>[] = [
  { key: "driverCode", header: "Company ID" },
  { key: "fullName", header: "Driver" },
  { key: "phone", header: "Phone" },
  { key: "licenseNumber", header: "Licence" },
  { key: "licenseClass", header: "Class", render: (r) => LICENSE_CLASS_LABELS[r.licenseClass] },
  {
    key: "currentLocation",
    header: "Last known location",
    render: (r) =>
      r.currentLocation ? (
        <span>
          {r.currentLocation}
          {r.locationUpdatedAt ? (
            <span className="ml-1.5 text-xs text-muted-foreground">
              · {new Date(r.locationUpdatedAt).toLocaleDateString()}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  { key: "status", header: "Account", render: (r) => <StatusPill status={r.accountStatus === "suspended" ? "Suspended" : "Active"} /> },
];

function Page() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[] | null>(null);

  useEffect(() => {
    let active = true;
    listDrivers().then((rows) => active && setDrivers(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Drivers"]}
        title="Drivers"
        description="Roster, licences, work assignments and cash advances."
        actions={<AddDriverDialog onCreated={(d) => setDrivers((rows) => [d, ...(rows ?? [])])} />}
      />

      {drivers === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <UserCog className="size-8" />
          <p className="text-sm font-medium text-foreground">No drivers yet</p>
          <p className="max-w-sm text-xs">Add your first driver to assign work and cash advances.</p>
        </div>
      ) : (
        <DataTable
          data={drivers}
          columns={columns}
          onRowClick={(row) => navigate({ to: "/staff/drivers/$driverId", params: { driverId: row.id } })}
        />
      )}
    </>
  );
}
