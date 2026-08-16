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
import { listDriverPayments, updateDriverPaymentStatus, deleteDriverPayment } from "@/lib/api/driver-payments";
import { DRIVER_PAYMENT_STATUS_LABELS, type DriverPayment } from "@/lib/api/types";

export const Route = createFileRoute("/staff/driver-payments")({
  head: () => ({
    meta: [
      { title: "Driver Payments | Dahabo Staff Portal" },
      { name: "description", content: "Mileage-based driver payments, calculated automatically from completed trips." },
    ],
  }),
  component: Page,
});

function Page() {
  const [payments, setPayments] = useState<DriverPayment[] | null>(null);
  const [deleting, setDeleting] = useState<DriverPayment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    listDriverPayments().then(setPayments);
  }

  useEffect(() => {
    let active = true;
    listDriverPayments().then((rows) => active && setPayments(rows));
    return () => {
      active = false;
    };
  }, []);

  async function markPaid(id: string) {
    try {
      await updateDriverPaymentStatus(id, "paid");
      toast.success("Marked as paid");
      refresh();
    } catch (err) {
      toast.error("Couldn't update payment", { description: getErrorMessage(err) });
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await deleteDriverPayment(deleting.id);
      setPayments((rows) => (rows ?? []).filter((r) => r.id !== deleting.id));
      toast.success(`Payment for ${deleting.tripCode ?? "trip"} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this payment", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  }

  const columns: Column<DriverPayment>[] = [
    { key: "tripCode", header: "Trip", render: (r) => r.tripCode ?? "—" },
    { key: "driverName", header: "Driver", render: (r) => r.driverName ?? "—" },
    { key: "distanceKm", header: "Distance", render: (r) => `${r.distanceKm.toLocaleString()} km` },
    { key: "ratePerKm", header: "Rate", render: (r) => `KSh ${r.ratePerKm}/km` },
    { key: "amount", header: "Amount", render: (r) => `KSh ${r.amount.toLocaleString()}` },
    { key: "status", header: "Status", render: (r) => <StatusPill status={DRIVER_PAYMENT_STATUS_LABELS[r.status]} /> },
    {
      key: "id",
      header: "",
      className: "w-10",
      render: (r) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {r.status !== "paid" ? (
            <Button size="sm" variant="outline" onClick={() => markPaid(r.id)}>
              Mark paid
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" disabled={busyId === r.id}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => setDeleting(r)}
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
        breadcrumb={["Staff", "Driver Payments"]}
        title="Driver Payments"
        description="Mileage pay, calculated automatically when a trip is completed — distance × the driver's rate per km."
      />

      {payments === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={payments} columns={columns} searchPlaceholder="Search payments…" />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the payment record to the Recycle Bin. It can be restored from there, or
              permanently removed later. The trip itself is not affected.
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
