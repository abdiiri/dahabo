import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { listDriverPayments, updateDriverPaymentStatus } from "@/lib/api/driver-payments";
import { DRIVER_PAYMENT_STATUS_LABELS, type DriverPayment } from "@/lib/api/types";

export const Route = createFileRoute("/staff/driver-payments")({
  head: () => ({
    meta: [
      { title: "Driver Payments | Dahabo Staff Portal" },
      { name: "description", content: "Mileage-based driver payments — the flat agreement amount entered when each trip started." },
    ],
  }),
  component: Page,
});

function Page() {
  const [payments, setPayments] = useState<DriverPayment[] | null>(null);

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

  const columns: Column<DriverPayment>[] = [
    { key: "tripCode", header: "Trip", render: (r) => r.tripCode ?? "—" },
    { key: "driverName", header: "Driver", render: (r) => r.driverName ?? "—" },
    { key: "amount", header: "Amount", render: (r) => `KSh ${r.amount.toLocaleString()}` },
    { key: "status", header: "Status", render: (r) => <StatusPill status={DRIVER_PAYMENT_STATUS_LABELS[r.status]} /> },
    {
      key: "id",
      header: "",
      render: (r) =>
        r.status !== "paid" ? (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); markPaid(r.id); }}>
            Mark paid
          </Button>
        ) : null,
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
        <DataTable data={payments} columns={columns} searchPlaceholder="Search payments…" />
      )}
    </>
  );
}
