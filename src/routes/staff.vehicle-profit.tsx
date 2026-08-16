import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
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
import { setVehicleProfitExclusion } from "@/lib/api/vehicles";
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
  const [removing, setRemoving] = useState<VehicleProfitMonth | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listVehicleProfitThisMonth().then((r) => active && setRows(r));
    return () => {
      active = false;
    };
  }, []);

  async function handleRemove() {
    if (!removing) return;
    setBusyId(removing.vehicleId);
    try {
      await setVehicleProfitExclusion(removing.vehicleId, true);
      setRows((r) => (r ?? []).filter((row) => row.vehicleId !== removing.vehicleId));
      toast.success(`${removing.vehicleCode} removed from this month's profit totals`);
    } catch (err) {
      toast.error("Couldn't update this vehicle", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setRemoving(null);
    }
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
              disabled={busyId === r.vehicleId}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onSelect={() => setRemoving(r)}
              className="text-destructive focus:text-destructive"
            >
              <EyeOff className="size-4" /> Remove from profit
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

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.vehicleCode} from this month's profit?</AlertDialogTitle>
            <AlertDialogDescription>
              This takes it out of this list and out of the Dashboard's net profit total for this
              month. It does <strong>not</strong> delete the vehicle — it stays in the Fleet tab, and
              its trips, fuel and maintenance history are unaffected. You can bring it back into
              profit totals any time from the Fleet tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
