import { useEffect, useMemo, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { buildWhatsAppLink } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { remainingBalance } from "@/lib/api/customer-transactions";
import type { Customer, CustomerTransaction } from "@/lib/api/types";

/** Builds the default statement text for one customer — open debts, total
 * outstanding, and any advance/extra balance on file. Editable afterward,
 * so this is a starting point rather than the final word. */
function buildStatementText(
  customer: Customer,
  openDebts: CustomerTransaction[],
  totalOutstanding: number,
  totalExtra: number,
  totalUpfront: number,
): string {
  const lines: string[] = [];
  lines.push("*Dahabo Global Logistics*");
  lines.push(`Account statement for ${customer.name}`);
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push("");

  if (openDebts.length > 0) {
    lines.push("Outstanding items:");
    for (const t of openDebts) {
      const ref = t.reference ? ` (Ref: ${t.reference})` : "";
      lines.push(
        `• ${new Date(t.date).toLocaleDateString()} — KSh ${remainingBalance(t).toLocaleString()}${ref}`,
      );
    }
    lines.push("");
  }

  lines.push(`Total outstanding: KSh ${totalOutstanding.toLocaleString()}`);
  if (totalExtra > 0) {
    lines.push(`Advance/credit balance on file: KSh ${totalExtra.toLocaleString()}`);
  }
  if (totalUpfront > 0) {
    lines.push(`Upfront received (paid ahead for order): KSh ${totalUpfront.toLocaleString()}`);
  }
  lines.push("");
  lines.push(
    openDebts.length > 0
      ? "Kindly clear at your earliest convenience. Thank you for your business."
      : "No outstanding balance — thank you for your business.",
  );
  lines.push("— Dahabo Global Logistics");
  return lines.join("\n");
}

export function SendStatementDialog({
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
  const [message, setMessage] = useState("");

  const customer = customers.find((c) => c.id === customerId);

  const stats = useMemo(() => {
    if (!customerId) return null;
    const mine = transactions.filter((t) => t.customerId === customerId);
    const openDebts = mine
      .filter((t) => t.type === "debt" && remainingBalance(t) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const totalOutstanding = openDebts.reduce((sum, t) => sum + remainingBalance(t), 0);
    const totalExtra = mine.filter((t) => t.type === "extra").reduce((sum, t) => sum + t.amount, 0);
    const totalUpfront = mine
      .filter((t) => t.type === "upfront")
      .reduce((sum, t) => sum + t.amount, 0);
    return { openDebts, totalOutstanding, totalExtra, totalUpfront };
  }, [transactions, customerId]);

  // Reset to the customer passed in (or the first on the list) each time the
  // dialog opens, and regenerate the message for whichever customer is
  // selected — picking a different customer starts a fresh draft.
  useEffect(() => {
    if (!open) return;
    setCustomerId(initialCustomerId ?? customers[0]?.id);
  }, [open, initialCustomerId, customers]);

  useEffect(() => {
    if (!open || !customer || !stats) return;
    setMessage(
      buildStatementText(customer, stats.openDebts, stats.totalOutstanding, stats.totalExtra),
    );
    // Only regenerate when the customer changes — not on every keystroke,
    // since the message is meant to be editable afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId]);

  const waLink = customer ? buildWhatsAppLink(customer.phone, message) : undefined;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Statement copied");
    } catch {
      toast.error("Couldn't copy — select and copy the text manually");
    }
  }

  function sendOnWhatsApp() {
    if (!waLink) {
      toast.error("No phone number on file for this customer", {
        description: "Add one from the Customers tab to enable WhatsApp sending.",
      });
      return;
    }
    window.open(waLink, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send account statement</DialogTitle>
          <DialogDescription>
            A summary of what this customer owes, ready to send on WhatsApp or copy elsewhere.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Customer</Label>
            <Select value={customerId ?? ""} onValueChange={(v) => setCustomerId(v)}>
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
            {customer && !customer.phone ? (
              <p className="mt-1.5 text-xs text-warning">
                No phone number on file — you can still copy the text below.
              </p>
            ) : null}
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={copyText} className="w-full sm:w-auto">
            <Copy className="size-4" /> Copy text
          </Button>
          <Button onClick={sendOnWhatsApp} className="w-full sm:w-auto" disabled={!customer}>
            <MessageCircle className="size-4" /> Send via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
