import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { listCustomers } from "@/lib/api/customers";
import type { Customer } from "@/lib/api/types";

export const Route = createFileRoute("/staff/customers")({
  head: () => ({
    meta: [
      { title: "Customers | Dahabo Staff Portal" },
      { name: "description", content: "Manage customer accounts, contacts, and billing status across the network." },
      { property: "og:title", content: "Customers | Dahabo Staff Portal" },
      { property: "og:description", content: "Manage customer accounts, contacts, and billing status across the network." },
    ],
  }),
  component: Page,
});

const columns: Column<Customer>[] = [
  { key: "customerCode", header: "ID" },
  { key: "name", header: "Customer" },
  { key: "contact", header: "Contact" },
  { key: "email", header: "Email" },
  { key: "tier", header: "Tier" },
  { key: "outstanding", header: "Outstanding", render: (r) => `KES ${r.outstanding.toLocaleString()}` },
  { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
];

function Page() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);

  useEffect(() => {
    let active = true;
    listCustomers().then((rows) => active && setCustomers(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Customers"]} title="Customers" description="Accounts and billing contacts." actions={<Button>New record</Button>} />

      {customers === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Users className="size-8" />
          <p className="text-sm font-medium text-foreground">No customers yet</p>
          <p className="max-w-sm text-xs">Customers you add will show up here.</p>
        </div>
      ) : (
        <DataTable data={customers} columns={columns} />
      )}
    </>
  );
}
