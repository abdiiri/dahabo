import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, FlagTriangleRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { StartTripDialog } from "@/components/staff/StartTripDialog";
import { CompleteTripDialog } from "@/components/staff/CompleteTripDialog";
import { listTrips, deleteTrip, editTrip, type EditTripInput } from "@/lib/api/trips";
import { TRIP_STATUS_LABELS, type Trip } from "@/lib/api/types";

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

  const columns: Column<Trip>[] = [
    { key: "tripCode", header: "Trip" },
    { key: "vehicleLabel", header: "Vehicle", render: (r) => r.vehicleLabel ?? "—" },
    { key: "driverName", header: "Driver", render: (r) => r.driverName ?? "—" },
    { key: "origin", header: "Origin" },
    { key: "destination", header: "Destination" },
    {
      key: "distanceKm",
      header: "Distance",
      render: (r) => (r.distanceKm != null ? `${r.distanceKm.toLocaleString()} km` : "—"),
    },
    {
      key: "mileageRatePerKm",
      header: "Mileage rate",
      render: (r) => (r.mileageRatePerKm ? `KSh ${r.mileageRatePerKm}/km` : "—"),
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
        description="Start a trip against a vehicle and driver; complete it with the ending odometer to auto-calculate mileage pay."
        actions={<StartTripDialog onCreated={() => refresh()} />}
      />

      {trips === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={trips} columns={columns} searchPlaceholder="Search trips…" />
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

  useEffect(() => {
    if (trip) {
      setValues({
        origin: trip.origin,
        destination: trip.destination,
        startOdometerKm: trip.startOdometerKm,
        mileageRatePerKm: trip.mileageRatePerKm,
      });
    }
  }, [trip]);

  const set =
    <K extends keyof EditTripInput>(k: K) =>
    (v: EditTripInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!trip) return;
    if (!values.origin?.trim() || !values.destination?.trim()) {
      toast.error("Origin and destination are required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editTrip(trip.id, values);
      toast.success(
        trip.status === "completed" && values.mileageRatePerKm !== trip.mileageRatePerKm
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
            Vehicle and driver can't be changed here. Changing the mileage rate on a completed trip
            recalculates its driver pay and vehicle profit automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Origin</Label>
              <Input value={values.origin ?? ""} onChange={(e) => set("origin")(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Destination</Label>
              <Input
                value={values.destination ?? ""}
                onChange={(e) => set("destination")(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Starting odometer (km)</Label>
              <Input
                type="number"
                min={0}
                value={values.startOdometerKm ?? 0}
                onChange={(e) => set("startOdometerKm")(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Mileage rate (KSh per km)</Label>
              <Input
                type="number"
                min={0}
                value={values.mileageRatePerKm ?? 0}
                onChange={(e) => set("mileageRatePerKm")(Number(e.target.value))}
                placeholder="e.g. 15"
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
