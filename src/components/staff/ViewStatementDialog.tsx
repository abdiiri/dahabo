import { useEffect, useMemo, useState } from "react";
import { Printer, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/common/StatusPill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getTransactionStatus,
  remainingBalance,
} from "@/lib/api/customer-transactions";
import {
  CUSTOMER_TRANSACTION_MODE_LABELS,
  CUSTOMER_TRANSACTION_STATUS_LABELS,
  type Customer,
  type CustomerTransaction,
  type CustomerTransactionStatus,
} from "@/lib/api/types";
import logoMark from "@/assets/dahabo-logo-mark.png";

/** One row of the running-balance ledger rendered on the statement. */
type StatementRow = {
  transaction: CustomerTransaction;
  status: CustomerTransactionStatus;
  runningBalance: number;
};

/** Builds the chronological, running-balance view of a customer's full
 * ledger — every debt and every extra/advance payment, oldest first, each
 * annotated with the outstanding balance as of that entry. This is the
 * "smart" part: rather than just listing raw rows, it reconstructs the
 * account's balance history the way a real statement would. */
function buildStatementRows(transactions: CustomerTransaction[]): StatementRow[] {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  let balance = 0;
  return sorted.map((t) => {
    balance += t.type === "debt" ? remainingBalance(t) : 0;
    return { transaction: t, status: getTransactionStatus(t), runningBalance: balance };
  });
}

export function ViewStatementDialog({
  open,
  onClose,
  customers,
  transactions,
  initialCustomerId,
}: {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  transactions: CustomerTransaction[];
  initialCustomerId?: string | undefined;
}) {
  const [customerId, setCustomerId] = useState<string | undefined>(initialCustomerId);

  useEffect(() => {
    if (!open) return;
    setCustomerId(initialCustomerId ?? customers[0]?.id);
  }, [open, initialCustomerId, customers]);

  const customer = customers.find((c) => c.id === customerId);

  const rows = useMemo(() => {
    if (!customerId) return [];
    return buildStatementRows(transactions.filter((t) => t.customerId === customerId));
  }, [transactions, customerId]);

  const summary = useMemo(() => {
    const debts = rows.filter((r) => r.transaction.type === "debt");
    const totalIssued = debts.reduce((sum, r) => sum + r.transaction.amount, 0);
    const totalPaid = debts.reduce((sum, r) => sum + r.transaction.amountPaid, 0);
    const totalOutstanding = rows.length > 0 ? (rows[rows.length - 1]?.runningBalance ?? 0) : 0;
    const totalExtra = rows
      .filter((r) => r.transaction.type === "extra")
      .reduce((sum, r) => sum + r.transaction.amount, 0);
    return { totalIssued, totalPaid, totalOutstanding, totalExtra };
  }, [rows]);

  const generatedAt = useMemo(
    () => new Date().toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }),
    [open, customerId],
  );

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="statement-dialog-content max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4.5" /> View account statement
          </DialogTitle>
          <DialogDescription>
            A full, itemised statement of account — every debt and payment on record, with a
            running balance. Ready to review or print.
          </DialogDescription>
        </DialogHeader>

        <div className="no-print">
          <Select value={customerId ?? ""} onValueChange={(v) => setCustomerId(v)}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {customer ? (
          <div className="statement-print-area space-y-6 rounded-xl border bg-card p-6">
            {/* Letterhead */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={logoMark} alt="" className="size-12 shrink-0 object-contain" />
                <div>
                  <p className="font-display text-lg font-extrabold tracking-tight text-navy">
                    DAHABO GLOBAL LOGISTICS
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Parklands, Limuru Road, Amco Crystal Plaza, Suite 5A, Nairobi
                  </p>
                  <p className="text-xs text-muted-foreground">
                    +254 722 665 333 · abdirashiidmahad@gmail.com
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-base font-bold uppercase tracking-wide text-navy">
                  Statement of Account
                </p>
                <p className="text-xs text-muted-foreground">Generated {generatedAt}</p>
              </div>
            </div>

            <Separator />

            {/* Customer details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Billed to
                </p>
                <p className="mt-1 font-display text-base font-bold">{customer.name}</p>
                {customer.contact ? (
                  <p className="text-sm text-muted-foreground">{customer.contact}</p>
                ) : null}
                {customer.phone ? (
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                ) : null}
                {customer.email ? (
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                ) : null}
              </div>
              <div className="sm:text-right">
                {customer.customerCode ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Customer code: </span>
                    <span className="font-medium">{customer.customerCode}</span>
                  </p>
                ) : null}
                <p className="text-sm">
                  <span className="text-muted-foreground">Account tier: </span>
                  <span className="font-medium">{customer.tier}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Account status: </span>
                  <span className="font-medium">{customer.status}</span>
                </p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Total debt issued", value: summary.totalIssued },
                { label: "Total paid", value: summary.totalPaid },
                {
                  label: "Outstanding balance",
                  value: summary.totalOutstanding,
                  emphasis: summary.totalOutstanding > 0,
                },
                { label: "Advance / credit on file", value: summary.totalExtra },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border bg-surface p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-display text-sm font-bold",
                      s.emphasis ? "text-destructive" : "text-foreground",
                    )}
                  >
                    KSh {s.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Ledger */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Transaction history
              </p>
              {rows.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No ledger entries on file for this customer yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium">Mode</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-right font-medium">Paid</th>
                        <th className="px-3 py-2 text-right font-medium">Balance</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.transaction.id} className="border-b last:border-b-0">
                          <td className="whitespace-nowrap px-3 py-2 align-top">
                            {new Date(r.transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <p className="font-medium">
                              {r.transaction.type === "debt" ? "Debt given" : "Extra received"}
                            </p>
                            {r.transaction.reference ? (
                              <p className="text-xs text-muted-foreground">
                                Ref: {r.transaction.reference}
                              </p>
                            ) : null}
                            {r.transaction.notes ? (
                              <p className="text-xs text-muted-foreground">{r.transaction.notes}</p>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 align-top">
                            {CUSTOMER_TRANSACTION_MODE_LABELS[r.transaction.mode]}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right align-top">
                            KSh {r.transaction.amount.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right align-top">
                            {r.transaction.type === "debt"
                              ? `KSh ${r.transaction.amountPaid.toLocaleString()}`
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right align-top font-medium">
                            KSh {r.runningBalance.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 align-top">
                            <StatusPill status={CUSTOMER_TRANSACTION_STATUS_LABELS[r.status]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex flex-wrap items-end justify-between gap-4">
              <p className="max-w-md text-xs text-muted-foreground">
                {summary.totalOutstanding > 0
                  ? "Kindly clear the outstanding balance above at your earliest convenience. Get in touch if you have any questions about this statement."
                  : "This account has no outstanding balance. Thank you for your business."}
              </p>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Balance due</p>
                <p className="font-display text-xl font-extrabold text-navy">
                  KSh {summary.totalOutstanding.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Select a customer to generate their statement.
          </p>
        )}

        <div className="no-print flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          <Button onClick={handlePrint} disabled={!customer} className="w-full sm:w-auto">
            <Printer className="size-4" /> Print / Save as PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
