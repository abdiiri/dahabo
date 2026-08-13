import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { AddMaintenanceRecordDialog } from "@/components/staff/AddMaintenanceRecordDialog";
import { listMaintenanceRecords } from "@/lib/api/maintenance-records";
import type { MaintenanceRecord } from "@/lib/api/types";

export const Route = createFileRoute("/staff/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance | Dahabo Staff Portal" },
      { name: "description", content: "Vehicle servicing and repair records." },
    ],
  }),
  component: Page,
});

const columns: Column<MaintenanceRecord>[] = [
  { key: "vehicleLabel", header: "Vehicle", render: (r) => r.vehicleLabel ?? "—" },
  { key: "description", header: "Description" },
  { key: "vendor", header: "Vendor", render: (r) => r.vendor ?? "—" },
  { key: "cost", header: "Cost", render: (r) => `KSh ${r.cost.toLocaleString()}` },
  { key: "serviceDate", header: "Service date", render: (r) => new Date(r.serviceDate).toLocaleDateString() },
  {
    key: "nextServiceDate",
    header: "Next service",
    render: (r) => (r.nextServiceDate ? new Date(r.nextServiceDate).toLocaleDateString() : "—"),
  },
];

function Page() {
  const [records, setRecords] = useState<MaintenanceRecord[] | null>(null);

  useEffect(() => {
    let active = true;
    listMaintenanceRecords().then((rows) => active && setRecords(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Maintenance"]}
        title="Maintenance"
        description="Servicing and repair records, per vehicle."
        actions={<AddMaintenanceRecordDialog onCreated={(r) => setRecords((rows) => [r, ...(rows ?? [])])} />}
      />

      {records === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={records} columns={columns} searchPlaceholder="Search maintenance records…" />
      )}
    </>
  );
}
