import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listInvoices, deleteInvoice, type Invoice } from "@/lib/api/invoices";

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

function Page() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listInvoices().then((rows) => active && setInvoices(rows));
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete() {
    if (!deletingId) return;
    const invoice = (invoices ?? []).find((r) => r.id === deletingId);
    setBusyId(deletingId);
    try {
      await deleteInvoice(deletingId);
      setInvoices((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success(`${invoice?.invoiceCode ?? "Invoice"} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this invoice", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<Invoice>[] = [
    { key: "invoiceCode", header: "Invoice" },
    { key: "customerName", header: "Customer", render: (r) => r.customerName ?? "—" },
    { key: "issuedDate", header: "Issued", render: (r) => new Date(r.issuedDate).toLocaleDateString() },
    { key: "dueDate", header: "Due", render: (r) => (r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—") },
    { key: "amount", header: "Amount", render: (r) => `KSh ${r.amount.toLocaleString()}` },
    { key: "status", header: "Status", render: (r) => <StatusPill status={STATUS_LABELS[r.status]} /> },
    {
      key: "id",
      header: "",
      className: "w-10",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={busyId === r.id}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onSelect={() => setDeletingId(r.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

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

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves it to the Recycle Bin, where it can be restored later or permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
