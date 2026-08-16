import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Pencil } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddVehicleDialog } from "@/components/staff/AddVehicleDialog";
import { listVehicles, editVehicle, type EditVehicleInput } from "@/lib/api/vehicles";
import {
  VEHICLE_TYPE_LABELS,
  VEHICLE_STATUS_LABELS,
  type Vehicle,
  type VehicleType,
  type VehicleStatus,
} from "@/lib/api/types";

export const Route = createFileRoute("/staff/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet | Dahabo Staff Portal" },
      {
        name: "description",
        content: "Vehicle register, utilisation, odometer readings and maintenance schedule.",
      },
      { property: "og:title", content: "Fleet | Dahabo Staff Portal" },
      {
        property: "og:description",
        content: "Vehicle register, utilisation, odometer readings and maintenance schedule.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  useEffect(() => {
    let active = true;
    listVehicles().then((rows) => active && setVehicles(rows));
    return () => {
      active = false;
    };
  }, []);

  const columns: Column<Vehicle>[] = [
    { key: "vehicleCode", header: "ID" },
    { key: "plateNumber", header: "Plate" },
    { key: "type", header: "Type", render: (r) => VEHICLE_TYPE_LABELS[r.type] },
    { key: "capacity", header: "Capacity" },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={VEHICLE_STATUS_LABELS[r.status]} />,
    },
    { key: "odometerKm", header: "Odometer", render: (r) => `${r.odometerKm.toLocaleString()} km` },
    { key: "nextServiceDate", header: "Next service" },
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
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => setEditing(r)}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Fleet"]}
        title="Fleet"
        description="Vehicle register and maintenance schedule."
        actions={
          <AddVehicleDialog onCreated={(v) => setVehicles((rows) => [v, ...(rows ?? [])])} />
        }
      />

      {vehicles === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={vehicles} columns={columns} />
      )}

      <EditVehicleDialog
        vehicle={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setVehicles((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />
    </>
  );
}

function EditVehicleDialog({
  vehicle,
  onClose,
  onSaved,
}: {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSaved: (vehicle: Vehicle) => void;
}) {
  const [values, setValues] = useState<EditVehicleInput>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setValues({
        plateNumber: vehicle.plateNumber,
        type: vehicle.type,
        capacity: vehicle.capacity ?? "",
        status: vehicle.status,
        odometerKm: vehicle.odometerKm,
        nextServiceDate: vehicle.nextServiceDate ?? "",
      });
    }
  }, [vehicle]);

  const set =
    <K extends keyof EditVehicleInput>(k: K) =>
    (v: EditVehicleInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!vehicle) return;
    if (!values.plateNumber?.trim()) {
      toast.error("Plate number is required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editVehicle(vehicle.id, values);
      toast.success("Vehicle updated");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={vehicle !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit vehicle</DialogTitle>
          <DialogDescription>Vehicle ID can't be changed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Plate number</Label>
            <Input
              value={values.plateNumber ?? ""}
              onChange={(e) => set("plateNumber")(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Type</Label>
              <Select
                value={values.type ?? "prime_mover"}
                onValueChange={(v) => set("type")(v as VehicleType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {VEHICLE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Capacity</Label>
              <Input
                value={values.capacity ?? ""}
                onChange={(e) => set("capacity")(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Status</Label>
              <Select
                value={values.status ?? "active"}
                onValueChange={(v) => set("status")(v as VehicleStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {VEHICLE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Odometer (km)</Label>
              <Input
                type="number"
                min={0}
                value={values.odometerKm ?? 0}
                onChange={(e) => set("odometerKm")(Number(e.target.value))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm">Next service date</Label>
              <Input
                type="date"
                value={values.nextServiceDate ?? ""}
                onChange={(e) => set("nextServiceDate")(e.target.value)}
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
