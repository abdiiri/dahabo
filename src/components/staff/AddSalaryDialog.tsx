import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
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
import { createSalary } from "@/lib/api/salaries";
import { listDrivers } from "@/lib/api/drivers";
import {
  SALARY_TYPE_LABELS,
  type NewSalaryInput,
  type Salary,
  type SalaryType,
  type Driver,
} from "@/lib/api/types";

function currentDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const empty: NewSalaryInput = {
  profileId: "",
  type: "salary",
  amount: 0,
  periodMonth: currentDate(),
  notes: "",
};

export function AddSalaryDialog({ onCreated }: { onCreated?: (entry: Salary) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewSalaryInput>(empty);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) listDrivers().then(setDrivers);
  }, [open]);

  const set =
    <K extends keyof NewSalaryInput>(k: K) =>
    (v: NewSalaryInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.profileId || values.amount <= 0) {
      setError("Driver and amount are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const entry = await createSalary(values, true);
      toast.success("Payment recorded");
      onCreated?.(entry);
      setValues({ ...empty, periodMonth: currentDate() });
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't record payment", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Wallet className="size-4" /> Add payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a driver payment</DialogTitle>
          <DialogDescription>
            For salary, allowances or bonuses — separate from mileage pay, which is calculated
            automatically. Fully optional; only add this if a driver actually gets paid something
            outside mileage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Driver</Label>
            <Select value={values.profileId} onValueChange={set("profileId")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Type</Label>
              <Select value={values.type} onValueChange={(v) => set("type")(v as SalaryType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SALARY_TYPE_LABELS) as SalaryType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SALARY_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Amount</Label>
              <Input
                type="number"
                min={0}
                value={values.amount || ""}
                onChange={(e) => set("amount")(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Date</Label>
            <Input
              type="date"
              value={values.periodMonth}
              onChange={(e) => set("periodMonth")(e.target.value)}
            />
          </div>
          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
          <div>
            <Label className="mb-1.5 block text-sm">Notes (optional)</Label>
            <Textarea
              value={values.notes}
              onChange={(e) => set("notes")(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wallet className="size-4" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
