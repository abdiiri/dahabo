import { useEffect, useState } from "react";
import { Loader2, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityCombobox } from "@/components/common/CityCombobox";
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
import { createTrip, listActiveTripAssignments, listTrips } from "@/lib/api/trips";
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
  const [busy, setBusy] = useState<{ driverIds: Set<string>; vehicleIds: Set<string> }>({
    driverIds: new Set(),
    vehicleIds: new Set(),
  });
  const [orders, setOrders] = useState<TransportOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    listVehicles().then(setVehicles);
    listDrivers().then(setDrivers);
    listActiveTripAssignments().then(({ tripByDriverId, tripByVehicleId }) =>
      setBusy({
        driverIds: new Set(tripByDriverId.keys()),
        vehicleIds: new Set(tripByVehicleId.keys()),
      }),
    );
    // An order already tied to a live trip (in_progress, or "scheduled" if
    // that status is ever used) must not be offered again here — that trip
    // is already earning against it, and starting a second one would double
    // it up. Cross-check against trips directly rather than trusting order.status
    // alone, since a failed status sync would otherwise still let it through.
    Promise.all([listTransportOrders(), listTrips()]).then(([orderRows, tripRows]) => {
      const linkedOrderIds = new Set(
        tripRows
          .filter((t) => t.status === "in_progress" || t.status === "scheduled")
          .map((t) => t.transportOrderId)
          .filter((id): id is string => Boolean(id)),
      );
      setOrders(
        orderRows.filter(
          (o) =>
            o.status !== "completed" &&
            o.status !== "cancelled" &&
            o.status !== "in_progress" &&
            !linkedOrderIds.has(o.id),
        ),
      );
    });
  }, [open]);

  // Only an available driver and an active, free vehicle can be picked —
  // this is what stops a driver or vehicle already out on a trip from
  // being double-booked, before the database's own guard would catch it.
  const availableDrivers = drivers.filter(
    (d) => d.status === "available" && !busy.driverIds.has(d.id),
  );
  const freeVehicles = vehicles.filter((v) => v.status === "active" && !busy.vehicleIds.has(v.id));

  const set =
    <K extends keyof NewTripInput>(k: K) =>
    (v: NewTripInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (
      !values.vehicleId ||
      !values.driverId ||
      !values.origin.trim() ||
      !values.destination.trim()
    ) {
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
          <DialogDescription>
            Enter the agreed mileage pay for this trip — no distance calculation needed. Only active
            vehicles and available drivers not already on a trip are listed below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Transport order (optional)</Label>
            <Select
              value={values.transportOrderId ?? "none"}
              onValueChange={(v) => set("transportOrderId")(v === "none" ? undefined : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No linked order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked order</SelectItem>
                {orders.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No orders available to link right now
                  </div>
                ) : (
                  orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.orderCode} — {o.pickupLocation} to {o.destination}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Orders already on an active trip aren't listed — complete that trip first.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Vehicle</Label>
              <Select value={values.vehicleId} onValueChange={set("vehicleId")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {freeVehicles.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No active, free vehicles right now
                    </div>
                  ) : (
                    freeVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plateNumber}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Driver</Label>
              <Select value={values.driverId} onValueChange={set("driverId")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No available drivers right now
                    </div>
                  ) : (
                    availableDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.fullName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Origin</Label>
              <CityCombobox value={values.origin} onChange={set("origin")} placeholder="e.g. Mombasa" />
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RouteIcon className="size-4" />
            )}
            Start trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
