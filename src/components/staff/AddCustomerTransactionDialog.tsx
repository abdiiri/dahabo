import { useEffect, useState } from "react";
import { Loader2, HandCoins, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDebt,
  createExtra,
  createUpfront,
  updateCustomerTransaction,
} from "@/lib/api/customer-transactions";
import { listCustomers } from "@/lib/api/customers";
import type {
  Customer,
  CustomerTransaction,
  CustomerTransactionCurrency,
  CustomerTransactionMode,
  CustomerTransactionType,
} from "@/lib/api/types";
import {
  CUSTOMER_TRANSACTION_CURRENCIES,
  CUSTOMER_TRANSACTION_CURRENCY_LABELS,
  CUSTOMER_TRANSACTION_MODE_LABELS,
  CUSTOMER_TRANSACTION_TYPE_LABELS,
} from "@/lib/api/types";

const today = () => new Date().toISOString().slice(0, 10);

type FormState = {
  type: CustomerTransactionType;
  customerId: string;
  amount: number;
  currency: CustomerTransactionCurrency;
  mode: CustomerTransactionMode;
  date: string;
  reference: string;
  notes: string;
};

const emptyForm = (initialCustomerId?: string): FormState => ({
  type: "debt",
  customerId: initialCustomerId ?? "",
  amount: 0,
  currency: "KES",
  mode: "mpesa",
  date: today(),
  reference: "",
  notes: "",
});

const formFromEntry = (entry: CustomerTransaction): FormState => ({
  type: entry.type,
  customerId: entry.customerId,
  amount: entry.amount,
  currency: entry.currency,
  mode: entry.mode,
  date: entry.date,
  reference: entry.reference ?? "",
  notes: entry.notes ?? "",
});

export function AddCustomerTransactionDialog({
  /** Pre-select a customer and skip the picker — used when opened from a
   * customer's own row in the Customers tab. */
  customerId,
  customerName,
  /** When set, the dialog opens already showing this entry's details and
   * saves edits in place instead of creating a new one. The trigger button
   * is hidden — pass `open`/`onOpenChange` to control it externally (e.g.
   * from a row's "Edit" menu item). */
  entry,
  open: controlledOpen,
  onOpenChange,
  onCreated,
  onUpdated,
}: {
  customerId?: string | undefined;
  customerName?: string | undefined;
  entry?: CustomerTransaction | null | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  onCreated?: (row: CustomerTransaction) => void;
  onUpdated?: (row: CustomerTransaction) => void;
}) {
  const isEditing = entry != null;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isEditing ? (controlledOpen ?? false) : uncontrolledOpen;
  const setOpen = isEditing ? (onOpenChange ?? (() => {})) : setUncontrolledOpen;

  const [values, setValues] = useState<FormState>(
    entry ? formFromEntry(entry) : emptyForm(customerId),
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && !customerId && !isEditing) listCustomers().then(setCustomers);
  }, [open, customerId, isEditing]);

  useEffect(() => {
    if (!open) return;
    setValues(entry ? formFromEntry(entry) : emptyForm(customerId));
    setError(null);
    // Re-seed the form whenever the dialog opens for a (possibly different)
    // entry, or fresh for a new one — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry?.id, customerId]);

  const set =
    <K extends keyof FormState>(k: K) =>
    (v: FormState[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!isEditing && !values.customerId) {
      setError("Pick a customer.");
      return;
    }
    if (values.amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (isEditing && entry) {
        const updated = await updateCustomerTransaction(entry.id, {
          amount: values.amount,
          currency: values.currency,
          mode: values.mode,
          date: values.date,
          reference: values.reference || undefined,
          notes: values.notes || undefined,
        });
        toast.success("Entry updated");
        onUpdated?.(updated);
      } else {
        const input = {
          customerId: values.customerId,
          amount: values.amount,
          currency: values.currency,
          mode: values.mode,
          date: values.date,
          reference: values.reference || undefined,
          notes: values.notes || undefined,
        };
        const row =
          values.type === "debt"
            ? await createDebt(input)
            : values.type === "upfront"
              ? await createUpfront(input)
              : await createExtra(input);
        toast.success(
          values.type === "debt"
            ? "Debt recorded"
            : values.type === "upfront"
              ? "Upfront payment recorded"
              : "Extra payment recorded",
        );
        onCreated?.(row);
        setValues(emptyForm(customerId));
      }
      setOpen(false);
    } catch (err) {
      toast.error(isEditing ? "Couldn't save these changes" : "Couldn't save this entry", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const body = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit ledger entry" : "Customer ledger entry"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? `Update the details of this ${CUSTOMER_TRANSACTION_TYPE_LABELS[values.type].toLowerCase()} entry.`
            : customerName
              ? `For ${customerName}.`
              : "Record money owed by, or received from, a customer."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 py-2">
        {!isEditing ? (
          <div>
            <Label className="mb-1.5 block text-sm">Entry type</Label>
            <Select value={values.type} onValueChange={set("type")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CUSTOMER_TRANSACTION_TYPE_LABELS) as CustomerTransactionType[]).map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {CUSTOMER_TRANSACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {values.type === "debt"
                ? "Credit you're extending — this increases what the customer owes you."
                : values.type === "upfront"
                  ? "Customer paid the exact price of an order in advance — not extra, not a debt."
                  : "Money received beyond what they owed (an advance/overpayment) — this does not reduce any debt."}
            </p>
          </div>
        ) : null}

        {!customerId && !isEditing ? (
          <div>
            <Label className="mb-1.5 block text-sm">Customer</Label>
            <Select value={values.customerId} onValueChange={set("customerId")}>
              <SelectTrigger className="w-full">
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
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-sm">Amount</Label>
            <Input
              type="number"
              min={0}
              value={values.amount || ""}
              onChange={(e) => set("amount")(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Currency</Label>
            <Select
              value={values.currency}
              onValueChange={(v) => set("currency")(v as CustomerTransactionCurrency)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_TRANSACTION_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CUSTOMER_TRANSACTION_CURRENCY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Mode of payment</Label>
            <Select
              value={values.mode}
              onValueChange={(v) => set("mode")(v as CustomerTransactionMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CUSTOMER_TRANSACTION_MODE_LABELS) as CustomerTransactionMode[]).map(
                  (m) => (
                    <SelectItem key={m} value={m}>
                      {CUSTOMER_TRANSACTION_MODE_LABELS[m]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">
              {values.type === "debt" ? "Date given" : "Date received"}
            </Label>
            <Input type="date" value={values.date} onChange={(e) => set("date")(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Reference (optional)</Label>
            <Input
              placeholder="e.g. M-Pesa code"
              value={values.reference}
              onChange={(e) => set("reference")(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">Notes (optional)</Label>
          <Input value={values.notes} onChange={(e) => set("notes")(e.target.value)} />
        </div>

        {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isEditing ? (
            <Pencil className="size-4" />
          ) : (
            <HandCoins className="size-4" />
          )}
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {body}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={customerId ? "outline" : "default"} size={customerId ? "sm" : "default"}>
          <HandCoins className="size-4" /> {customerId ? "Ledger entry" : "New ledger entry"}
        </Button>
      </DialogTrigger>
      {body}
    </Dialog>
  );
}
