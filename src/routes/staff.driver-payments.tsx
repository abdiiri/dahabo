import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Loader2,
  MoreHorizontal,
  Trash2,
  BadgeCheck,
  Wallet,
  Clock,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
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
import {
  listDriverPayments,
  updateDriverPaymentStatus,
  deleteDriverPayment,
} from "@/lib/api/driver-payments";
import { listTrips } from "@/lib/api/trips";
import { extractRefNumber } from "@/lib/api/local-store";
import {
  DRIVER_PAYMENT_STATUS_LABELS,
  TRIP_STATUS_LABELS,
  type DriverPayment,
  type DriverPaymentStatus,
  type Trip,
} from "@/lib/api/types";

export const Route = createFileRoute("/staff/driver-payments")({
  head: () => ({
    meta: [
      { title: "Driver Payments | Dahabo Staff Portal" },
      {
        name: "description",
        content:
          "Mileage-based driver payments — the flat agreement amount entered when each trip started.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const [payments, setPayments] = useState<DriverPayment[] | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [statusFilter, setStatusFilter] = useState<DriverPaymentStatus | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listDriverPayments().then((rows) => active && setPayments(rows));
    listTrips().then((rows) => active && setTrips(rows));
    return () => {
      active = false;
    };
  }, []);

  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips]);

  // Default view order: most recent trip first, descending — not creation
  // order. Users can still click the Trip column header to flip it or sort
  // by something else entirely; this only sets what they see before
  // touching a header.
  const sortedPayments = useMemo(() => {
    const rows = payments ?? [];
    return [...rows].sort(
      (a, b) => (extractRefNumber(b.tripCode) ?? 0) - (extractRefNumber(a.tripCode) ?? 0),
    );
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (statusFilter === "all") return sortedPayments;
    return sortedPayments.filter((p) => p.status === statusFilter);
  }, [sortedPayments, statusFilter]);

  // Totals always reflect every payment, not just the filtered view — so
  // the numbers up top stay a stable summary while the filter narrows the
  // table below it.
  const totals = useMemo(() => {
    const rows = payments ?? [];
    const sum = (status: DriverPaymentStatus) =>
      rows.filter((p) => p.status === status).reduce((acc, p) => acc + p.amount, 0);
    return { pending: sum("pending"), approved: sum("approved"), paid: sum("paid") };
  }, [payments]);

  async function setStatus(payment: DriverPayment, status: DriverPaymentStatus) {
    setBusyId(payment.id);
    try {
      await updateDriverPaymentStatus(payment.id, status);
      setPayments((rows) => (rows ?? []).map((r) => (r.id === payment.id ? { ...r, status } : r)));
      toast.success(status === "paid" ? "Marked as paid" : "Marked as approved");
    } catch (err) {
      toast.error("Couldn't update this payment", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setBusyId(deletingId);
    try {
      await deleteDriverPayment(deletingId);
      setPayments((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success("Payment was removed");
    } catch (err) {
      toast.error("Couldn't delete this payment", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<DriverPayment>[] = [
    { key: "tripCode", header: "Trip", render: (r) => r.tripCode ?? "—" },
    { key: "driverName", header: "Driver", render: (r) => r.driverName ?? "—" },
    { key: "amount", header: "Amount", render: (r) => `KSh ${r.amount.toLocaleString()}` },
    {
      key: "createdAt",
      header: "Date",
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={DRIVER_PAYMENT_STATUS_LABELS[r.status]} />,
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
            {r.status === "pending" ? (
              <DropdownMenuItem onSelect={() => setStatus(r, "approved")}>
                <BadgeCheck className="size-4" /> Approve
              </DropdownMenuItem>
            ) : null}
            {r.status !== "paid" ? (
              <DropdownMenuItem onSelect={() => setStatus(r, "paid")}>
                <Wallet className="size-4" /> Mark paid
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
        breadcrumb={["Staff", "Driver Payments"]}
        title="Driver Payments"
        description="Mileage pay — the flat agreement amount entered when each trip was started."
      />

      {payments === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Pending"
              value={`KSh ${totals.pending.toLocaleString()}`}
              icon={Clock}
              tone="warning"
            />
            <StatCard
              label="Approved"
              value={`KSh ${totals.approved.toLocaleString()}`}
              icon={BadgeCheck}
              tone="default"
            />
            <StatCard
              label="Paid"
              value={`KSh ${totals.paid.toLocaleString()}`}
              icon={CheckCircle2}
              tone="success"
            />
          </section>

          <DataTable
            data={filteredPayments}
            columns={columns}
            searchPlaceholder="Search payments…"
            exportFilename="driver-payments"
            toolbar={
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as DriverPaymentStatus | "all")}
              >
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(Object.keys(DRIVER_PAYMENT_STATUS_LABELS) as DriverPaymentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {DRIVER_PAYMENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            renderExpanded={(r) => {
              const trip = tripById.get(r.tripId);
              if (!trip) {
                return (
                  <p className="text-sm text-muted-foreground">Trip details aren't available.</p>
                );
              }
              return (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Route
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                      {trip.origin} → {trip.destination}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Vehicle
                    </p>
                    <p className="mt-1 text-sm">{trip.vehicleLabel ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Trip status
                    </p>
                    <p className="mt-1">
                      <StatusPill status={TRIP_STATUS_LABELS[trip.status]} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Started / Completed
                    </p>
                    <p className="mt-1 text-sm">
                      {trip.startedAt ? new Date(trip.startedAt).toLocaleDateString() : "—"}
                      {" – "}
                      {trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              );
            }}
          />
        </>
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the payment to the Recycle Bin. It can be restored from there, or
              permanently removed later. The trip it came from isn't affected — only this payment
              record is removed.
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
