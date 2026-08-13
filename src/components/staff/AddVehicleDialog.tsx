import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
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
import { createVehicle } from "@/lib/api/vehicles";
import { VEHICLE_TYPE_LABELS, type NewVehicleInput, type Vehicle, type VehicleType } from "@/lib/api/types";

const empty: NewVehicleInput = {
  plateNumber: "",
  type: "prime_mover",
  capacity: "",
  odometerKm: 0,
  nextServiceDate: "",
};

export function AddVehicleDialog({ onCreated }: { onCreated?: (vehicle: Vehicle) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewVehicleInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof NewVehicleInput>(k: K) => (v: NewVehicleInput[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.plateNumber.trim()) {
      setError("Plate number is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const vehicle = await createVehicle(values);
      toast.success(`${vehicle.plateNumber} added as ${vehicle.vehicleCode}`);
      onCreated?.(vehicle);
      setValues(empty);
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't add vehicle", {
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
          <Truck className="size-4" /> Add vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a vehicle</DialogTitle>
          <DialogDescription>A vehicle ID is generated automatically.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Plate number</Label>
            <Input value={values.plateNumber} onChange={(e) => set("plateNumber")(e.target.value)} placeholder="e.g. KDD 145A" />
            {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Type</Label>
              <Select value={values.type} onValueChange={(v) => set("type")(v as VehicleType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((t) => (
                    <SelectItem key={t} value={t}>{VEHICLE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Capacity</Label>
              <Input value={values.capacity} onChange={(e) => set("capacity")(e.target.value)} placeholder="e.g. 30 tonnes" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Odometer (km)</Label>
              <Input
                type="number"
                min={0}
                value={values.odometerKm ?? 0}
                onChange={(e) => set("odometerKm")(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Next service date</Label>
              <Input type="date" value={values.nextServiceDate} onChange={(e) => set("nextServiceDate")(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
            Add vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
