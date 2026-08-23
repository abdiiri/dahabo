import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CityCombobox } from "@/components/common/CityCombobox";
import { CustomerSelect } from "@/components/common/CustomerSelect";
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
import { AddTransportOrderDialog } from "@/components/staff/AddTransportOrderDialog";
import {
  listTransportOrders,
  updateTransportOrderStatus,
  editTransportOrder,
  deleteTransportOrder,
  type EditTransportOrderInput,
} from "@/lib/api/transport-orders";
import { listTrips } from "@/lib/api/trips";
import { listCustomers } from "@/lib/api/customers";
import { TRANSPORT_ORDER_STATUS_LABELS, type TransportOrder, type Customer, type Trip } from "@/lib/api/types";

/** Compact "18 Aug 2026, 10:30 AM" style date + time, matching how Trips
 * displays its own timestamps. */
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A trip still on the road for this order — the reason "Mark complete"
 * gets blocked. Cancelled trips don't count: a cancelled trip shouldn't
 * stop staff from completing the order some other way. */
function findBlockingTrip(orderId: string, trips: Trip[]): Trip | undefined {
  return trips.find(
    (t) => t.transportOrderId === orderId && (t.status === "in_progress" || t.status === "scheduled"),
  );
}

export const Route = createFileRoute("/staff/transport-orders")({
  head: () => ({
    meta: [
      { title: "Transport Orders | Dahabo Staff Portal" },
      {
        name: "description",
        content: "Customer transport orders — pickup, destination and agreed revenue.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const [orders, setOrders] = useState<TransportOrder[] | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TransportOrder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [blockedOrder, setBlockedOrder] = useState<{ order: TransportOrder; trip: Trip } | null>(null);

  useEffect(() => {
    let active = true;
    listTransportOrders().then((rows) => active && setOrders(rows));
    listTrips().then((rows) => active && setTrips(rows));
    return () => {
      active = false;
    };
  }, []);

  async function markComplete(order: TransportOrder) {
    // An order's own trip is what actually earns the money — completing the
    // order while that trip is still on the road would mark the job "done"
    // even though it isn't, and the revenue wouldn't show up on Vehicle
    // Profit until the trip itself is completed anyway. So this order stays
    // blocked here until its trip is finished (or was never started).
    const blocking = findBlockingTrip(order.id, trips);
    if (blocking) {
      setBlockedOrder({ order, trip: blocking });
      return;
    }
    setBusyId(order.id);
    try {
      await updateTransportOrderStatus(order.id, "completed");
      setOrders((rows) =>
        (rows ?? []).map((r) => (r.id === order.id ? { ...r, status: "completed" } : r)),
      );
      toast.success(`${order.orderCode} marked complete`);
    } catch (err) {
      toast.error("Couldn't update this order", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    const order = (orders ?? []).find((r) => r.id === deletingId);
    setBusyId(deletingId);
    try {
      await deleteTransportOrder(deletingId);
      setOrders((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success(`${order?.orderCode ?? "Order"} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this order", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<TransportOrder>[] = [
    { key: "orderCode", header: "Order" },
    { key: "customerName", header: "Customer", render: (r) => r.customerName ?? "—" },
    { key: "pickupLocation", header: "Pickup" },
    { key: "destination", header: "Destination" },
    {
      key: "agreedAmount",
      header: "Amount",
      render: (r) => `KSh ${r.agreedAmount.toLocaleString()}`,
    },
    {
      key: "createdAt",
      header: "Date & Time",
      render: (r) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={TRANSPORT_ORDER_STATUS_LABELS[r.status]} />,
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
            <DropdownMenuItem onSelect={() => setEditing(r)}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            {r.status !== "completed" && r.status !== "cancelled" ? (
              <DropdownMenuItem onSelect={() => markComplete(r)}>
                {findBlockingTrip(r.id, trips) ? "Mark complete…" : "Mark complete"}
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
        breadcrumb={["Staff", "Transport Orders"]}
        title="Transport Orders"
        description="Jobs requested by customers — the starting point for every trip. Completing the linked trip marks the order complete automatically, or mark it complete here directly."
        actions={
          <AddTransportOrderDialog onCreated={(o) => setOrders((rows) => [o, ...(rows ?? [])])} />
        }
      />

      {orders === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={orders} columns={columns} searchPlaceholder="Search orders…" exportFilename="transport-orders" />
      )}

      <EditTransportOrderDialog
        order={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setOrders((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the order to the Recycle Bin. It can be restored from there, or permanently
              removed later. Any trip already linked to it is not affected.
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

      <AlertDialog open={blockedOrder !== null} onOpenChange={(open) => !open && setBlockedOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Can't mark {blockedOrder?.order.orderCode} complete yet</AlertDialogTitle>
            <AlertDialogDescription>
              Trip {blockedOrder?.trip.tripCode ?? ""} for this order is still{" "}
              {blockedOrder?.trip.status === "in_progress" ? "in progress" : "scheduled"} — it hasn't
              finished. Completing the order now would mark the job done while the trip (and its
              revenue on Vehicle Profit) still isn't. Complete the trip from the Trips page first, and
              this order will complete automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlockedOrder(null)}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditTransportOrderDialog({
  order,
  onClose,
  onSaved,
}: {
  order: TransportOrder | null;
  onClose: () => void;
  onSaved: (order: TransportOrder) => void;
}) {
  const [values, setValues] = useState<EditTransportOrderInput>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      listCustomers().then(setCustomers);
      setValues({
        customerId: order.customerId,
        pickupLocation: order.pickupLocation,
        destination: order.destination,
        agreedAmount: order.agreedAmount,
        notes: order.notes ?? "",
      });
    }
  }, [order]);

  const set =
    <K extends keyof EditTransportOrderInput>(k: K) =>
    (v: EditTransportOrderInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!order) return;
    if (!values.pickupLocation?.trim() || !values.destination?.trim()) {
      toast.error("Pickup location and destination are required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editTransportOrder(order.id, values);
      toast.success("Order updated");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit transport order</DialogTitle>
          <DialogDescription>Order code can't be changed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Customer (optional)</Label>
            <CustomerSelect
              customers={customers}
              value={values.customerId}
              onChange={set("customerId")}
              onCustomerCreated={(c) => setCustomers((rows) => [c, ...rows])}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Pickup location</Label>
              <CityCombobox
                value={values.pickupLocation ?? ""}
                onChange={set("pickupLocation")}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Destination</Label>
              <CityCombobox value={values.destination ?? ""} onChange={set("destination")} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Agreed amount (revenue)</Label>
            <Input
              type="number"
              min={0}
              value={values.agreedAmount || ""}
              onChange={(e) => set("agreedAmount")(Number(e.target.value))}
            />
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
