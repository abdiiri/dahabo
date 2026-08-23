import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { invoices } from "@/data/mock";

export const Route = createFileRoute("/portal/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices | Dahabo Customer Portal" },
      { name: "description", content: "Download invoices, check due dates and settle outstanding balances." },
      { property: "og:title", content: "Invoices | Dahabo Customer Portal" },
      { property: "og:description", content: "Download invoices, check due dates and settle outstanding balances." },
    ],
  }),
  component: Page,
});

type Row = (typeof invoices)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "Invoice" },
    { key: "shipment", header: "Shipment" },
    { key: "issued", header: "Issued" },
    { key: "due", header: "Due" },
    { key: "amount", header: "Amount", render: (r) => `KES ${r.amount.toLocaleString()}` },
    { key: "status", header: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Portal', 'Invoices']} title="Invoices" description="Billing history and outstanding balances." actions={<Button>New record</Button>} />
      
      <DataTable data={invoices as Row[]} columns={columns} exportFilename="invoices" />
    </>
  );
}
