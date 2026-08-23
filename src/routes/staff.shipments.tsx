import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Package, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityCombobox } from "@/components/common/CityCombobox";
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
import { AddShipmentDialog } from "@/components/staff/AddShipmentDialog";
import { listShipments, editShipment, type EditShipmentInput } from "@/lib/api/shipments";
import type { Shipment } from "@/lib/api/types";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/staff/shipments")({
  head: () => ({
    meta: [
      { title: "Shipments | Dahabo Staff Portal" },
      {
        name: "description",
        content:
          "Manage every consignment across the network with filters, bulk actions and export.",
      },
      { property: "og:title", content: "Shipments | Dahabo Staff Portal" },
      {
        property: "og:description",
        content:
          "Manage every consignment across the network with filters, bulk actions and export.",
      },
    ],
  }),
  component: Page,
});

const SHIPMENT_STATUSES: [string, string][] = [
  ["pending", "Pending"],
  ["at_warehouse", "At Warehouse"],
  ["in_transit", "In Transit"],
  ["delayed", "Delayed"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

function Page() {
  const { can } = usePermissions();
  const canCreate = can("shipments", "create");
  const canEdit = can("shipments", "edit");
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [editing, setEditing] = useState<Shipment | null>(null);

  useEffect(() => {
    let active = true;
    listShipments().then((rows) => active && setShipments(rows));
    return () => {
      active = false;
    };
  }, []);

  const columns: Column<Shipment>[] = [
    { key: "shipmentCode", header: "Waybill" },
    { key: "customer", header: "Customer" },
    { key: "origin", header: "Origin" },
    { key: "destination", header: "Destination" },
    { key: "service", header: "Service" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "eta", header: "ETA" },
    { key: "driver", header: "Driver" },
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
            {canEdit ? (
              <DropdownMenuItem onSelect={() => setEditing(r)}>
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Shipments"]}
        title="Shipments"
        description="Every consignment across the network."
        actions={
          canCreate ? (
            <AddShipmentDialog onCreated={(s) => setShipments((rows) => [s, ...(rows ?? [])])} />
          ) : null
        }
      />

      {shipments === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Package className="size-8" />
          <p className="text-sm font-medium text-foreground">No shipments yet</p>
          <p className="max-w-sm text-xs">Shipments you record will show up here.</p>
        </div>
      ) : (
        <DataTable data={shipments} columns={columns} exportFilename="shipments" />
      )}

      <EditShipmentDialog
        shipment={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setShipments((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />
    </>
  );
}

function EditShipmentDialog({
  shipment,
  onClose,
  onSaved,
}: {
  shipment: Shipment | null;
  onClose: () => void;
  onSaved: (shipment: Shipment) => void;
}) {
  const [values, setValues] = useState<EditShipmentInput>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (shipment) {
      setValues({
        origin: shipment.origin,
        destination: shipment.destination,
        service: shipment.service ?? "",
        status: shipment.status,
        eta: shipment.eta ?? "",
      });
    }
  }, [shipment]);

  const set =
    <K extends keyof EditShipmentInput>(k: K) =>
    (v: EditShipmentInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!shipment) return;
    if (!values.origin?.trim() || !values.destination?.trim()) {
      toast.error("Origin and destination are required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editShipment(shipment.id, values);
      toast.success("Shipment updated");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={shipment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit shipment</DialogTitle>
          <DialogDescription>Waybill number can't be changed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Origin</Label>
              <CityCombobox value={values.origin ?? ""} onChange={set("origin")} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Destination</Label>
              <CityCombobox value={values.destination ?? ""} onChange={set("destination")} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Service</Label>
              <Input
                value={values.service ?? ""}
                onChange={(e) => set("service")(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">ETA</Label>
              <Input
                type="date"
                value={values.eta ?? ""}
                onChange={(e) => set("eta")(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm">Status</Label>
              <Select value={values.status ?? "pending"} onValueChange={set("status")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIPMENT_STATUSES.map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
