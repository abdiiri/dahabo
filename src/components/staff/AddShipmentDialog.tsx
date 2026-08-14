import { useEffect, useState } from "react";
import { Loader2, PackagePlus } from "lucide-react";
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
import { createShipment, type NewShipmentInput } from "@/lib/api/shipments";
import { listCustomers } from "@/lib/api/customers";
import type { Shipment, Customer } from "@/lib/api/types";

const empty: NewShipmentInput = { origin: "", destination: "", service: "", customerId: undefined };

export function AddShipmentDialog({ onCreated }: { onCreated?: (shipment: Shipment) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewShipmentInput>(empty);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) listCustomers().then(setCustomers);
  }, [open]);

  const set = <K extends keyof NewShipmentInput>(k: K) => (v: NewShipmentInput[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.origin.trim() || !values.destination.trim()) {
      setError("Origin and destination are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const shipment = await createShipment(values);
      toast.success(`${shipment.shipmentCode} created`);
      onCreated?.(shipment);
      setValues(empty);
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't create shipment", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PackagePlus className="size-4" /> New record
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New shipment</DialogTitle>
          <DialogDescription>Shipment code is generated automatically.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Customer (optional)</Label>
            <Select value={values.customerId ?? "none"} onValueChange={(v) => set("customerId")(v === "none" ? undefined : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="No customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No customer</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Origin</Label>
              <Input value={values.origin} onChange={(e) => set("origin")(e.target.value)} placeholder="e.g. Mombasa" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Destination</Label>
              <Input value={values.destination} onChange={(e) => set("destination")(e.target.value)} placeholder="e.g. Nairobi" />
            </div>
          </div>
          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Service</Label>
              <Input value={values.service} onChange={(e) => set("service")(e.target.value)} placeholder="e.g. Express" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">ETA</Label>
              <Input type="date" value={values.eta ?? ""} onChange={(e) => set("eta")(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
            Create shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
