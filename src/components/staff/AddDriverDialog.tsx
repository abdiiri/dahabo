import { useState } from "react";
import { Loader2, UserPlus, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { createDriver, generateTempPassword } from "@/lib/api/drivers";
import {
  LICENSE_CLASS_LABELS,
  type Driver,
  type LicenseClass,
  type NewDriverInput,
} from "@/lib/api/types";

const empty: NewDriverInput = {
  fullName: "",
  nationalId: "",
  licenseNumber: "",
  email: "",
  password: generateTempPassword(),
  wantsLogin: false,
  phone: "",
  licenseClass: "CE",
  licenseExpiry: "",
  dateOfBirth: "",
  address: "",
  nextOfKinName: "",
  nextOfKinPhone: "",
};

// Only these are always required. Login email/password are only required
// when "Create a login" is switched on.
const alwaysRequired: (keyof NewDriverInput)[] = ["fullName", "nationalId", "licenseNumber"];

export function AddDriverDialog({ onCreated }: { onCreated?: (driver: Driver) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewDriverInput>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof NewDriverInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const set =
    <K extends keyof NewDriverInput>(k: K) =>
    (v: NewDriverInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  function openChange(next: boolean) {
    setOpen(next);
    if (next) setValues({ ...empty, password: generateTempPassword() });
  }

  async function handleSubmit() {
    const nextErrors: typeof errors = {};
    for (const key of alwaysRequired) {
      if (!values[key]?.toString().trim()) nextErrors[key] = "Required";
    }
    if (values.wantsLogin) {
      if (!values.email?.trim()) nextErrors.email = "Required to create a login";
      else if (!/^\S+@\S+\.\S+$/.test(values.email)) nextErrors.email = "Enter a valid email";
      if (!values.password || values.password.length < 8)
        nextErrors.password = "At least 8 characters";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const driver = await createDriver(values);
      toast.success(`${driver.fullName} added as ${driver.driverCode}`, {
        description: values.wantsLogin
          ? `Login: ${values.email} — share the temporary password with them directly. They'll be asked to change it on first sign-in.`
          : undefined,
      });
      onCreated?.(driver);
      setValues({ ...empty, password: generateTempPassword() });
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't add driver", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" /> Add driver
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a driver</DialogTitle>
          <DialogDescription>
            Company ID is generated automatically. Only name, national ID and licence number are
            required — the rest can be added later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <section className="grid gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Required
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" error={errors.fullName}>
                <Input
                  value={values.fullName}
                  onChange={(e) => set("fullName")(e.target.value)}
                  placeholder="e.g. Abdi Hassan"
                />
              </Field>
              <Field label="National ID number" error={errors.nationalId}>
                <Input
                  value={values.nationalId}
                  onChange={(e) => set("nationalId")(e.target.value)}
                  placeholder="e.g. 32456789"
                />
              </Field>
              <Field
                label="Driving licence number"
                error={errors.licenseNumber}
                className="sm:col-span-2"
              >
                <Input
                  value={values.licenseNumber}
                  onChange={(e) => set("licenseNumber")(e.target.value)}
                  placeholder="e.g. KE-DL-34120"
                />
              </Field>
            </div>
          </section>

          <section className="grid gap-3 rounded-lg border border-border bg-secondary/30 p-3.5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Create a login for this driver
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Optional. Most drivers don't need one — the office manages their record. Only turn
                  this on if the driver needs to sign in to their own dashboard.
                </p>
              </div>
              <Switch checked={values.wantsLogin} onCheckedChange={set("wantsLogin")} />
            </div>

            {values.wantsLogin ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Login email" error={errors.email}>
                  <Input
                    type="email"
                    value={values.email}
                    onChange={(e) => set("email")(e.target.value)}
                    placeholder="name@dahaboglobal.com"
                  />
                </Field>
                <Field label="Temporary password" error={errors.password}>
                  <div className="flex gap-1.5">
                    <Input
                      value={values.password}
                      onChange={(e) => set("password")(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Generate a new password"
                      onClick={() => set("password")(generateTempPassword())}
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Copy password"
                      onClick={async () => {
                        await navigator.clipboard.writeText(values.password ?? "");
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </Field>
              </div>
            ) : null}
          </section>

          <section className="grid gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Optional details
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <Input
                  value={values.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                  placeholder="+254 7xx xxx xxx"
                />
              </Field>
              <Field label="Date of birth">
                <Input
                  type="date"
                  value={values.dateOfBirth}
                  onChange={(e) => set("dateOfBirth")(e.target.value)}
                />
              </Field>
              <Field label="Licence class">
                <Select
                  value={values.licenseClass}
                  onValueChange={(v) => set("licenseClass")(v as LicenseClass)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LICENSE_CLASS_LABELS) as LicenseClass[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {LICENSE_CLASS_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Licence expiry date">
                <Input
                  type="date"
                  value={values.licenseExpiry}
                  onChange={(e) => set("licenseExpiry")(e.target.value)}
                />
              </Field>
              <Field label="Mileage rate (KSh per km)">
                <Input
                  type="number"
                  min={0}
                  value={values.mileageRatePerKm ?? ""}
                  onChange={(e) => set("mileageRatePerKm")(Number(e.target.value))}
                  placeholder="e.g. 15"
                />
              </Field>
              <Field label="Home address" className="sm:col-span-2">
                <Input
                  value={values.address}
                  onChange={(e) => set("address")(e.target.value)}
                  placeholder="Estate, town"
                />
              </Field>
            </div>
          </section>

          <section className="grid gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Next of kin (optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <Input
                  value={values.nextOfKinName}
                  onChange={(e) => set("nextOfKinName")(e.target.value)}
                />
              </Field>
              <Field label="Phone number">
                <Input
                  value={values.nextOfKinPhone}
                  onChange={(e) => set("nextOfKinPhone")(e.target.value)}
                  placeholder="+254 7xx xxx xxx"
                />
              </Field>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            Add driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
