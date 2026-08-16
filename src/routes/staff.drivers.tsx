import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, MoreHorizontal, Pencil, Trash2, Unlock, UserCog } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddDriverDialog } from "@/components/staff/AddDriverDialog";
import {
  listDrivers,
  editDriver,
  deleteDriver,
  setDriverAccountStatus,
  type EditDriverInput,
} from "@/lib/api/drivers";
import { LICENSE_CLASS_LABELS, type Driver, type LicenseClass } from "@/lib/api/types";

export const Route = createFileRoute("/staff/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers | Dahabo Staff Portal" },
      {
        name: "description",
        content: "Driver roster, licences, work assignments and cash advances.",
      },
      { property: "og:title", content: "Drivers | Dahabo Staff Portal" },
      {
        property: "og:description",
        content: "Driver roster, licences, work assignments and cash advances.",
      },
    ],
  }),
  component: Page,
});

const LICENSE_CLASSES: LicenseClass[] = Object.keys(LICENSE_CLASS_LABELS) as LicenseClass[];

function Page() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listDrivers().then((rows) => active && setDrivers(rows));
    return () => {
      active = false;
    };
  }, []);

  async function toggleStatus(driver: Driver) {
    const activate = driver.accountStatus === "suspended";
    setBusyId(driver.id);
    try {
      await setDriverAccountStatus(driver.id, activate);
      setDrivers((rows) =>
        (rows ?? []).map((r) =>
          r.id === driver.id ? { ...r, accountStatus: activate ? "active" : "suspended" } : r,
        ),
      );
      toast.success(activate ? "Driver reactivated" : "Driver deactivated", {
        description: activate
          ? `${driver.fullName} is active again.`
          : `${driver.fullName} is marked inactive.`,
      });
    } catch (err) {
      toast.error("Couldn't update the driver", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    const driver = (drivers ?? []).find((r) => r.id === deletingId);
    setBusyId(deletingId);
    try {
      await deleteDriver(deletingId);
      setDrivers((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success(`${driver?.fullName ?? "Driver"} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this driver", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<Driver>[] = [
    { key: "driverCode", header: "Company ID" },
    { key: "fullName", header: "Driver" },
    { key: "phone", header: "Phone" },
    { key: "licenseNumber", header: "Licence" },
    { key: "licenseClass", header: "Class", render: (r) => LICENSE_CLASS_LABELS[r.licenseClass] },
    {
      key: "currentLocation",
      header: "Last known location",
      render: (r) =>
        r.currentLocation ? (
          <span>
            {r.currentLocation}
            {r.locationUpdatedAt ? (
              <span className="ml-1.5 text-xs text-muted-foreground">
                · {new Date(r.locationUpdatedAt).toLocaleDateString()}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Account",
      render: (r) => (
        <StatusPill status={r.accountStatus === "suspended" ? "Suspended" : "Active"} />
      ),
    },
    {
      key: "id",
      header: "",
      className: "w-10",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={busyId === r.id}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => setEditing(r)}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toggleStatus(r)}>
              {r.accountStatus === "suspended" ? (
                <Unlock className="size-4" />
              ) : (
                <Lock className="size-4" />
              )}
              {r.accountStatus === "suspended" ? "Activate driver" : "Deactivate driver"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeletingId(r.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Drivers"]}
        title="Drivers"
        description="Roster, licences, work assignments and cash advances."
        actions={<AddDriverDialog onCreated={(d) => setDrivers((rows) => [d, ...(rows ?? [])])} />}
      />

      {drivers === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <UserCog className="size-8" />
          <p className="text-sm font-medium text-foreground">No drivers yet</p>
          <p className="max-w-sm text-xs">
            Add your first driver to assign work and cash advances.
          </p>
        </div>
      ) : (
        <DataTable
          data={drivers}
          columns={columns}
          onRowClick={(row) =>
            navigate({ to: "/staff/drivers/$driverId", params: { driverId: row.id } })
          }
        />
      )}

      <EditDriverDialog
        driver={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setDrivers((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this driver?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes their compliance record, work history and cash advances. This
              can't be undone.
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
    </>
  );
}

function EditDriverDialog({
  driver,
  onClose,
  onSaved,
}: {
  driver: Driver | null;
  onClose: () => void;
  onSaved: (driver: Driver) => void;
}) {
  const [values, setValues] = useState<EditDriverInput>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (driver) {
      setValues({
        fullName: driver.fullName,
        phone: driver.phone ?? "",
        nationalId: driver.nationalId,
        licenseNumber: driver.licenseNumber,
        licenseClass: driver.licenseClass,
        licenseExpiry: driver.licenseExpiry ?? "",
        address: driver.address ?? "",
        nextOfKinName: driver.nextOfKinName ?? "",
        nextOfKinPhone: driver.nextOfKinPhone ?? "",
        mileageRatePerKm: driver.mileageRatePerKm,
      });
    }
  }, [driver]);

  const set =
    <K extends keyof EditDriverInput>(k: K) =>
    (v: EditDriverInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!driver) return;
    if (!values.fullName?.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editDriver(driver.id, values);
      toast.success("Driver updated");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={driver !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit driver</DialogTitle>
          <DialogDescription>Company ID can't be changed here.</DialogDescription>
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
                  {LICENSE_CLASSES.map((k) => (
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
            <div>
              <Label className="mb-1.5 block text-sm">Mileage rate (KSh per km)</Label>
              <Input
                type="number"
                min={0}
                value={values.mileageRatePerKm ?? 0}
                onChange={(e) => set("mileageRatePerKm")(Number(e.target.value))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm">Home address</Label>
              <Input
                value={values.address ?? ""}
                onChange={(e) => set("address")(e.target.value)}
              />
            </div>
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
          <Button variant="outline" onClick={onClose} disabled={submitting}>
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
