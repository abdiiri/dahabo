import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
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
import { listVehicleProfitThisMonth } from "@/lib/api/vehicle-profit";
import { isDismissed, dismissVehicleProfitRow } from "@/lib/api/vehicle-profit-dismissals";
import type { VehicleProfitMonth } from "@/lib/api/types";

export const Route = createFileRoute("/staff/vehicle-profit")({
  head: () => ({
    meta: [
      { title: "Vehicle Profit | Dahabo Staff Portal" },
      { name: "description", content: "Revenue minus fuel, maintenance and mileage pay, per vehicle, for the current month." },
    ],
  }),
  component: Page,
});

const money = (n: number) => `KSh ${n.toLocaleString()}`;

function Page() {
  const [rows, setRows] = useState<VehicleProfitMonth[] | null>(null);
  const [deleting, setDeleting] = useState<VehicleProfitMonth | null>(null);

  useEffect(() => {
    let active = true;
    listVehicleProfitThisMonth().then((r) => {
      if (!active) return;
      setRows(r.filter((row) => !isDismissed(row.vehicleId, row.periodMonth)));
    });
    return () => {
      active = false;
    };
  }, []);

  function handleDelete() {
    if (!deleting) return;
    dismissVehicleProfitRow(deleting.vehicleId, deleting.periodMonth);
    setRows((r) => (r ?? []).filter((row) => row.id !== deleting.id));
    toast.success(`${deleting.vehicleCode} removed from this view`);
    setDeleting(null);
  }

  const columns: Column<VehicleProfitMonth>[] = [
    { key: "vehicleCode", header: "Vehicle", render: (r) => `${r.vehicleCode} · ${r.plateNumber}` },
    { key: "revenue", header: "Revenue", render: (r) => money(r.revenue) },
    { key: "fuelCost", header: "Fuel", render: (r) => `− ${money(r.fuelCost)}` },
    { key: "maintenanceCost", header: "Maintenance", render: (r) => `− ${money(r.maintenanceCost)}` },
    { key: "mileagePayments", header: "Mileage pay", render: (r) => `− ${money(r.mileagePayments)}` },
    {
      key: "netProfit",
      header: "Net profit",
      render: (r) => (
        <span className={r.netProfit >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
          {money(r.netProfit)}
        </span>
      ),
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
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onSelect={() => setDeleting(r)}
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
        breadcrumb={["Staff", "Vehicle Profit"]}
        title="Vehicle Profit"
        description="This month, per vehicle: revenue minus fuel, maintenance and mileage pay."
      />

      {rows === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={rows} columns={columns} searchPlaceholder="Search vehicles…" />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.vehicleCode} from this view?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes it from the Vehicle Profit list — the vehicle itself stays in
              Fleet and everywhere else, untouched.
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
