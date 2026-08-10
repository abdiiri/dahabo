import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { AddDriverDialog } from "@/components/staff/AddDriverDialog";
import { listDrivers } from "@/lib/api/drivers";
import { DRIVER_STATUS_LABELS, LICENSE_CLASS_LABELS, type Driver } from "@/lib/api/types";

export const Route = createFileRoute("/staff/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers | Dahabo Staff Portal" },
      { name: "description", content: "Driver roster, licences, assigned vehicles, trips and ratings." },
      { property: "og:title", content: "Drivers | Dahabo Staff Portal" },
      { property: "og:description", content: "Driver roster, licences, assigned vehicles, trips and ratings." },
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
  { key: "assignedVehicle", header: "Vehicle" },
  { key: "baseBranch", header: "Base" },
  { key: "status", header: "Status", render: (r) => <StatusPill status={DRIVER_STATUS_LABELS[r.status]} /> },
  { key: "totalTrips", header: "Trips" },
  { key: "rating", header: "Rating" },
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
        description="Roster, licences, assignments and performance."
        actions={<AddDriverDialog onCreated={(d) => setDrivers((rows) => [d, ...(rows ?? [])])} />}
      />

      {drivers === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
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
