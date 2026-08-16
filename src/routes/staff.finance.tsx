import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { listInvoices, type Invoice } from "@/lib/api/invoices";

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

const STATUS_LABELS: Record<Invoice["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const columns: Column<Invoice>[] = [
  { key: "invoiceCode", header: "Invoice" },
  { key: "customerName", header: "Customer", render: (r) => r.customerName ?? "—" },
  { key: "issuedDate", header: "Issued", render: (r) => new Date(r.issuedDate).toLocaleDateString() },
  { key: "dueDate", header: "Due", render: (r) => (r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—") },
  { key: "amount", header: "Amount", render: (r) => `KSh ${r.amount.toLocaleString()}` },
  { key: "status", header: "Status", render: (r) => <StatusPill status={STATUS_LABELS[r.status]} /> },
];

function Page() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  useEffect(() => {
    let active = true;
    listInvoices().then((rows) => active && setInvoices(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Finance"]} title="Finance" description="Invoices and receivables." />

      {invoices === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={invoices} columns={columns} searchPlaceholder="Search invoices…" />
      )}
    </>
  );
}
