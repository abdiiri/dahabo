import { useState } from "react";
import { Loader2, UserPlus, RefreshCw, Copy, Check } from "lucide-react";
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
import { createStaff } from "@/lib/api/staff";
import { generateTempPassword } from "@/lib/api/drivers";
import {
  STAFF_ROLE_LABELS,
  type NewStaffInput,
  type StaffMember,
  type StaffRole,
} from "@/lib/api/types";

function empty(): NewStaffInput {
  return {
    fullName: "",
    email: "",
    password: generateTempPassword(),
    phone: "",
    role: "staff",
    jobTitle: "",
    department: "",
  };
}

const ASSIGNABLE_ROLES: StaffRole[] = [
  "admin",
  "operations_manager",
  "finance_officer",
  "warehouse_manager",
  "fleet_manager",
  "staff",
];

export function AddStaffDialog({ onCreated }: { onCreated?: (member: StaffMember) => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewStaffInput>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof NewStaffInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const set =
    <K extends keyof NewStaffInput>(k: K) =>
    (v: NewStaffInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  function openChange(next: boolean) {
    setOpen(next);
    if (next) setValues(empty());
  }

  async function handleSubmit() {
    const nextErrors: typeof errors = {};
    if (!values.fullName.trim()) nextErrors.fullName = "Required";
    if (!values.email.trim()) nextErrors.email = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) nextErrors.email = "Enter a valid email";
    if (!values.password || values.password.length < 8)
      nextErrors.password = "At least 8 characters";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const member = await createStaff(values);
      toast.success(`${member.fullName} added as ${STAFF_ROLE_LABELS[member.role]}`, {
        description: `Staff ID ${member.staffCode} — login: ${values.email}. Share the temporary password with them directly; they'll be asked to change it on first sign-in.`,
      });
      onCreated?.(member);
      setValues(empty());
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't add staff member", {
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
          <UserPlus className="size-4" /> Add staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a staff member</DialogTitle>
          <DialogDescription>
            A staff ID is generated automatically. Give them the email and temporary password
            directly — they'll be required to change it the first time they sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Full name</Label>
            <Input
              value={values.fullName}
              onChange={(e) => set("fullName")(e.target.value)}
              placeholder="e.g. Peter Kimani"
            />
            {errors.fullName ? (
              <p className="mt-1 text-xs font-medium text-destructive">{errors.fullName}</p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Login email</Label>
              <Input
                type="email"
                value={values.email}
                onChange={(e) => set("email")(e.target.value)}
                placeholder="name@dahaboglobal.com"
              />
              {errors.email ? (
                <p className="mt-1 text-xs font-medium text-destructive">{errors.email}</p>
              ) : null}
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
          <div>
            <Label className="mb-1.5 block text-sm">Temporary password</Label>
            <div className="flex gap-1.5">
              <Input value={values.password} onChange={(e) => set("password")(e.target.value)} />
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
            {errors.password ? (
              <p className="mt-1 text-xs font-medium text-destructive">{errors.password}</p>
            ) : null}
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Role</Label>
            <Select value={values.role} onValueChange={(v) => set("role")(v as StaffRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {STAFF_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Job title (optional)</Label>
              <Input
                value={values.jobTitle}
                onChange={(e) => set("jobTitle")(e.target.value)}
                placeholder="e.g. Dispatch Coordinator"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Department (optional)</Label>
              <Input
                value={values.department}
                onChange={(e) => set("department")(e.target.value)}
                placeholder="e.g. Operations"
              />
            </div>
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
              <UserPlus className="size-4" />
            )}
            Add staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
