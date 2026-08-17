import { useEffect, useState } from "react";
import { Loader2, Route as RouteIcon } from "lucide-react";
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
import { createTrip } from "@/lib/api/trips";
import { listVehicles } from "@/lib/api/vehicles";
import { listDrivers } from "@/lib/api/drivers";
import { listTransportOrders } from "@/lib/api/transport-orders";
import type { NewTripInput, Trip, Vehicle, Driver, TransportOrder } from "@/lib/api/types";

const empty: NewTripInput = {
  vehicleId: "",
  driverId: "",
  origin: "",
  destination: "",
  mileageAmount: 0,
  transportOrderId: undefined,
};

export function StartTripDialog({ onCreated }: { onCreated?: (trip: Trip) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewTripInput>(empty);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<TransportOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    listVehicles().then(setVehicles);
    listDrivers().then(setDrivers);
    listTransportOrders().then((rows) => setOrders(rows.filter((o) => o.status !== "completed" && o.status !== "cancelled")));
  }, [open]);

  const set = <K extends keyof NewTripInput>(k: K) => (v: NewTripInput[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.vehicleId || !values.driverId || !values.origin.trim() || !values.destination.trim()) {
      setError("Vehicle, driver, origin and destination are all required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const trip = await createTrip(values);
      toast.success(`Trip ${trip.tripCode} started`);
      onCreated?.(trip);
      setValues(empty);
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't start trip", {
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
          <RouteIcon className="size-4" /> Start trip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a trip</DialogTitle>
          <DialogDescription>Enter the agreed mileage pay for this trip — no distance calculation needed.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Transport order (optional)</Label>
            <Select
              value={values.transportOrderId ?? "none"}
              onValueChange={(v) => set("transportOrderId")(v === "none" ? undefined : v)}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="No linked order" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked order</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.orderCode} — {o.pickupLocation} to {o.destination}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Vehicle</Label>
              <Select value={values.vehicleId} onValueChange={set("vehicleId")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.vehicleCode} · {v.plateNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Driver</Label>
              <Select value={values.driverId} onValueChange={set("driverId")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a driver" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <div>
            <Label className="mb-1.5 block text-sm">Mileage agreement (KSh)</Label>
            <Input
              type="number"
              min={0}
              value={values.mileageAmount ?? ""}
              onChange={(e) => set("mileageAmount")(Number(e.target.value))}
              placeholder="e.g. 5000"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The start date and time are recorded automatically the moment this trip is created.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <RouteIcon className="size-4" />}
            Start trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
