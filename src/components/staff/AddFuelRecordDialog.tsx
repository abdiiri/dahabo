import { useEffect, useState } from "react";
import { Loader2, Fuel as FuelIcon } from "lucide-react";
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
import { createFuelRecord } from "@/lib/api/fuel-records";
import { listVehicles } from "@/lib/api/vehicles";
import type { NewFuelRecordInput, FuelRecord, Vehicle } from "@/lib/api/types";

const empty: NewFuelRecordInput = { vehicleId: "", liters: 0, cost: 0 };

export function AddFuelRecordDialog({ onCreated }: { onCreated?: (record: FuelRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewFuelRecordInput>(empty);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) listVehicles().then(setVehicles);
  }, [open]);

  const set = <K extends keyof NewFuelRecordInput>(k: K) => (v: NewFuelRecordInput[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.vehicleId || values.liters <= 0 || values.cost <= 0) {
      setError("Vehicle, liters and cost are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const record = await createFuelRecord(values);
      toast.success("Fuel record logged");
      onCreated?.(record);
      setValues(empty);
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't log fuel", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FuelIcon className="size-4" /> Log fuel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log fuel</DialogTitle>
          <DialogDescription>Quick entry — this counts against the vehicle's monthly profit.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Vehicle</Label>
            <Select value={values.vehicleId} onValueChange={set("vehicleId")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.plateNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Liters</Label>
              <Input type="number" min={0} value={values.liters || ""} onChange={(e) => set("liters")(Number(e.target.value))} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Cost (KSh)</Label>
              <Input type="number" min={0} value={values.cost || ""} onChange={(e) => set("cost")(Number(e.target.value))} />
            </div>
          </div>
          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <FuelIcon className="size-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
