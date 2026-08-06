import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { payments } from "@/data/mock";

export const Route = createFileRoute("/portal/payments")({
  head: () => ({
    meta: [
      { title: "Payments | Dahabo Customer Portal" },
      { name: "description", content: "Payment history across M-Pesa, bank transfer, card and cheque." },
      { property: "og:title", content: "Payments | Dahabo Customer Portal" },
      { property: "og:description", content: "Payment history across M-Pesa, bank transfer, card and cheque." },
    ],
  }),
  component: Page,
});

type Row = (typeof payments)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "Reference" },
    { key: "invoice", header: "Invoice" },
    { key: "method", header: "Method" },
    { key: "date", header: "Date" },
    { key: "amount", header: "Amount", render: (r) => `KES ${r.amount.toLocaleString()}` },
    { key: "status", header: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Portal', 'Payments']} title="Payments" description="Settled and processing payments." actions={<Button>New record</Button>} />
      
      <DataTable data={payments as Row[]} columns={columns} />
    </>
  );
}
