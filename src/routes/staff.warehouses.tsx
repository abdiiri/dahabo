import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { listWarehouses, type Warehouse } from "@/lib/api/warehouses";

export const Route = createFileRoute("/staff/warehouses")({
  head: () => ({
    meta: [
      { title: "Warehouses | Dahabo Staff Portal" },
      { name: "description", content: "Storage facilities, dock counts, managers and live capacity utilisation." },
      { property: "og:title", content: "Warehouses | Dahabo Staff Portal" },
      { property: "og:description", content: "Storage facilities, dock counts, managers and live capacity utilisation." },
    ],
  }),
  component: Page,
});

const columns: Column<Warehouse>[] = [
  { key: "warehouseCode", header: "ID" },
  { key: "name", header: "Facility" },
  { key: "city", header: "City", render: (r) => r.city ?? "—" },
  { key: "sizeSqm", header: "Area (sqm)", render: (r) => r.sizeSqm ?? "—" },
  { key: "dockCount", header: "Docks", render: (r) => r.dockCount ?? "—" },
  { key: "managerName", header: "Manager", render: (r) => r.managerName ?? "—" },
  { key: "capacityPct", header: "Capacity", render: (r) => (r.capacityPct != null ? `${r.capacityPct}%` : "—") },
];

function Page() {
  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null);

  useEffect(() => {
    let active = true;
    listWarehouses().then((rows) => active && setWarehouses(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Warehouses"]} title="Warehouses" description="Facilities, docks and live capacity." />

      {warehouses === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={warehouses} columns={columns} searchPlaceholder="Search warehouses…" />
      )}
    </>
  );
}
