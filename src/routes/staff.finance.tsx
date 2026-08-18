import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  MoreHorizontal,
  Trash2,
  Wallet,
  HandCoins,
  PiggyBank,
  Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AddCustomerTransactionDialog } from "@/components/staff/AddCustomerTransactionDialog";
import { RecordPaymentDialog } from "@/components/staff/RecordPaymentDialog";
import { listInvoices, type Invoice } from "@/lib/api/invoices";
import { listCustomers } from "@/lib/api/customers";
import {
  listCustomerTransactions,
  deleteCustomerTransaction,
  getTransactionStatus,
  remainingBalance,
} from "@/lib/api/customer-transactions";
import type {
  Customer,
  CustomerTransaction,
  CustomerTransactionStatus,
  CustomerTransactionType,
} from "@/lib/api/types";
import {
  CUSTOMER_TRANSACTION_MODE_LABELS,
  CUSTOMER_TRANSACTION_STATUS_LABELS,
  CUSTOMER_TRANSACTION_TYPE_LABELS,
} from "@/lib/api/types";
import { usePermissions } from "@/lib/permissions";

type FinanceSearch = {
  tab?: "invoices" | "ledger" | undefined;
  customer?: string | undefined;
};

export const Route = createFileRoute("/staff/finance")({
  head: () => ({
    meta: [
      { title: "Finance | Dahabo Staff Portal" },
      { name: "description", content: "Invoices, receivables and the customer debt ledger." },
      { property: "og:title", content: "Finance | Dahabo Staff Portal" },
      {
        property: "og:description",
        content: "Invoices, receivables and the customer debt ledger.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): FinanceSearch => {
    const rawTab = search["tab"];
    const rawCustomer = search["customer"];
    return {
      tab: rawTab === "ledger" ? "ledger" : rawTab === "invoices" ? "invoices" : undefined,
      customer: typeof rawCustomer === "string" ? rawCustomer : undefined,
    };
  },
  component: Page,
});

const INVOICE_STATUS_LABELS: Record<Invoice["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const invoiceColumns: Column<Invoice>[] = [
  { key: "invoiceCode", header: "Invoice" },
  { key: "customerName", header: "Customer", render: (r) => r.customerName ?? "—" },
  {
    key: "issuedDate",
    header: "Issued",
    render: (r) => new Date(r.issuedDate).toLocaleDateString(),
  },
  {
    key: "dueDate",
    header: "Due",
    render: (r) => (r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"),
  },
  { key: "amount", header: "Amount", render: (r) => `KSh ${r.amount.toLocaleString()}` },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusPill status={INVOICE_STATUS_LABELS[r.status]} />,
  },
];

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { can } = usePermissions();
  const canEdit = can("customers", "edit");
  const canDelete = can("customers", "delete");

  const [tab, setTab] = useState<"invoices" | "ledger">(search.tab ?? "invoices");
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [transactions, setTransactions] = useState<CustomerTransaction[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerFilter, setCustomerFilter] = useState<string>(search.customer ?? "all");
  const [typeFilter, setTypeFilter] = useState<"all" | CustomerTransactionType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CustomerTransactionStatus>("all");
  const [paying, setPaying] = useState<CustomerTransaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listInvoices().then((rows) => active && setInvoices(rows));
    listCustomers().then((rows) => active && setCustomers(rows));
    listCustomerTransactions().then((rows) => active && setTransactions(rows));
    return () => {
      active = false;
    };
  }, []);

  // Arriving from a link on the Customers tab (?tab=ledger&customer=<id>).
  useEffect(() => {
    if (search.tab) setTab(search.tab);
    if (search.customer) setCustomerFilter(search.customer);
  }, [search.tab, search.customer]);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [customers]);

  const ledgerRows = useMemo(() => {
    let rows = transactions ?? [];
    if (customerFilter !== "all") rows = rows.filter((t) => t.customerId === customerFilter);
    if (typeFilter !== "all") rows = rows.filter((t) => t.type === typeFilter);
    if (statusFilter !== "all") rows = rows.filter((t) => getTransactionStatus(t) === statusFilter);
    return rows;
  }, [transactions, customerFilter, typeFilter, statusFilter]);

  // Totals reflect whatever filters are active, so the numbers always match what's in the table below.
  const ledgerStats = useMemo(() => {
    const debtRows = ledgerRows.filter((t) => t.type === "debt");
    const totalOutstanding = debtRows.reduce((sum, t) => sum + remainingBalance(t), 0);
    const totalExtra = ledgerRows
      .filter((t) => t.type === "extra")
      .reduce((sum, t) => sum + t.amount, 0);
    const customersOwing = new Set(
      debtRows.filter((t) => remainingBalance(t) > 0).map((t) => t.customerId),
    ).size;
    return { totalOutstanding, totalExtra, customersOwing };
  }, [ledgerRows]);

  function goToTab(next: "invoices" | "ledger") {
    setTab(next);
    navigate({ search: (prev) => ({ ...prev, tab: next }) });
  }

  async function handleDeleteEntry() {
    if (!deletingId) return;
    if (!canDelete) {
      toast.error("You don't have permission to delete ledger entries");
      setDeletingId(null);
      return;
    }
    setBusyId(deletingId);
    try {
      await deleteCustomerTransaction(deletingId);
      setTransactions((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      // The deleted entry may have been reducing a customer's outstanding
      // balance — refresh so the Customers tab stays accurate.
      listCustomers().then(setCustomers);
      toast.success("Entry removed");
    } catch (err) {
      toast.error("Couldn't remove this entry", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const ledgerColumns: Column<CustomerTransaction>[] = [
    {
      key: "customerName",
      header: "Customer",
      render: (r) => (
        <span className="font-medium">
          {r.customerName ?? customerNameById.get(r.customerId) ?? "—"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r) => {
        const isDebt = r.type === "debt";
        return (
          <span className="inline-flex items-center gap-2 text-sm">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full",
                isDebt ? "bg-destructive/12 text-destructive" : "bg-success/12 text-success",
              )}
            >
              {isDebt ? <HandCoins className="size-3.5" /> : <PiggyBank className="size-3.5" />}
            </span>
            <span className="font-medium">{CUSTOMER_TRANSACTION_TYPE_LABELS[r.type]}</span>
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      render: (r) => {
        const remaining = remainingBalance(r);
        return (
          <div className="flex flex-col">
            <span className="font-semibold tabular-nums">KSh {r.amount.toLocaleString()}</span>
            {r.type === "debt" && r.amountPaid > 0 ? (
              <span className="text-xs text-muted-foreground">
                {remaining > 0
                  ? `KSh ${remaining.toLocaleString()} still owed`
                  : "Fully paid back"}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "mode",
      header: "Mode",
      render: (r) => CUSTOMER_TRANSACTION_MODE_LABELS[r.mode],
    },
    {
      key: "date",
      header: "Date",
      render: (r) => (
        <div className="flex flex-col text-sm">
          <span>{new Date(r.date).toLocaleDateString()}</span>
          {r.type === "debt" && r.paidDate ? (
            <span className="text-xs text-muted-foreground">
              Paid {new Date(r.paidDate).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "id",
      header: "Status",
      className: "w-px",
      render: (r) => (
        <StatusPill status={CUSTOMER_TRANSACTION_STATUS_LABELS[getTransactionStatus(r)]} />
      ),
    },
    {
      key: "id",
      header: "",
      className: "w-10",
      render: (r) => {
        const status = getTransactionStatus(r);
        const canPay = r.type === "debt" && status !== "settled";
        return (
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
              {canEdit && canPay ? (
                <DropdownMenuItem onSelect={() => setPaying(r)}>
                  <Wallet className="size-4" /> Record payment
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  onSelect={() => setDeletingId(r.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Finance"]}
        title="Finance"
        description="Invoices, receivables, and the customer debt ledger."
        actions={
          tab === "ledger" && canEdit ? (
            <AddCustomerTransactionDialog
              onCreated={(row) => {
                setTransactions((rows) => [row, ...(rows ?? [])]);
                listCustomers().then(setCustomers);
              }}
            />
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={(v) => goToTab(v as "invoices" | "ledger")}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="ledger">Customer Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          {invoices === null ? (
            <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <DataTable
              data={invoices}
              columns={invoiceColumns}
              searchPlaceholder="Search invoices…"
            />
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-4 space-y-4">
          {transactions === null ? (
            <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Total outstanding"
                  value={`KSh ${ledgerStats.totalOutstanding.toLocaleString()}`}
                  icon={HandCoins}
                  tone={ledgerStats.totalOutstanding > 0 ? "danger" : "default"}
                />
                <StatCard
                  label="Extra / advance balance"
                  value={`KSh ${ledgerStats.totalExtra.toLocaleString()}`}
                  icon={PiggyBank}
                  tone="success"
                />
                <StatCard
                  label="Customers owing"
                  value={String(ledgerStats.customersOwing)}
                  icon={UsersIcon}
                  tone={ledgerStats.customersOwing > 0 ? "warning" : "default"}
                />
              </section>

              <DataTable
                data={ledgerRows}
                columns={ledgerColumns}
                searchPlaceholder="Search the ledger…"
                toolbar={
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={customerFilter}
                      onValueChange={(v) => {
                        setCustomerFilter(v);
                        navigate({
                          search: (prev) => ({ ...prev, customer: v === "all" ? undefined : v }),
                        });
                      }}
                    >
                      <SelectTrigger className="w-[170px]">
                        <SelectValue placeholder="All customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All customers</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={typeFilter}
                      onValueChange={(v) => setTypeFilter(v as "all" | CustomerTransactionType)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {(
                          Object.keys(CUSTOMER_TRANSACTION_TYPE_LABELS) as CustomerTransactionType[]
                        ).map((t) => (
                          <SelectItem key={t} value={t}>
                            {CUSTOMER_TRANSACTION_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={statusFilter}
                      onValueChange={(v) =>
                        setStatusFilter(v as "all" | CustomerTransactionStatus)
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {(
                          Object.keys(
                            CUSTOMER_TRANSACTION_STATUS_LABELS,
                          ) as CustomerTransactionStatus[]
                        ).map((s) => (
                          <SelectItem key={s} value={s}>
                            {CUSTOMER_TRANSACTION_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                }
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <RecordPaymentDialog
        entry={paying}
        onClose={() => setPaying(null)}
        onSaved={(updated) => {
          setTransactions((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          listCustomers().then(setCustomers);
          setPaying(null);
        }}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this ledger entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves it to the Recycle Bin and re-totals the customer's outstanding balance. It
              can be restored later from there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
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
