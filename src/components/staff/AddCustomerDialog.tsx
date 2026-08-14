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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCustomer, type NewCustomerInput } from "@/lib/api/customers";
import type { Customer } from "@/lib/api/types";

const empty: NewCustomerInput = { name: "", contact: "", email: "", phone: "", tier: "SME" };

export function AddCustomerDialog({ onCreated }: { onCreated?: (customer: Customer) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewCustomerInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof NewCustomerInput>(k: K) => (v: NewCustomerInput[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.name.trim()) {
      setError("Customer name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const customer = await createCustomer(values);
      toast.success(`${customer.name} added`);
      onCreated?.(customer);
      setValues(empty);
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't add customer", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" /> New customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>Customer ID is generated automatically. Only the name is required.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Customer / company name</Label>
            <Input value={values.name} onChange={(e) => set("name")(e.target.value)} placeholder="e.g. Acme Traders Ltd" />
            {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Contact person</Label>
              <Input value={values.contact} onChange={(e) => set("contact")(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Tier</Label>
              <Select value={values.tier} onValueChange={set("tier")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="SME">SME</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Email</Label>
              <Input type="email" value={values.email} onChange={(e) => set("email")(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Phone</Label>
              <Input value={values.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+254 7xx xxx xxx" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Add customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
