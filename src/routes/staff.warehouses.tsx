import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { warehouses } from "@/data/mock";

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

type Row = (typeof warehouses)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Facility" },
    { key: "city", header: "City" },
    { key: "sqm", header: "Area (sqm)" },
    { key: "docks", header: "Docks" },
    { key: "manager", header: "Manager" },
    { key: "capacity", header: "Capacity", render: (r) => `${r.capacity}%` },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Staff', 'Warehouses']} title="Warehouses" description="Facilities, docks and live capacity." actions={<Button>New record</Button>} />
      
      <DataTable data={warehouses as Row[]} columns={columns} />
    </>
  );
}
