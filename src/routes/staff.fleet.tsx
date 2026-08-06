import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { fleetData } from "@/data/mock";

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

type Row = (typeof fleetData)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "ID" },
    { key: "plate", header: "Plate" },
    { key: "type", header: "Type" },
    { key: "capacity", header: "Capacity" },
    { key: "driver", header: "Driver" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
    { key: "odometer", header: "Odometer" },
    { key: "nextService", header: "Next service" },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Staff', 'Fleet']} title="Fleet" description="Vehicle register and maintenance schedule." actions={<Button>New record</Button>} />
      
      <DataTable data={fleetData as Row[]} columns={columns} />
    </>
  );
}
