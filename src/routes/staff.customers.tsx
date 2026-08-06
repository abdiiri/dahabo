import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { customersData } from "@/data/mock";

export const Route = createFileRoute("/staff/customers")({
  head: () => ({
    meta: [
      { title: "Customers | Dahabo Staff Portal" },
      { name: "description", content: "Corporate accounts, tiers, shipment volumes and outstanding balances." },
      { property: "og:title", content: "Customers | Dahabo Staff Portal" },
      { property: "og:description", content: "Corporate accounts, tiers, shipment volumes and outstanding balances." },
    ],
  }),
  component: Page,
});

type Row = (typeof customersData)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Customer" },
    { key: "contact", header: "Contact" },
    { key: "email", header: "Email" },
    { key: "tier", header: "Tier" },
    { key: "shipments", header: "Shipments" },
    { key: "outstanding", header: "Outstanding", render: (r) => `KES ${r.outstanding.toLocaleString()}` },
    { key: "status", header: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Staff', 'Customers']} title="Customers" description="Corporate accounts and their commercial standing." actions={<Button>New record</Button>} />
      
      <DataTable data={customersData as Row[]} columns={columns} />
    </>
  );
}
