import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { shipments } from "@/data/mock";

export const Route = createFileRoute("/portal/shipments")({
  head: () => ({
    meta: [
      { title: "My Shipments | Dahabo Customer Portal" },
      { name: "description", content: "All of your consignments with live status, ETA and assigned vehicle." },
      { property: "og:title", content: "My Shipments | Dahabo Customer Portal" },
      { property: "og:description", content: "All of your consignments with live status, ETA and assigned vehicle." },
    ],
  }),
  component: Page,
});

type Row = (typeof shipments)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "Waybill" },
    { key: "origin", header: "Origin" },
    { key: "destination", header: "Destination" },
    { key: "service", header: "Service" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
    { key: "eta", header: "ETA" },
    { key: "weight", header: "Weight" },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Portal', 'Shipments']} title="My shipments" description="Every consignment on your account." actions={<Button>New record</Button>} />
      
      <DataTable data={shipments as Row[]} columns={columns} />
    </>
  );
}
