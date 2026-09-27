import { useEffect, useState } from "react";
import { Loader2, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityCombobox } from "@/components/common/CityCombobox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { listPartners } from "@/lib/api/partners";
import { createPartnerJob, listPartnerJobs } from "@/lib/api/partner-jobs";
import type { NewTripInput, Trip, Vehicle, Driver, TransportOrder, Partner } from "@/lib/api/types";

const empty: NewTripInput = {
  vehicleId: "",
  driverId: "",
  origin: "",
  destination: "",
  mileageAmount: 0,
  permitCost: 0,
  transportOrderId: undefined,
};

export function StartTripDialog({ onCreated }: { onCreated?: (trip?: Trip) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"fleet" | "partner">("fleet");
  const [values, setValues] = useState<NewTripInput>(empty);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [busy, setBusy] = useState<{ driverIds: Set<string>; vehicleIds: Set<string> }>({
    driverIds: new Set(),
    vehicleIds: new Set(),
  });
  const [orders, setOrders] = useState<TransportOrder[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    listVehicles().then(setVehicles);
    listDrivers().then(setDrivers);
    listPartners().then(setPartners);
    listActiveTripAssignments().then(({ tripByDriverId, tripByVehicleId }) =>
      setBusy({
        driverIds: new Set(tripByDriverId.keys()),
        vehicleIds: new Set(tripByVehicleId.keys()),
      }),
    );
    // An order already tied to a live trip (in_progress, or "scheduled" if
    // that status is ever used), or already handed to a partner, must not
    // be offered again here — it's already earning against something, and
    // offering it again would double it up. Cross-check against trips and
    // partner jobs directly rather than trusting order.status alone, since
    // a failed status sync would otherwise still let it through.
    Promise.all([listTransportOrders(), listTrips(), listPartnerJobs()]).then(
      ([orderRows, tripRows, partnerJobRows]) => {
        const linkedOrderIds = new Set(
          tripRows
            .filter((t) => t.status === "in_progress" || t.status === "scheduled")
            .map((t) => t.transportOrderId)
            .filter((id): id is string => Boolean(id)),
        );
        partnerJobRows.forEach((j) => linkedOrderIds.add(j.transportOrderId));
        setOrders(
          orderRows.filter(
            (o) =>
              o.status !== "completed" &&
              o.status !== "cancelled" &&
              o.status !== "in_progress" &&
              !linkedOrderIds.has(o.id),
          ),
        );
      },
    );
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

  function resetAndClose() {
    setValues(empty);
    setPartnerId("");
    setPayoutAmount(0);
    setMode("fleet");
    setOpen(false);
  }

  async function handleSubmit() {
    if (mode === "partner") {
      if (!values.transportOrderId) {
        setError("Pick which order this job is for.");
        return;
      }
      if (!partnerId) {
        setError("Pick a partner.");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        await createPartnerJob({
          partnerId,
          transportOrderId: values.transportOrderId,
          payoutAmount,
        });
        const partner = partners.find((p) => p.id === partnerId);
        toast.success(`Order handed to ${partner?.name ?? "partner"}`);
        onCreated?.();
        resetAndClose();
      } catch (err) {
        toast.error("Couldn't assign this partner", { description: getErrorMessage(err) });
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
      resetAndClose();
    } catch (err) {
      toast.error("Couldn't start trip", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button>
          <RouteIcon className="size-4" /> Start trip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a trip</DialogTitle>
          <DialogDescription>
            {mode === "fleet"
              ? "Enter the agreed mileage pay for this trip — no distance calculation needed. Only active vehicles and available drivers not already on a trip are listed below."
              : "Hand this order to an owner-operator instead — their own vehicle and driver, you just record what you're paying them."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as "fleet" | "partner")}
            className="justify-start"
          >
            <ToggleGroupItem value="fleet" className="px-4">
              Our Fleet
            </ToggleGroupItem>
            <ToggleGroupItem value="partner" className="px-4">
              Partner Fleet
            </ToggleGroupItem>
          </ToggleGroup>

          <div>
            <Label className="mb-1.5 block text-sm">
              Transport order {mode === "partner" ? "" : "(optional)"}
            </Label>
            <Select
              value={values.transportOrderId ?? "none"}
              onValueChange={(v) => set("transportOrderId")(v === "none" ? undefined : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No linked order" />
              </SelectTrigger>
              <SelectContent>
                {mode === "fleet" ? <SelectItem value="none">No linked order</SelectItem> : null}
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
              Orders already on an active trip or already given to a partner aren't listed.
            </p>
          </div>

          {mode === "partner" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-sm">Partner</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No partners yet — add one in Partner Fleet
                      </div>
                    ) : (
                      partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {p.vehiclePlate}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Amount to pay partner (KSh)</Label>
                <Input
                  type="number"
                  min={0}
                  value={payoutAmount || ""}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  placeholder="e.g. 40000"
                />
              </div>
              {error ? <p className="text-xs font-medium text-destructive sm:col-span-2">{error}</p> : null}
            </div>
          ) : (
            <>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-sm">Mileage agreement (KSh)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={values.mileageAmount || ""}
                    onChange={(e) => set("mileageAmount")(Number(e.target.value))}
                    placeholder="e.g. 5000"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">Permit / legal fees (KSh)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={values.permitCost || ""}
                    onChange={(e) => set("permitCost")(Number(e.target.value))}
                    placeholder="e.g. 2000"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Transit permits, papers or other legal fees — subtracted from this vehicle's
                    profit, not paid to the driver.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The start date and time are recorded automatically the moment this trip is created.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RouteIcon className="size-4" />
            )}
            {mode === "partner" ? "Assign to partner" : "Start trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
