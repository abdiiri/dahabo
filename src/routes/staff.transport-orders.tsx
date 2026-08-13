import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { AddTransportOrderDialog } from "@/components/staff/AddTransportOrderDialog";
import { listTransportOrders, updateTransportOrderStatus } from "@/lib/api/transport-orders";
import { TRANSPORT_ORDER_STATUS_LABELS, type TransportOrder } from "@/lib/api/types";

export const Route = createFileRoute("/staff/transport-orders")({
  head: () => ({
    meta: [
      { title: "Transport Orders | Dahabo Staff Portal" },
      { name: "description", content: "Customer transport orders — pickup, destination and agreed revenue." },
    ],
  }),
  component: Page,
});

function Page() {
  const [orders, setOrders] = useState<TransportOrder[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listTransportOrders().then((rows) => active && setOrders(rows));
    return () => {
      active = false;
    };
  }, []);

  async function markComplete(order: TransportOrder) {
    setBusyId(order.id);
    try {
      await updateTransportOrderStatus(order.id, "completed");
      setOrders((rows) => (rows ?? []).map((r) => (r.id === order.id ? { ...r, status: "completed" } : r)));
      toast.success(`${order.orderCode} marked complete`);
    } catch (err) {
      toast.error("Couldn't update this order", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<TransportOrder>[] = [
    { key: "orderCode", header: "Order" },
    { key: "customerName", header: "Customer", render: (r) => r.customerName ?? "—" },
    { key: "pickupLocation", header: "Pickup" },
    { key: "destination", header: "Destination" },
    { key: "agreedAmount", header: "Amount", render: (r) => `KSh ${r.agreedAmount.toLocaleString()}` },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={TRANSPORT_ORDER_STATUS_LABELS[r.status]} />,
    },
    {
      key: "id",
      header: "",
      render: (r) =>
        r.status !== "completed" && r.status !== "cancelled" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === r.id}
            onClick={(e) => {
              e.stopPropagation();
              markComplete(r);
            }}
          >
            Mark complete
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Transport Orders"]}
        title="Transport Orders"
        description="Jobs requested by customers — the starting point for every trip. Completing the linked trip marks the order complete automatically, or mark it complete here directly."
        actions={<AddTransportOrderDialog onCreated={(o) => setOrders((rows) => [o, ...(rows ?? [])])} />}
      />

      {orders === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={orders} columns={columns} searchPlaceholder="Search orders…" />
      )}
    </>
  );
}
