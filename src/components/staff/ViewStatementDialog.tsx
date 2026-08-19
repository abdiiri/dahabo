import { useEffect, useMemo, useRef, useState } from "react";
import { Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney, formatMoneyGroups } from "@/lib/currency";
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
  CUSTOMER_TRANSACTION_TYPE_LABELS,
  type Customer,
  type CustomerTransaction,
  type CustomerTransactionCurrency,
  type CustomerTransactionStatus,
} from "@/lib/api/types";
import logoMark from "@/assets/dahabo-logo-mark.png";

/** One row of the running-balance ledger rendered on the statement. Balance
 * is tracked per currency — a customer can carry debts in more than one, so
 * a single running number would silently mix them. */
type StatementRow = {
  transaction: CustomerTransaction;
  status: CustomerTransactionStatus;
  runningBalances: { amount: number; currency: CustomerTransactionCurrency }[];
};

/** Builds the chronological, running-balance view of a customer's full
 * ledger — every debt and every extra/advance payment, oldest first, each
 * annotated with the outstanding balance (per currency) as of that entry.
 * This is the "smart" part: rather than just listing raw rows, it
 * reconstructs the account's balance history the way a real statement would. */
function buildStatementRows(transactions: CustomerTransaction[]): StatementRow[] {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const balances = new Map<CustomerTransactionCurrency, number>();
  return sorted.map((t) => {
    if (t.type === "debt") {
      balances.set(t.currency, (balances.get(t.currency) ?? 0) + remainingBalance(t));
    }
    return {
      transaction: t,
      status: getTransactionStatus(t),
      runningBalances: [...balances.entries()].map(([currency, amount]) => ({ currency, amount })),
    };
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
    const totalIssued = formatMoneyGroups(
      debts.map((r) => ({ amount: r.transaction.amount, currency: r.transaction.currency })),
    );
    const totalPaid = formatMoneyGroups(
      debts.map((r) => ({ amount: r.transaction.amountPaid, currency: r.transaction.currency })),
    );
    const lastBalances = rows.length > 0 ? (rows[rows.length - 1]?.runningBalances ?? []) : [];
    const totalOutstanding = formatMoneyGroups(lastBalances);
    const hasOutstanding = lastBalances.some((b) => b.amount > 0);
    const totalExtra = formatMoneyGroups(
      rows
        .filter((r) => r.transaction.type === "extra")
        .map((r) => ({ amount: r.transaction.amount, currency: r.transaction.currency })),
    );
    const totalUpfront = formatMoneyGroups(
      rows
        .filter((r) => r.transaction.type === "upfront")
        .map((r) => ({ amount: r.transaction.amount, currency: r.transaction.currency })),
    );
    return { totalIssued, totalPaid, totalOutstanding, hasOutstanding, totalExtra, totalUpfront };
  }, [rows]);

  const generatedAt = useMemo(
    () => new Date().toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }),
    [open, customerId],
  );

  const printAreaRef = useRef<HTMLDivElement>(null);

  /** Prints the statement in a dedicated popup window that contains only
   * the statement markup — nothing else from the app's DOM. Earlier this
   * used `window.print()` with a "hide everything except this element"
   * CSS trick, but that trick is fragile: `visibility: hidden` elements
   * still occupy their normal-flow space, and the app shell's own fixed/
   * absolute layout can shove the statement off onto a second page or
   * off-screen entirely depending on the browser. A clean, isolated
   * document sidesteps that whole class of bug. */
  function handlePrint() {
    const node = printAreaRef.current;
    if (!node) return;

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      toast.error("Pop-up blocked", {
        description: "Allow pop-ups for this site to print the statement.",
      });
      return;
    }

    // Carry over every stylesheet/style tag the app already has loaded so
    // the statement keeps its fonts, colors, and table styling.
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join("\n");

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Dahabo Global Logistics — Statement</title>
    ${styleTags}
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      body { display: flex; justify-content: center; }
    </style>
  </head>
  <body>
    ${node.outerHTML}
  </body>
