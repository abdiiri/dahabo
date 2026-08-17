import { useEffect, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
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
import { createMaintenanceRecord } from "@/lib/api/maintenance-records";
import { listVehicles } from "@/lib/api/vehicles";
import type { NewMaintenanceRecordInput, MaintenanceRecord, Vehicle } from "@/lib/api/types";

const empty: NewMaintenanceRecordInput = { vehicleId: "", description: "", cost: 0 };

export function AddMaintenanceRecordDialog({ onCreated }: { onCreated?: (record: MaintenanceRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewMaintenanceRecordInput>(empty);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) listVehicles().then(setVehicles);
  }, [open]);

  const set = <K extends keyof NewMaintenanceRecordInput>(k: K) => (v: NewMaintenanceRecordInput[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.vehicleId || !values.description.trim() || values.cost < 0) {
      setError("Vehicle and description are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const record = await createMaintenanceRecord(values);
      toast.success("Maintenance record logged");
      onCreated?.(record);
      setValues(empty);
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't log maintenance", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Wrench className="size-4" /> Log maintenance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log maintenance</DialogTitle>
          <DialogDescription>Counts against the vehicle's monthly profit. Sets the vehicle's next service date if given.</DialogDescription>
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
          <div>
            <Label className="mb-1.5 block text-sm">Description</Label>
            <Input value={values.description} onChange={(e) => set("description")(e.target.value)} placeholder="e.g. Oil change, brake pads" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Cost (KSh)</Label>
              <Input type="number" min={0} value={values.cost || ""} onChange={(e) => set("cost")(Number(e.target.value))} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Next service date (optional)</Label>
              <Input type="date" value={values.nextServiceDate ?? ""} onChange={(e) => set("nextServiceDate")(e.target.value)} />
            </div>
          </div>
          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Wrench className="size-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
