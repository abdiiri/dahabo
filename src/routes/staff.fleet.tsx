import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { AddVehicleDialog } from "@/components/staff/AddVehicleDialog";
import { listVehicles } from "@/lib/api/vehicles";
import { VEHICLE_STATUS_LABELS, VEHICLE_TYPE_LABELS, type Vehicle } from "@/lib/api/types";

export const Route = createFileRoute("/staff/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet | Dahabo Staff Portal" },
      { name: "description", content: "Vehicle register, utilisation, odometer readings and maintenance schedule." },
      { property: "og:title", content: "Fleet | Dahabo Staff Portal" },
      { property: "og:description", content: "Vehicle register, utilisation, odometer readings and maintenance schedule." },
    ],
  }),
  component: Page,
});

const columns: Column<Vehicle>[] = [
  { key: "vehicleCode", header: "ID" },
  { key: "plateNumber", header: "Plate" },
  { key: "type", header: "Type", render: (r) => VEHICLE_TYPE_LABELS[r.type] },
  { key: "capacity", header: "Capacity" },
  { key: "status", header: "Status", render: (r) => <StatusPill status={VEHICLE_STATUS_LABELS[r.status]} /> },
  { key: "odometerKm", header: "Odometer", render: (r) => `${r.odometerKm.toLocaleString()} km` },
  { key: "nextServiceDate", header: "Next service" },
];

function Page() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);

  useEffect(() => {
    let active = true;
    listVehicles().then((rows) => active && setVehicles(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Fleet"]}
        title="Fleet"
        description="Vehicle register and maintenance schedule."
        actions={<AddVehicleDialog onCreated={(v) => setVehicles((rows) => [v, ...(rows ?? [])])} />}
      />

      {vehicles === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={vehicles} columns={columns} />
      )}
    </>
  );
}