</html>`);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="statement-dialog-content max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4.5" /> View account statement
          </DialogTitle>
          <DialogDescription>
            A full, itemised statement of account — every debt and payment on record, with a
            running balance. Ready to review or print.
          </DialogDescription>
        </DialogHeader>

        <div>
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
          <div
            ref={printAreaRef}
            className="statement-print-area space-y-6 rounded-xl border bg-card p-6 print:space-y-3"
          >
            {/* Letterhead */}
            <div className="flex flex-wrap items-start justify-between gap-4 print:gap-2">
              <div className="flex items-center gap-3 print:gap-2">
                <img
                  src={logoMark}
                  alt=""
                  className="size-12 shrink-0 object-contain print:size-9"
                />
                <div>
                  <p className="font-display text-lg font-extrabold tracking-tight text-navy print:text-sm">
                    DAHABO GLOBAL LOGISTICS
                  </p>
                  <p className="text-xs text-muted-foreground print:text-[9px]">
                    Parklands, Limuru Road, Amco Crystal Plaza, Suite 5A, Nairobi
                  </p>
                  <p className="text-xs text-muted-foreground print:text-[9px]">
                    +254 722 665 333 · abdirashiidmahad@gmail.com
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-base font-bold uppercase tracking-wide text-navy print:text-xs">
                  Statement of Account
                </p>
                <p className="text-xs text-muted-foreground print:text-[9px]">
                  Generated {generatedAt}
                </p>
              </div>
            </div>

            <Separator className="print:my-0" />

            {/* Customer details */}
            <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-[9px]">
                  Billed to
                </p>
                <p className="mt-1 font-display text-base font-bold print:mt-0.5 print:text-sm">
                  {customer.name}
                </p>
                {customer.contact ? (
                  <p className="text-sm text-muted-foreground print:text-[9px]">
                    {customer.contact}
                  </p>
                ) : null}
                {customer.phone ? (
                  <p className="text-sm text-muted-foreground print:text-[9px]">
                    {customer.phone}
                  </p>
                ) : null}
                {customer.email ? (
                  <p className="text-sm text-muted-foreground print:text-[9px]">
                    {customer.email}
                  </p>
                ) : null}
              </div>
              <div className="sm:text-right print:text-right">
                {customer.customerCode ? (
                  <p className="text-sm print:text-[9px]">
                    <span className="text-muted-foreground">Customer code: </span>
                    <span className="font-medium">{customer.customerCode}</span>
                  </p>
                ) : null}
                <p className="text-sm print:text-[9px]">
                  <span className="text-muted-foreground">Account tier: </span>
                  <span className="font-medium">{customer.tier}</span>
                </p>
                <p className="text-sm print:text-[9px]">
                  <span className="text-muted-foreground">Account status: </span>
                  <span className="font-medium">{customer.status}</span>
                </p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-5 print:grid-cols-5 print:gap-1.5">
              {[
                { label: "Total debt issued", value: summary.totalIssued },
                { label: "Total paid", value: summary.totalPaid },
                {
                  label: "Outstanding balance",
                  value: summary.totalOutstanding,
                  emphasis: summary.hasOutstanding,
                },
                { label: "Advance / credit on file", value: summary.totalExtra },
                { label: "Upfront received", value: summary.totalUpfront },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border bg-surface p-3 print:rounded-none print:border-0 print:bg-transparent print:p-0 print:border-l print:pl-1.5"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground print:text-[7.5px] print:leading-tight">
                    {s.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-display text-sm font-bold print:mt-0 print:text-[10px]",
                      s.emphasis ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Ledger */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground print:mb-1 print:text-[9px]">
                Transaction history
              </p>
              {rows.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No ledger entries on file for this customer yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border print:overflow-visible print:rounded-none print:border-0">
                  <table className="w-full text-sm print:text-[10px]">
                    <thead>
                      <tr className="border-b bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground print:bg-transparent print:text-[8px]">
                        <th className="px-3 py-2 font-medium print:px-1.5 print:py-1">Date</th>
                        <th className="px-3 py-2 font-medium print:px-1.5 print:py-1">
                          Description
                        </th>
                        <th className="px-3 py-2 font-medium print:px-1.5 print:py-1">Mode</th>
                        <th className="px-3 py-2 text-right font-medium print:px-1.5 print:py-1">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-right font-medium print:px-1.5 print:py-1">
                          Paid
                        </th>
                        <th className="px-3 py-2 text-right font-medium print:px-1.5 print:py-1">
                          Balance
                        </th>
                        <th className="px-3 py-2 font-medium print:px-1.5 print:py-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.transaction.id} className="border-b last:border-b-0">
                          <td className="whitespace-nowrap px-3 py-2 align-top print:px-1.5 print:py-1">
                            {new Date(r.transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 align-top print:px-1.5 print:py-1">
                            <p className="font-medium">
                              {CUSTOMER_TRANSACTION_TYPE_LABELS[r.transaction.type]}
                            </p>
                            {r.transaction.reference ? (
                              <p className="text-xs text-muted-foreground print:text-[8px]">
                                Ref: {r.transaction.reference}
                              </p>
                            ) : null}
                            {r.transaction.notes ? (
                              <p className="text-xs text-muted-foreground print:text-[8px]">
                                {r.transaction.notes}
                              </p>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 align-top print:px-1.5 print:py-1">
                            {CUSTOMER_TRANSACTION_MODE_LABELS[r.transaction.mode]}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right align-top print:px-1.5 print:py-1">
                            {formatMoney(r.transaction.amount, r.transaction.currency)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right align-top print:px-1.5 print:py-1">
                            {r.transaction.type === "debt"
                              ? formatMoney(r.transaction.amountPaid, r.transaction.currency)
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right align-top font-medium print:px-1.5 print:py-1">
                            {formatMoneyGroups(r.runningBalances)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 align-top print:px-1.5 print:py-1">
                            <StatusPill status={CUSTOMER_TRANSACTION_STATUS_LABELS[r.status]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Separator className="print:my-0" />

            <div className="flex flex-wrap items-end justify-between gap-4 print:gap-2">
              <p className="max-w-md text-xs text-muted-foreground print:text-[8px]">
                {summary.hasOutstanding
                  ? "Kindly clear the outstanding balance above at your earliest convenience. Get in touch if you have any questions about this statement."
                  : "This account has no outstanding balance. Thank you for your business."}
              </p>
              <div className="text-right">
                <p className="text-xs text-muted-foreground print:text-[8px]">Balance due</p>
                <p className="font-display text-xl font-extrabold text-navy print:text-sm">
                  {summary.totalOutstanding}
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
