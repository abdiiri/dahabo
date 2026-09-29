import { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
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
import { applyCreditToDebt, availableCredit, remainingBalance } from "@/lib/api/customer-transactions";
import { formatMoney } from "@/lib/currency";
import type { CustomerTransaction } from "@/lib/api/types";

/**
 * Puts unused "extra"/"upfront" credit toward one of the same customer's
 * outstanding debts — the easiest way to use money already in hand instead
 * of chasing a fresh payment while a credit balance just sits there.
 */
export function ApplyCreditDialog({
  credit,
  debts,
  onClose,
  onApplied,
}: {
  credit: CustomerTransaction | null;
  /** This customer's other ledger rows that are debts with something still
   * owed — the only valid targets for applying credit. */
  debts: CustomerTransaction[];
  onClose: () => void;
  onApplied: (credit: CustomerTransaction, debt: CustomerTransaction) => void;
}) {
  const [debtId, setDebtId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const available = credit ? availableCredit(credit) : 0;
  const currency = credit?.currency ?? "KES";
  const targetDebt = debts.find((d) => d.id === debtId);
  const owed = targetDebt ? remainingBalance(targetDebt) : 0;
  const maxAmount = Math.min(available, owed || available);

  useEffect(() => {
    if (credit) {
      const firstDebt = debts[0];
      setDebtId(firstDebt?.id);
      setAmount(Math.min(availableCredit(credit), firstDebt ? remainingBalance(firstDebt) : 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credit]);

  async function handleSubmit() {
    if (!credit || !debtId) return;
    if (amount <= 0 || amount > maxAmount) {
      toast.error(`Enter an amount between 1 and ${formatMoney(maxAmount, currency)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const { credit: updatedCredit, debt: updatedDebt } = await applyCreditToDebt(
        credit.id,
        debtId,
        amount,
      );
      toast.success("Credit applied");
      onApplied(updatedCredit, updatedDebt);
    } catch (err) {
      toast.error("Couldn't apply this credit", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={credit !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply to a debt</DialogTitle>
          <DialogDescription>
            {credit?.customerName ?? "This customer"} has {formatMoney(available, currency)} of
            unused {credit?.type} credit. Put some or all of it toward a debt they still owe —
            no new payment needed, this just moves money already in hand.
          </DialogDescription>
        </DialogHeader>

        {debts.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            This customer has no outstanding debts to apply credit to right now.
          </p>
        ) : (
          <div className="grid gap-3 py-2">
            <div>
              <Label className="mb-1.5 block text-sm">Apply to which debt</Label>
              <Select
                value={debtId}
                onValueChange={(v) => {
                  setDebtId(v);
                  const d = debts.find((x) => x.id === v);
                  if (d && credit) setAmount(Math.min(availableCredit(credit), remainingBalance(d)));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {debts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {formatMoney(remainingBalance(d), d.currency)} owed ·{" "}
                      {new Date(d.date).toLocaleDateString()}
                      {d.reference ? ` · Ref ${d.reference}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Amount to apply ({currency})</Label>
              <Input
                type="number"
                min={0}
                max={maxAmount}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Up to {formatMoney(maxAmount, currency)} — whichever is smaller of the available
                credit and what's still owed on the selected debt.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || debts.length === 0}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="size-4" />
            )}
            Apply credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
