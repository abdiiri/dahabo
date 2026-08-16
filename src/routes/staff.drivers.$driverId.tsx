import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Calendar,
  ClipboardList,
  IdCard,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Phone,
  ShieldAlert,
  Star,
  Trash2,
  Unlock,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusPill } from "@/components/common/StatusPill";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssignWorkDialog } from "@/components/staff/AssignWorkDialog";
import {
  getDriver,
  setDriverAccountStatus,
  editDriver,
  deleteDriver,
  type EditDriverInput,
} from "@/lib/api/drivers";
import { listAssignmentsForDriver } from "@/lib/api/assignments";
import { listAdvancesForDriver, giveAdvance } from "@/lib/api/driver-advances";
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TYPE_LABELS,
  DRIVER_STATUS_LABELS,
  LICENSE_CLASS_LABELS,
  type Assignment,
  type Driver,
  type DriverAdvance,
  type LicenseClass,
} from "@/lib/api/types";

export const Route = createFileRoute("/staff/drivers/$driverId")({
  head: () => ({
    meta: [{ title: "Driver Profile | Dahabo Staff Portal" }],
  }),
  component: Page,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isExpiringSoon(dateStr?: string) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days < 60;
}

function Page() {
  const { driverId } = Route.useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null | undefined>(undefined);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [advances, setAdvances] = useState<DriverAdvance[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(true);
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    getDriver(driverId).then((d) => {
      if (active) setDriver(d ?? null);
    });
    return () => {
      active = false;
    };
  }, [driverId]);

  useEffect(() => {
    let active = true;
    setLoadingAssignments(true);
    listAssignmentsForDriver(driverId)
      .then((rows) => active && setAssignments(rows))
      .finally(() => active && setLoadingAssignments(false));
    return () => {
      active = false;
    };
  }, [driverId]);

  useEffect(() => {
    let active = true;
    setLoadingAdvances(true);
    listAdvancesForDriver(driverId)
      .then((rows) => active && setAdvances(rows))
      .finally(() => active && setLoadingAdvances(false));
    return () => {
      active = false;
    };
  }, [driverId]);

  async function toggleAccountStatus() {
    if (!driver) return;
    const activate = driver.accountStatus === "suspended";
    setStatusBusy(true);
    try {
      await setDriverAccountStatus(driver.id, activate);
      setDriver((d) => (d ? { ...d, accountStatus: activate ? "active" : "suspended" } : d));
      toast.success(activate ? "Account reactivated" : "Account deactivated", {
        description: activate
          ? `${driver.fullName} can sign in again.`
          : `${driver.fullName} can no longer sign in, even with the correct password.`,
      });
    } catch (err) {
      toast.error("Couldn't update the account", {
        description: getErrorMessage(err),
      });
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleDelete() {
    if (!driver) return;
    setDeleting(true);
    try {
      await deleteDriver(driver.id);
      toast.success(`${driver.fullName} was removed`);
      navigate({ to: "/staff/drivers" });
    } catch (err) {
      toast.error("Couldn't delete this driver", {
        description: getErrorMessage(err),
      });
      setDeleting(false);
    }
  }

  if (driver === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (driver === null) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="font-semibold">Driver not found</p>
        <Link to="/staff/drivers" className="text-sm text-primary hover:underline">
          Back to drivers
        </Link>
      </div>
    );
  }

  const licenceExpiring = isExpiringSoon(driver.licenseExpiry);

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Drivers", driver.fullName]}
        title={driver.fullName}
        description={`${driver.driverCode} · ${LICENSE_CLASS_LABELS[driver.licenseClass]}`}
        actions={
          <>
            <EditDriverDialog driver={driver} onSaved={(d) => setDriver(d)} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={statusBusy}>
                  {driver.accountStatus === "suspended" ? (
                    <Unlock className="size-4" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  {driver.accountStatus === "suspended" ? "Activate account" : "Deactivate account"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {driver.accountStatus === "suspended"
                      ? "Reactivate this account?"
                      : "Deactivate this account?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {driver.accountStatus === "suspended"
                      ? `${driver.fullName} will be able to sign in again.`
                      : `${driver.fullName} will be signed out and blocked from signing in, even with the correct password, until you reactivate the account.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={toggleAccountStatus}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={deleting}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {driver.fullName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {driver.hasLogin
                      ? "This permanently deletes their login, compliance record, work history and cash advances. This can't be undone."
                      : "This permanently deletes their compliance record, work history and cash advances. This can't be undone."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AssignWorkDialog
              driverId={driver.id}
              driverName={driver.fullName}
              onCreated={(a) => setAssignments((s) => [a, ...s])}
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          <Card className="gap-4 p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                  {initials(driver.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{driver.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {driver.email || "No login account"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <StatusPill status={DRIVER_STATUS_LABELS[driver.status]} />
                  <StatusPill
                    status={driver.accountStatus === "suspended" ? "Suspended" : "Active"}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <dl className="grid gap-3 text-sm">
              <Row icon={Phone} label="Phone" value={driver.phone} />
              <Row icon={IdCard} label="National ID" value={driver.nationalId} />
              <Row
                icon={MapPin}
                label="Last known location"
                value={
                  driver.currentLocation ? (
                    <span>
                      {driver.currentLocation}
                      {driver.locationUpdatedAt ? (
                        <span className="ml-1 block text-xs font-normal text-muted-foreground">
                          {new Date(driver.locationUpdatedAt).toLocaleString()}
                        </span>
                      ) : null}
                    </span>
                  ) : undefined
                }
              />
              <Row icon={Calendar} label="Date joined" value={driver.dateJoined} />
            </dl>
          </Card>

          <Card className="gap-4 p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <BadgeCheck className="size-4" /> Licence &amp; compliance
            </h2>
            <dl className="grid gap-3 text-sm">
              <Row label="Licence number" value={driver.licenseNumber} />
              <Row label="Licence class" value={LICENSE_CLASS_LABELS[driver.licenseClass]} />
              <Row
                label="Licence expiry"
                value={
                  <span className={licenceExpiring ? "font-semibold text-destructive" : undefined}>
                    {driver.licenseExpiry}
                    {licenceExpiring ? " — renew soon" : ""}
                  </span>
                }
              />
              <Row label="Date of birth" value={driver.dateOfBirth} />
              <Row label="Address" value={driver.address} />
            </dl>
          </Card>

          <Card className="gap-4 p-6 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Next of kin
            </h2>
            <dl className="grid gap-3 text-sm">
              <Row label="Full name" value={driver.nextOfKinName} />
              <Row label="Phone" value={driver.nextOfKinPhone} />
            </dl>
          </Card>

          <Card className="grid grid-cols-2 gap-4 p-6 text-center shadow-soft">
            <div>
              <p className="flex items-center justify-center gap-1 text-2xl font-bold">
                <Star className="size-5 fill-chart-4 text-chart-4" /> {driver.rating.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{driver.totalTrips}</p>
              <p className="text-xs text-muted-foreground">Trips completed</p>
            </div>
          </Card>
        </div>

        <Card className="gap-4 p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <ClipboardList className="size-4" /> Work assignments
          </h2>

          {loadingAssignments ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <ClipboardList className="size-8" />
              <p className="text-sm">No work assigned yet.</p>
              <p className="text-xs">
                Use "Assign work" above to give {driver.fullName.split(" ")[0]} a delivery, pickup,
                or other task.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {assignments.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.assignmentCode} · {ASSIGNMENT_TYPE_LABELS[a.type]}
                      </p>
                    </div>
                    <StatusPill status={ASSIGNMENT_STATUS_LABELS[a.status]} />
                  </div>
                  {(a.origin || a.destination) && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {a.origin || "—"} → {a.destination || "—"}
                    </p>
                  )}
                  {a.notes ? <p className="mt-2 text-sm">{a.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Wallet className="size-4" /> Cash advances
            </h2>
            <GiveAdvanceDialog
              driverId={driver.id}
              onGiven={(a) => setAdvances((s) => [a, ...s])}
            />
          </div>

          {loadingAdvances ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : advances.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Wallet className="size-8" />
              <p className="text-sm">No cash advances recorded yet.</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {advances.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">KES {a.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.purpose || "No purpose noted"} ·{" "}
                        {new Date(a.givenAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusPill status={a.status === "reported" ? "Delivered" : "Pending"} />
                  </div>
                  {a.status === "reported" ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Used KES {a.usageAmount?.toLocaleString() ?? "—"} — {a.usageReport}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function EditDriverDialog({
  driver,
  onSaved,
}: {
  driver: Driver;
  onSaved: (driver: Driver) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<EditDriverInput>({});
  const [submitting, setSubmitting] = useState(false);

  function openChange(next: boolean) {
    setOpen(next);
    if (next) {
      setValues({
        fullName: driver.fullName,
        phone: driver.phone ?? "",
        nationalId: driver.nationalId,
        licenseNumber: driver.licenseNumber,
        licenseClass: driver.licenseClass,
        licenseExpiry: driver.licenseExpiry ?? "",
        dateOfBirth: driver.dateOfBirth ?? "",
        address: driver.address ?? "",
        nextOfKinName: driver.nextOfKinName ?? "",
        nextOfKinPhone: driver.nextOfKinPhone ?? "",
      });
    }
  }

  const set =
    <K extends keyof EditDriverInput>(k: K) =>
    (v: EditDriverInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!values.fullName?.trim() || !values.nationalId?.trim() || !values.licenseNumber?.trim()) {
      toast.error("Name, national ID and licence number are required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editDriver(driver.id, values);
      onSaved(updated);
      toast.success("Driver updated");
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't save changes", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="size-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit driver</DialogTitle>
          <DialogDescription>Their login email can't be changed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Full name</Label>
              <Input
                value={values.fullName ?? ""}
                onChange={(e) => set("fullName")(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Phone</Label>
              <Input value={values.phone ?? ""} onChange={(e) => set("phone")(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">National ID number</Label>
              <Input
                value={values.nationalId ?? ""}
                onChange={(e) => set("nationalId")(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Driving licence number</Label>
              <Input
                value={values.licenseNumber ?? ""}
                onChange={(e) => set("licenseNumber")(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Licence class</Label>
              <Select
                value={values.licenseClass ?? "CE"}
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
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Licence expiry date</Label>
              <Input
                type="date"
                value={values.licenseExpiry ?? ""}
                onChange={(e) => set("licenseExpiry")(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Date of birth</Label>
              <Input
                type="date"
                value={values.dateOfBirth ?? ""}
                onChange={(e) => set("dateOfBirth")(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Home address</Label>
              <Input
                value={values.address ?? ""}
                onChange={(e) => set("address")(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Next of kin name</Label>
              <Input
                value={values.nextOfKinName ?? ""}
                onChange={(e) => set("nextOfKinName")(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Next of kin phone</Label>
              <Input
                value={values.nextOfKinPhone ?? ""}
                onChange={(e) => set("nextOfKinPhone")(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GiveAdvanceDialog({
  driverId,
  onGiven,
}: {
  driverId: string;
  onGiven: (advance: DriverAdvance) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const advance = await giveAdvance({
        driverId,
        amount: value,
        purpose: purpose.trim() || undefined,
      });
      onGiven(advance);
      toast.success(`KES ${value.toLocaleString()} recorded`);
      setAmount("");
      setPurpose("");
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't record the advance", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Wallet className="size-4" /> Give advance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a cash advance</DialogTitle>
          <DialogDescription>
            The driver will see this on their dashboard and can report how it was used.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="adv-amount">Amount (KES)</Label>
            <Input
              id="adv-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="adv-purpose">Purpose (optional)</Label>
            <Input
              id="adv-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Fuel for Nairobi–Mombasa run"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
