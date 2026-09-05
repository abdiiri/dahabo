import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, monthLabel, recentMonthOptions } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
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
import { AddMaintenanceRecordDialog } from "@/components/staff/AddMaintenanceRecordDialog";
import {
  listMaintenanceRecords,
  editMaintenanceRecord,
  type EditMaintenanceRecordInput,
} from "@/lib/api/maintenance-records";
import { listVehicles } from "@/lib/api/vehicles";
import type { MaintenanceRecord, Vehicle } from "@/lib/api/types";

export const Route = createFileRoute("/staff/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance | Dahabo Staff Portal" },
      { name: "description", content: "Vehicle servicing and repair records." },
    ],
  }),
  component: Page,
});

function Page() {
  const monthOptions = recentMonthOptions();
  const [month, setMonth] = useState(monthOptions[0]);
  const [records, setRecords] = useState<MaintenanceRecord[] | null>(null);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);

  useEffect(() => {
    let active = true;
    listMaintenanceRecords().then((rows) => active && setRecords(rows));
    return () => {
      active = false;
    };
  }, []);

  // Scoped to the selected month (defaults to current, same as Vehicle
  // Profit and Driver Payments) — by service date, not when the record was
  // entered into the system.
  const monthRecords = (records ?? []).filter((r) => r.serviceDate.slice(0, 7) === month);

  const columns: Column<MaintenanceRecord>[] = [
    { key: "vehicleLabel", header: "Vehicle", render: (r) => r.vehicleLabel ?? "—" },
    { key: "description", header: "Description" },
    { key: "vendor", header: "Vendor", render: (r) => r.vendor ?? "—" },
    { key: "cost", header: "Cost", render: (r) => `KSh ${r.cost.toLocaleString()}` },
    {
      key: "serviceDate",
      header: "Service date",
      render: (r) => new Date(r.serviceDate).toLocaleDateString(),
    },
    {
      key: "nextServiceDate",
      header: "Next service",
      render: (r) => (r.nextServiceDate ? new Date(r.nextServiceDate).toLocaleDateString() : "—"),
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
        breadcrumb={["Staff", "Maintenance"]}
        title="Maintenance"
        description="Servicing and repair records, per vehicle."
        actions={
          <>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {monthLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddMaintenanceRecordDialog
              onCreated={(r) => setRecords((rows) => [r, ...(rows ?? [])])}
            />
          </>
        }
      />

      {records === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable
          data={monthRecords}
          columns={columns}
          searchPlaceholder="Search maintenance records…"
          exportFilename="maintenance-records"
        />
      )}

      <EditMaintenanceRecordDialog
        record={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setRecords((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />
    </>
  );
}

function EditMaintenanceRecordDialog({
  record,
  onClose,
  onSaved,
}: {
  record: MaintenanceRecord | null;
  onClose: () => void;
  onSaved: (record: MaintenanceRecord) => void;
}) {
  const [values, setValues] = useState<EditMaintenanceRecordInput>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      listVehicles().then(setVehicles);
      setValues({
        vehicleId: record.vehicleId,
        description: record.description,
        vendor: record.vendor ?? "",
        cost: record.cost,
        odometerKm: record.odometerKm,
        serviceDate: record.serviceDate,
        nextServiceDate: record.nextServiceDate ?? "",
      });
    }
  }, [record]);

  const set =
    <K extends keyof EditMaintenanceRecordInput>(k: K) =>
    (v: EditMaintenanceRecordInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!record) return;
    if (!values.vehicleId || !values.description?.trim() || (values.cost ?? 0) < 0) {
      toast.error("Vehicle and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editMaintenanceRecord(record.id, values);
      toast.success("Maintenance record updated");
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
          <DialogTitle>Edit maintenance record</DialogTitle>
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
                    {v.plateNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Description</Label>
            <Input
              value={values.description ?? ""}
              onChange={(e) => set("description")(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Vendor</Label>
              <Input value={values.vendor ?? ""} onChange={(e) => set("vendor")(e.target.value)} />
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
              <Label className="mb-1.5 block text-sm">Service date</Label>
              <Input
                type="date"
                value={values.serviceDate ?? ""}
                onChange={(e) => set("serviceDate")(e.target.value)}
              />
            </div>
            <div>
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
