import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { shipments } from "@/data/mock";

export const Route = createFileRoute("/staff/shipments")({
  head: () => ({
    meta: [
      { title: "Shipments | Dahabo Staff Portal" },
      { name: "description", content: "Manage every consignment across the network with filters, bulk actions and export." },
      { property: "og:title", content: "Shipments | Dahabo Staff Portal" },
      { property: "og:description", content: "Manage every consignment across the network with filters, bulk actions and export." },
    ],
  }),
  component: Page,
});

type Row = (typeof shipments)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "Waybill" },
    { key: "customer", header: "Customer" },
    { key: "origin", header: "Origin" },
    { key: "destination", header: "Destination" },
    { key: "service", header: "Service" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
    { key: "eta", header: "ETA" },
    { key: "driver", header: "Driver" },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Staff', 'Shipments']} title="Shipments" description="Every consignment across the network." actions={<Button>New record</Button>} />
      
      <DataTable data={shipments as Row[]} columns={columns} />
    </>
  );
}
