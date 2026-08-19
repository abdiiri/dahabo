import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordPayment, remainingBalance } from "@/lib/api/customer-transactions";
import { formatMoney } from "@/lib/currency";
import type { CustomerTransaction, CustomerTransactionMode } from "@/lib/api/types";
import { CUSTOMER_TRANSACTION_MODE_LABELS } from "@/lib/api/types";

const today = () => new Date().toISOString().slice(0, 10);

export function RecordPaymentDialog({
  entry,
  onClose,
  onSaved,
}: {
  entry: CustomerTransaction | null;
  onClose: () => void;
  onSaved: (updated: CustomerTransaction) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<CustomerTransactionMode>("mpesa");
  const [date, setDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);

  const balance = entry ? remainingBalance(entry) : 0;
  const currency = entry?.currency ?? "KES";

  useEffect(() => {
    if (entry) {
      setAmount(remainingBalance(entry));
      setMode(entry.mode);
      setDate(today());
    }
  }, [entry]);

  async function handleSubmit() {
    if (!entry) return;
    if (amount <= 0 || amount > balance) {
      toast.error(`Enter an amount between 1 and ${formatMoney(balance, currency)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const updated = await recordPayment(entry.id, { amount, mode, date });
      toast.success("Payment recorded");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't record this payment", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {entry?.customerName ?? "Customer"} owes {formatMoney(balance, currency)} on this
            entry. Payments are recorded in the same currency as the debt.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Amount paid ({currency})</Label>
            <Input
              type="number"
              min={0}
              max={balance}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Mode of payment</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as CustomerTransactionMode)}>
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
              <Label className="mb-1.5 block text-sm">Date paid</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wallet className="size-4" />
            )}
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
