import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddFuelRecordDialog } from "@/components/staff/AddFuelRecordDialog";
import {
  listFuelRecords,
  editFuelRecord,
  deleteFuelRecord,
  type EditFuelRecordInput,
} from "@/lib/api/fuel-records";
import { listVehicles } from "@/lib/api/vehicles";
import type { FuelRecord, Vehicle } from "@/lib/api/types";

export const Route = createFileRoute("/staff/fuel")({
  head: () => ({
    meta: [
      { title: "Fuel | Dahabo Staff Portal" },
      { name: "description", content: "Fuel purchases and consumption per vehicle." },
    ],
  }),
  component: Page,
});

function Page() {
  const [records, setRecords] = useState<FuelRecord[] | null>(null);
  const [editing, setEditing] = useState<FuelRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listFuelRecords().then((rows) => active && setRecords(rows));
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete() {
    if (!deletingId) return;
    setBusyId(deletingId);
    try {
      await deleteFuelRecord(deletingId);
      setRecords((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success("Fuel record was removed");
    } catch (err) {
      toast.error("Couldn't delete this fuel record", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<FuelRecord>[] = [
    { key: "fuelCode", header: "Fuel #", render: (r) => r.fuelCode ?? "—" },
    { key: "vehicleLabel", header: "Vehicle", render: (r) => r.vehicleLabel ?? "—" },
    { key: "liters", header: "Liters", render: (r) => r.liters.toLocaleString() },
    { key: "cost", header: "Cost", render: (r) => `KSh ${r.cost.toLocaleString()}` },
    {
      key: "odometerKm",
      header: "Odometer",
      render: (r) => (r.odometerKm ? `${r.odometerKm.toLocaleString()} km` : "—"),
    },
    { key: "filledAt", header: "Date", render: (r) => new Date(r.filledAt).toLocaleDateString() },
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
        breadcrumb={["Staff", "Fuel"]}
        title="Fuel"
        description="Fuel purchases, per vehicle."
        actions={
          <AddFuelRecordDialog onCreated={(r) => setRecords((rows) => [r, ...(rows ?? [])])} />
        }
      />

      {records === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={records} columns={columns} searchPlaceholder="Search fuel records…" />
      )}

      <EditFuelRecordDialog
        record={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setRecords((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this fuel record?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the fuel record to the Recycle Bin. It can be restored from there, or
              permanently removed later. Any Vehicle Profit totals for the affected month will
              update accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditFuelRecordDialog({
  record,
  onClose,
  onSaved,
}: {
  record: FuelRecord | null;
  onClose: () => void;
  onSaved: (record: FuelRecord) => void;
}) {
  const [values, setValues] = useState<EditFuelRecordInput>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      listVehicles().then(setVehicles);
      setValues({
        vehicleId: record.vehicleId,
        liters: record.liters,
        cost: record.cost,
        odometerKm: record.odometerKm,
        filledAt: record.filledAt,
        notes: record.notes ?? "",
      });
    }
  }, [record]);

  const set =
    <K extends keyof EditFuelRecordInput>(k: K) =>
    (v: EditFuelRecordInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!record) return;
    if (!values.vehicleId || (values.liters ?? 0) <= 0) {
      toast.error("Vehicle and liters are required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editFuelRecord(record.id, values);
      toast.success("Fuel record updated");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={record !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit fuel record</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Vehicle</Label>
            <Select value={values.vehicleId ?? ""} onValueChange={set("vehicleId")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vehicleCode} · {v.plateNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Liters</Label>
              <Input
                type="number"
                min={0}
                value={values.liters || ""}
                onChange={(e) => set("liters")(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Cost (KSh)</Label>
              <Input
                type="number"
                min={0}
                value={values.cost || ""}
                onChange={(e) => set("cost")(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Odometer (km)</Label>
              <Input
                type="number"
                min={0}
                value={values.odometerKm || ""}
                onChange={(e) => set("odometerKm")(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Date</Label>
              <Input
                type="date"
                value={values.filledAt ?? ""}
                onChange={(e) => set("filledAt")(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Notes (optional)</Label>
            <Textarea
              value={values.notes ?? ""}
              onChange={(e) => set("notes")(e.target.value)}
              rows={2}
            />
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
