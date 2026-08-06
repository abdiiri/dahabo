import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { invoices } from "@/data/mock";

export const Route = createFileRoute("/staff/finance")({
  head: () => ({
    meta: [
      { title: "Finance | Dahabo Staff Portal" },
      { name: "description", content: "Invoices, receivables and payment status across all corporate accounts." },
      { property: "og:title", content: "Finance | Dahabo Staff Portal" },
      { property: "og:description", content: "Invoices, receivables and payment status across all corporate accounts." },
    ],
  }),
  component: Page,
});

type Row = (typeof invoices)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "Invoice" },
    { key: "customer", header: "Customer" },
    { key: "shipment", header: "Shipment" },
    { key: "issued", header: "Issued" },
    { key: "due", header: "Due" },
    { key: "amount", header: "Amount", render: (r) => `KES ${r.amount.toLocaleString()}` },
    { key: "status", header: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Staff', 'Finance']} title="Finance" description="Invoices and receivables." actions={<Button>New record</Button>} />
      
      <DataTable data={invoices as Row[]} columns={columns} />
    </>
  );
}
