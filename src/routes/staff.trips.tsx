import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { StartTripDialog } from "@/components/staff/StartTripDialog";
import { CompleteTripDialog } from "@/components/staff/CompleteTripDialog";
import { listTrips } from "@/lib/api/trips";
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
      render: (r) =>
        r.status !== "completed" && r.status !== "cancelled" ? (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setCompleting(r); }}>
            Complete
          </Button>
        ) : null,
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
    </>
  );
}
