import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { AddFuelRecordDialog } from "@/components/staff/AddFuelRecordDialog";
import { listFuelRecords } from "@/lib/api/fuel-records";
import type { FuelRecord } from "@/lib/api/types";

export const Route = createFileRoute("/staff/fuel")({
  head: () => ({
    meta: [
      { title: "Fuel | Dahabo Staff Portal" },
      { name: "description", content: "Fuel purchases per vehicle." },
    ],
  }),
  component: Page,
});

const columns: Column<FuelRecord>[] = [
  { key: "vehicleLabel", header: "Vehicle", render: (r) => r.vehicleLabel ?? "—" },
  { key: "liters", header: "Liters", render: (r) => r.liters.toLocaleString() },
  { key: "cost", header: "Cost", render: (r) => `KSh ${r.cost.toLocaleString()}` },
  { key: "odometerKm", header: "Odometer", render: (r) => (r.odometerKm != null ? `${r.odometerKm.toLocaleString()} km` : "—") },
  { key: "filledAt", header: "Date", render: (r) => new Date(r.filledAt).toLocaleDateString() },
];

function Page() {
  const [records, setRecords] = useState<FuelRecord[] | null>(null);

  useEffect(() => {
    let active = true;
    listFuelRecords().then((rows) => active && setRecords(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Fuel"]}
        title="Fuel"
        description="Fuel purchases, per vehicle."
        actions={<AddFuelRecordDialog onCreated={(r) => setRecords((rows) => [r, ...(rows ?? [])])} />}
      />

      {records === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={records} columns={columns} searchPlaceholder="Search fuel records…" />
      )}
    </>
  );
}
