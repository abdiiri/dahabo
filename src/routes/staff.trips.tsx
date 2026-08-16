import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { StartTripDialog } from "@/components/staff/StartTripDialog";
import { CompleteTripDialog } from "@/components/staff/CompleteTripDialog";
import { listTrips, deleteTrip } from "@/lib/api/trips";
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
      toast.success(`${trip?.tripCode ?? "Trip"} was removed`, {
        description: "Its driver payment and fuel records went with it.",
      });
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
    { key: "status", header: "Status", render: (r) => <StatusPill status={TRIP_STATUS_LABELS[r.status]} /> },
    {
      key: "id",
      header: "",
      className: "w-10",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status !== "completed" && r.status !== "cancelled" ? (
            <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={(e) => { e.stopPropagation(); setCompleting(r); }}>
              Complete
            </Button>
          ) : null}
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
              <DropdownMenuItem
                onSelect={() => setDeletingId(r.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This also removes its driver payment and any fuel records logged against it.
              Everything moves to the Recycle Bin, where it can be restored later or permanently
              deleted.
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
