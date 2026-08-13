import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createAssignment } from "@/lib/api/assignments";
import type { Assignment, AssignmentType, NewAssignmentInput } from "@/lib/api/types";

const TYPE_LABELS: Record<AssignmentType, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  transfer: "Transfer between branches",
  maintenance_run: "Maintenance run",
  other: "Other",
};

export function AssignWorkDialog({
  driverId,
  driverName,
  onCreated,
}: {
  driverId: string;
  driverName: string;
  onCreated?: (assignment: Assignment) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Omit<NewAssignmentInput, "driverId">>({
    type: "delivery",
    title: "",
    notes: "",
    origin: "",
    destination: "",
    scheduledStart: "",
    scheduledEnd: "",
  });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof values>(k: K) => (v: (typeof values)[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.title.trim()) {
      setError("Give this assignment a short title.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const assignment = await createAssignment({ driverId, ...values });
      toast.success(`${assignment.assignmentCode} assigned to ${driverName}`);
      onCreated?.(assignment);
      setValues({ type: "delivery", title: "", notes: "", origin: "", destination: "", scheduledStart: "", scheduledEnd: "" });
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't assign work", {
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
          <ClipboardList className="size-4" /> Assign work
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign work to {driverName}</DialogTitle>
          <DialogDescription>Create a delivery, pickup or other task for this driver.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Title</Label>
            <Input value={values.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Deliver shipment DGL-102345 to Kisumu" />
            {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Type</Label>
              <Select value={values.type} onValueChange={(v) => set("type")(v as AssignmentType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as AssignmentType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Origin</Label>
              <Input value={values.origin} onChange={(e) => set("origin")(e.target.value)} placeholder="Pickup point" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Destination</Label>
              <Input value={values.destination} onChange={(e) => set("destination")(e.target.value)} placeholder="Drop-off point" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Scheduled start</Label>
              <Input type="datetime-local" value={values.scheduledStart} onChange={(e) => set("scheduledStart")(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Scheduled end</Label>
              <Input type="datetime-local" value={values.scheduledEnd} onChange={(e) => set("scheduledEnd")(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Notes (optional)</Label>
            <Textarea value={values.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Anything the driver should know" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
