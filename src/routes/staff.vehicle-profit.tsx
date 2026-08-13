import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { listVehicleProfitThisMonth } from "@/lib/api/vehicle-profit";
import type { VehicleProfitMonth } from "@/lib/api/types";

export const Route = createFileRoute("/staff/vehicle-profit")({
  head: () => ({
    meta: [
      { title: "Vehicle Profit | Dahabo Staff Portal" },
      { name: "description", content: "Revenue minus fuel, maintenance and mileage pay, per vehicle, for the current month." },
    ],
  }),
  component: Page,
});

const money = (n: number) => `KSh ${n.toLocaleString()}`;

const columns: Column<VehicleProfitMonth>[] = [
  { key: "vehicleCode", header: "Vehicle", render: (r) => `${r.vehicleCode} · ${r.plateNumber}` },
  { key: "revenue", header: "Revenue", render: (r) => money(r.revenue) },
  { key: "fuelCost", header: "Fuel", render: (r) => `− ${money(r.fuelCost)}` },
  { key: "maintenanceCost", header: "Maintenance", render: (r) => `− ${money(r.maintenanceCost)}` },
  { key: "mileagePayments", header: "Mileage pay", render: (r) => `− ${money(r.mileagePayments)}` },
  {
    key: "netProfit",
    header: "Net profit",
    render: (r) => (
      <span className={r.netProfit >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
        {money(r.netProfit)}
      </span>
    ),
  },
];

function Page() {
  const [rows, setRows] = useState<VehicleProfitMonth[] | null>(null);

  useEffect(() => {
    let active = true;
    listVehicleProfitThisMonth().then((r) => active && setRows(r));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Vehicle Profit"]}
        title="Vehicle Profit"
        description="This month, per vehicle: revenue minus fuel, maintenance and mileage pay."
      />

      {rows === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={rows} columns={columns} searchPlaceholder="Search vehicles…" />
      )}
    </>
  );
}
