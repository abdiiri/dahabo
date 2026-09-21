import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, FlagTriangleRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, recentMonthOptions, monthLabel, isInMonth } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StartTripDialog } from "@/components/staff/StartTripDialog";
import { CompleteTripDialog } from "@/components/staff/CompleteTripDialog";
import { listTrips, deleteTrip, editTrip, listActiveTripAssignments, type EditTripInput } from "@/lib/api/trips";
import { listDrivers } from "@/lib/api/drivers";
import { listVehicles } from "@/lib/api/vehicles";
import { TRIP_STATUS_LABELS, type Trip, type Driver, type Vehicle } from "@/lib/api/types";
import { useRefetchOnFocus } from "@/lib/use-refetch-on-focus";

export const Route = createFileRoute("/staff/trips")({
  head: () => ({
    meta: [
      { title: "Trips | Dahabo Staff Portal" },
      { name: "description", content: "Vehicle trips, mileage and driver pay — start a trip, complete it to calculate pay automatically." },
    ],
  }),
  component: Page,
});

function Page() {
  const monthOptions = recentMonthOptions();
  const [month, setMonth] = useState(monthOptions[0]);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [completing, setCompleting] = useState<Trip | null>(null);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    listTrips().then(setTrips);
  }

  useEffect(() => {
    let active = true;
    listTrips().then((rows) => active && setTrips(rows));
    return () => {
      active = false;
    };
  }, []);

  // Coming back to a tab that's been open a while shouldn't keep showing
  // something an admin already deleted elsewhere — refetch when it's
  // looked at again instead of only ever fetching once on mount.
  useRefetchOnFocus(refresh);

  async function handleDelete() {
    if (!deletingId) return;
    const trip = (trips ?? []).find((r) => r.id === deletingId);
    setBusyId(deletingId);
    try {
      await deleteTrip(deletingId);
      setTrips((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success(`Trip ${trip?.tripCode ?? ""} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this trip", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const filteredTrips = useMemo(() => {
    return (trips ?? []).filter((t) => isInMonth(t.createdAt, month));
  }, [trips, month]);

  const columns: Column<Trip>[] = [
    { key: "tripCode", header: "Trip" },
    { key: "vehicleLabel", header: "Vehicle", render: (r) => r.vehicleLabel ?? "—" },
    { key: "driverName", header: "Driver", render: (r) => r.driverName ?? "—" },
    { key: "origin", header: "Origin" },
    { key: "destination", header: "Destination" },
    {
      key: "startedAt",
      header: "Started",
      render: (r) => (r.startedAt ? new Date(r.startedAt).toLocaleString() : "—"),
    },
    {
      key: "completedAt",
      header: "Completed",
      render: (r) => (r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"),
    },
    {
      key: "mileageAmount",
      header: "Mileage pay",
      render: (r) => (r.mileageAmount ? `KSh ${r.mileageAmount.toLocaleString()}` : "—"),
    },
    {
      key: "permitCost",
      header: "Permit fee",
      render: (r) => (r.permitCost ? `KSh ${r.permitCost.toLocaleString()}` : "—"),
    },
    { key: "status", header: "Status", render: (r) => <StatusPill status={TRIP_STATUS_LABELS[r.status]} /> },
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
            {r.status !== "completed" && r.status !== "cancelled" ? (
              <DropdownMenuItem onSelect={() => setCompleting(r)}>
                <FlagTriangleRight className="size-4" /> Complete
              </DropdownMenuItem>
            ) : null}
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
        breadcrumb={["Staff", "Trips"]}
        title="Trips"
        description="Start a trip against a vehicle and driver, entering the agreed mileage pay up front — no distance calculation needed."
        actions={
          <div className="flex flex-wrap gap-2">
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
            <StartTripDialog onCreated={() => refresh()} />
          </div>
        }
      />

      {trips === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable
          data={filteredTrips}
          columns={columns}
          searchPlaceholder="Search trips…"
          exportFilename="trips"
        />
      )}

      <CompleteTripDialog
        trip={completing}
        open={completing !== null}
        onOpenChange={(open) => !open && setCompleting(null)}
        onCompleted={() => refresh()}
      />

      <EditTripDialog
        trip={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setTrips((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the trip to the Recycle Bin. It can be restored from there, or permanently
              removed later.
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

function EditTripDialog({
  trip,
  onClose,
  onSaved,
}: {
  trip: Trip | null;
  onClose: () => void;
  onSaved: (trip: Trip) => void;
}) {
  const [values, setValues] = useState<EditTripInput>({});
  const [submitting, setSubmitting] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [busyDriverIds, setBusyDriverIds] = useState<Set<string>>(new Set());
  const [busyVehicleIds, setBusyVehicleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (trip) {
      setValues({
        origin: trip.origin,
        destination: trip.destination,
        mileageAmount: trip.mileageAmount,
        permitCost: trip.permitCost,
        driverId: trip.driverId,
        vehicleId: trip.vehicleId,
      });
      listDrivers().then(setDrivers);
      listVehicles().then(setVehicles);
      listActiveTripAssignments().then(({ tripByDriverId, tripByVehicleId }) => {
        // Everyone/everything with an active trip is off-limits, except
        // whoever/whatever is already on THIS trip — that's this trip's
        // own assignment, not a conflict, and needs to stay selectable so
        // "no change" is an option.
        const busyDrivers = new Set(tripByDriverId.keys());
        busyDrivers.delete(trip.driverId);
        setBusyDriverIds(busyDrivers);
        const busyVehicles = new Set(tripByVehicleId.keys());
        busyVehicles.delete(trip.vehicleId);
        setBusyVehicleIds(busyVehicles);
      });
    }
  }, [trip]);

  const set =
    <K extends keyof EditTripInput>(k: K) =>
    (v: EditTripInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  // Only available drivers, or whoever is already on this trip, can be
  // picked — same rule Start Trip uses, so a driver already out on another
  // job can't be double-booked here either.
  const assignableDrivers = drivers.filter(
    (d) => d.id === trip?.driverId || (d.status === "available" && !busyDriverIds.has(d.id)),
  );
  // Same idea for vehicles: active fleet only, and not already out on
  // another trip — a wrong vehicle picked by mistake can be swapped, but
  // never onto one that's already busy elsewhere.
  const assignableVehicles = vehicles.filter(
    (v) => v.id === trip?.vehicleId || (v.status === "active" && !busyVehicleIds.has(v.id)),
  );

  async function handleSubmit() {
    if (!trip) return;
    if (!values.origin?.trim() || !values.destination?.trim()) {
      toast.error("Origin and destination are required");
      return;
    }
    if (!values.driverId) {
      toast.error("Pick a driver");
      return;
    }
    if (!values.vehicleId) {
      toast.error("Pick a vehicle");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editTrip(trip.id, values);
      const reassignedDriver = values.driverId !== trip.driverId;
      const reassignedVehicle = values.vehicleId !== trip.vehicleId;
      toast.success(
        reassignedDriver && reassignedVehicle
          ? "Trip reassigned to a new driver and vehicle"
          : reassignedVehicle
            ? "Trip reassigned to a new vehicle"
            : reassignedDriver
              ? "Trip reassigned to a new driver"
              : values.mileageAmount !== trip.mileageAmount
                ? "Trip updated — mileage pay and vehicle profit recalculated"
                : "Trip updated",
      );
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={trip !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit trip {trip?.tripCode}</DialogTitle>
          <DialogDescription>
            Reassigning the driver or vehicle — say, if the wrong one was picked by mistake — moves
            the pending pay to the new driver and won't allow one already out on another trip.
            Changing the mileage amount recalculates driver pay and vehicle profit automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Driver</Label>
              <Select value={values.driverId ?? ""} onValueChange={set("driverId")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableDrivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Vehicle</Label>
              <Select value={values.vehicleId ?? ""} onValueChange={set("vehicleId")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Origin</Label>
              <CityCombobox value={values.origin ?? ""} onChange={set("origin")} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Destination</Label>
              <CityCombobox value={values.destination ?? ""} onChange={set("destination")} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Mileage agreement (KSh)</Label>
              <Input
                type="number"
                min={0}
                value={values.mileageAmount || ""}
                onChange={(e) => set("mileageAmount")(Number(e.target.value))}
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Permit / legal fees (KSh)</Label>
              <Input
                type="number"
                min={0}
                value={values.permitCost || ""}
                onChange={(e) => set("permitCost")(Number(e.target.value))}
                placeholder="e.g. 2000"
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
