import { useEffect, useState } from "react";
import { Loader2, HandCoins } from "lucide-react";
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
import { createDebt, createExtra, createUpfront } from "@/lib/api/customer-transactions";
import { listCustomers } from "@/lib/api/customers";
import type {
  Customer,
  CustomerTransaction,
  CustomerTransactionMode,
  CustomerTransactionType,
} from "@/lib/api/types";
import {
  CUSTOMER_TRANSACTION_MODE_LABELS,
  CUSTOMER_TRANSACTION_TYPE_LABELS,
} from "@/lib/api/types";

const today = () => new Date().toISOString().slice(0, 10);

type FormState = {
  type: CustomerTransactionType;
  customerId: string;
  amount: number;
  mode: CustomerTransactionMode;
  date: string;
  reference: string;
  notes: string;
};

const emptyForm = (initialCustomerId?: string): FormState => ({
  type: "debt",
  customerId: initialCustomerId ?? "",
  amount: 0,
  mode: "mpesa",
  date: today(),
  reference: "",
  notes: "",
});

export function AddCustomerTransactionDialog({
  /** Pre-select a customer and skip the picker — used when opened from a
   * customer's own row in the Customers tab. */
  customerId,
  customerName,
  onCreated,
}: {
  customerId?: string | undefined;
  customerName?: string | undefined;
  onCreated?: (row: CustomerTransaction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormState>(emptyForm(customerId));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && !customerId) listCustomers().then(setCustomers);
  }, [open, customerId]);

  useEffect(() => {
    if (open) setValues(emptyForm(customerId));
  }, [open, customerId]);

  const set =
    <K extends keyof FormState>(k: K) =>
    (v: FormState[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.customerId) {
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
      const input = {
        customerId: values.customerId,
        amount: values.amount,
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
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't save this entry", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={customerId ? "outline" : "default"} size={customerId ? "sm" : "default"}>
          <HandCoins className="size-4" /> {customerId ? "Ledger entry" : "New ledger entry"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer ledger entry</DialogTitle>
          <DialogDescription>
            {customerName
              ? `For ${customerName}.`
              : "Record money owed by, or received from, a customer."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
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

          {!customerId ? (
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
              <Label className="mb-1.5 block text-sm">Amount (KSh)</Label>
              <Input
                type="number"
                min={0}
                value={values.amount || ""}
                onChange={(e) => set("amount")(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Mode of payment</Label>
              <Select value={values.mode} onValueChange={set("mode")}>
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
              <Input
                type="date"
                value={values.date}
                onChange={(e) => set("date")(e.target.value)}
              />
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
            ) : (
              <HandCoins className="size-4" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
