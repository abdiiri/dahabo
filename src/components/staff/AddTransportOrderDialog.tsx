import { useEffect, useState } from "react";
import { Loader2, ClipboardPlus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CityCombobox } from "@/components/common/CityCombobox";
import { CustomerSelect } from "@/components/common/CustomerSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTransportOrder } from "@/lib/api/transport-orders";
import { listCustomers } from "@/lib/api/customers";
import type { NewTransportOrderInput, TransportOrder, Customer } from "@/lib/api/types";

const empty: NewTransportOrderInput = {
  pickupLocation: "",
  destination: "",
  agreedAmount: 0,
  customerId: undefined,
  notes: "",
};

export function AddTransportOrderDialog({ onCreated }: { onCreated?: (order: TransportOrder) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewTransportOrderInput>(empty);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) listCustomers().then(setCustomers);
  }, [open]);

  const set = <K extends keyof NewTransportOrderInput>(k: K) => (v: NewTransportOrderInput[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.pickupLocation.trim() || !values.destination.trim()) {
      setError("Pickup location and destination are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const order = await createTransportOrder(values);
      toast.success(`Order ${order.orderCode} created`);
      onCreated?.(order);
      setValues(empty);
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't create order", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ClipboardPlus className="size-4" /> New transport order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New transport order</DialogTitle>
          <DialogDescription>An order code is generated automatically.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Customer (optional)</Label>
            <CustomerSelect
              customers={customers}
              value={values.customerId}
              onChange={set("customerId")}
              onCustomerCreated={(c) => setCustomers((rows) => [c, ...rows])}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Pickup location</Label>
              <CityCombobox
                value={values.pickupLocation}
                onChange={set("pickupLocation")}
                placeholder="e.g. Mombasa"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Destination</Label>
              <CityCombobox
                value={values.destination}
                onChange={set("destination")}
                placeholder="e.g. Nairobi"
              />
            </div>
          </div>
          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
          <div>
            <Label className="mb-1.5 block text-sm">Agreed amount (revenue)</Label>
            <Input
              type="number"
              min={0}
              value={values.agreedAmount || ""}
              onChange={(e) => set("agreedAmount")(Number(e.target.value))}
              placeholder="e.g. 40000"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Notes (optional)</Label>
            <Textarea value={values.notes} onChange={(e) => set("notes")(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ClipboardPlus className="size-4" />}
            Create order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
