import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
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
import { createPartner, type NewPartnerInput } from "@/lib/api/partners";
import type { Partner } from "@/lib/api/types";

const empty: NewPartnerInput = { name: "", phone: "", vehiclePlate: "", driverName: "" };

export function AddPartnerDialog({ onCreated }: { onCreated?: (partner: Partner) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewPartnerInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof NewPartnerInput>(k: K) => (v: NewPartnerInput[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.name.trim() || !values.vehiclePlate.trim() || !values.driverName.trim()) {
      setError("Partner name, vehicle plate, and driver name are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const partner = await createPartner(values);
      toast.success(`${partner.name} added`);
      onCreated?.(partner);
      setValues(empty);
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't add partner", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" /> New partner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New partner</DialogTitle>
          <DialogDescription>
            An owner-operator who brings their own vehicle and driver — you just hand them a job.
            Partner ID is generated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Partner name</Label>
            <Input
              value={values.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. Juma Transporters"
            />
            {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Vehicle plate</Label>
              <Input
                value={values.vehiclePlate}
                onChange={(e) => set("vehiclePlate")(e.target.value)}
                placeholder="e.g. KDA 123A"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Driver name</Label>
              <Input
                value={values.driverName}
                onChange={(e) => set("driverName")(e.target.value)}
                placeholder="Their driver's name"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Phone</Label>
              <Input
                value={values.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder="+254 7xx xxx xxx"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Add partner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
