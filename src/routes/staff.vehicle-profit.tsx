import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, EyeOff, Fuel } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      {
        name: "description",
        content:
          "Revenue minus fuel, maintenance and mileage pay, per vehicle, for the current month.",
      },
    ],
  }),
  component: Page,
});

const money = (n: number) => `KSh ${n.toLocaleString()}`;

function Page() {
  const [rows, setRows] = useState<VehicleProfitMonth[] | null>(null);
  const [removing, setRemoving] = useState<VehicleProfitMonth | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fuelBreakdownFor, setFuelBreakdownFor] = useState<VehicleProfitMonth | null>(null);

  useEffect(() => {
    let active = true;
    listVehicleProfitThisMonth()
      .then((r) => active && setRows(r))
      .catch((err) => {
        if (!active) return;
        toast.error("Couldn't load vehicle profit", { description: getErrorMessage(err) });
        setRows([]);
      });
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
      toast.success(`${removing.plateNumber} removed from this month's profit totals`);
    } catch (err) {
      toast.error("Couldn't update this vehicle", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setRemoving(null);
    }
  }

  const columns: Column<VehicleProfitMonth>[] = [
    { key: "plateNumber", header: "Vehicle", render: (r) => r.plateNumber },
    { key: "revenue", header: "Revenue", render: (r) => money(r.revenue) },
    {
      key: "fuelCost",
      header: "Fuel",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span>− {money(r.fuelCost)}</span>
          {r.fuelEntries.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFuelBreakdownFor(r);
              }}
              className="text-left text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              {r.fuelEntries.length > 1
                ? `View breakdown (${r.fuelEntries.length} fill-ups)`
                : "View breakdown"}
            </button>
          ) : null}
        </div>
      ),
    },
    {
      key: "maintenanceCost",
      header: "Maintenance",
      render: (r) => `− ${money(r.maintenanceCost)}`,
    },
    {
      key: "mileagePayments",
      header: "Mileage pay",
      render: (r) => `− ${money(r.mileagePayments)}`,
    },
    {
      key: "permitCosts",
      header: "Permit fees",
      render: (r) => `− ${money(r.permitCosts)}`,
    },
    {
      key: "netProfit",
      header: "Net profit",
      render: (r) => (
        <span
          className={
            r.netProfit >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"
          }
        >
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
        <DataTable
          data={rows}
          columns={columns}
          searchPlaceholder="Search vehicles…"
          exportFilename="vehicle-profit"
          renderExpanded={(r) => {
            const hasAnything =
              r.trips.length > 0 || r.fuelEntries.length > 0 || r.maintenanceEntries.length > 0;
            if (!hasAnything) {
              return (
                <p className="text-sm text-muted-foreground">
                  No trips, fuel or maintenance recorded for this vehicle this month.
                </p>
              );
            }
            return (
              <div className="space-y-5">
                {r.trips.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {r.trips.length} trip{r.trips.length > 1 ? "s" : ""} this month · revenue
                      earned and mileage pay deducted
                    </p>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="bg-surface">
                          <tr className="text-left">
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Date
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Trip
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Revenue
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Mileage pay
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Permit fee
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Trip net
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.trips.map((t) => (
                            <tr key={t.tripId} className="border-t border-border">
                              <td className="whitespace-nowrap px-3 py-2">
                                {new Date(t.completedAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2">
                                {t.tripCode ? (
                                  <span className="font-medium">{t.tripCode}</span>
                                ) : null}
                                <span className="text-muted-foreground">
                                  {t.tripCode ? " · " : ""}
                                  {t.origin} → {t.destination}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-success">
                                + {money(t.revenue)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-destructive">
                                − {money(t.mileagePayment)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-destructive">
                                {t.permitCost ? `− ${money(t.permitCost)}` : "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 font-semibold">
                                {money(t.revenue - t.mileagePayment - t.permitCost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {r.fuelEntries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {r.fuelEntries.length} fuel purchase
                      {r.fuelEntries.length > 1 ? "s" : ""} this month · each fill-up shown
                      separately, not combined
                    </p>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="bg-surface">
                          <tr className="text-left">
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Date
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Fuel #
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Trip
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Liters
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.fuelEntries.map((f) => (
                            <tr key={f.fuelRecordId} className="border-t border-border">
                              <td className="whitespace-nowrap px-3 py-2">
                                {new Date(f.filledAt).toLocaleDateString()}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 font-medium">
                                {f.fuelCode ?? "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                {f.tripCode ?? "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                {f.liters.toLocaleString()} L
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-destructive">
                                − {money(f.cost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border bg-surface">
                            <td colSpan={4} className="px-3 py-2 text-right font-semibold">
                              Total fuel deducted
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-semibold text-destructive">
                              − {money(r.fuelCost)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {r.maintenanceEntries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {r.maintenanceEntries.length} maintenance job
                      {r.maintenanceEntries.length > 1 ? "s" : ""} this month
                    </p>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="bg-surface">
                          <tr className="text-left">
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Date
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Description
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Vendor
                            </th>
                            <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.maintenanceEntries.map((m) => (
                            <tr key={m.maintenanceRecordId} className="border-t border-border">
                              <td className="whitespace-nowrap px-3 py-2">
                                {new Date(m.serviceDate).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2">{m.description}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {m.vendor ?? "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-destructive">
                                − {money(m.cost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">
                    Revenue <span className="font-semibold text-success">{money(r.revenue)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    − Fuel{" "}
                    <span className="font-semibold text-destructive">{money(r.fuelCost)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    − Maintenance{" "}
                    <span className="font-semibold text-destructive">
                      {money(r.maintenanceCost)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    − Mileage pay{" "}
                    <span className="font-semibold text-destructive">
                      {money(r.mileagePayments)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    − Permit fees{" "}
                    <span className="font-semibold text-destructive">
                      {money(r.permitCosts)}
                    </span>
                  </span>
                  <span>
                    = Net{" "}
                    <span
                      className={
                        r.netProfit >= 0
                          ? "font-bold text-success"
                          : "font-bold text-destructive"
                      }
                    >
                      {money(r.netProfit)}
                    </span>
                  </span>
                </div>
              </div>
            );
          }}
        />
      )}

      <Dialog open={fuelBreakdownFor !== null} onOpenChange={(open) => !open && setFuelBreakdownFor(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="size-4" />
              Fuel breakdown — {fuelBreakdownFor?.plateNumber}
            </DialogTitle>
            <DialogDescription>
              {fuelBreakdownFor?.fuelEntries.length ?? 0} fill-up
              {(fuelBreakdownFor?.fuelEntries.length ?? 0) > 1 ? "s" : ""} this month, shown
              separately so it's clear how the total fuel figure was reached.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface">
                <tr className="text-left">
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Fuel #
                  </th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Trip
                  </th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Liters
                  </th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {fuelBreakdownFor?.fuelEntries.map((f) => (
                  <tr key={f.fuelRecordId} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2">
                      {new Date(f.filledAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{f.fuelCode ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {f.tripCode ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{f.liters.toLocaleString()} L</td>
                    <td className="whitespace-nowrap px-3 py-2 text-destructive">
                      − {money(f.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface">
                  <td colSpan={4} className="px-3 py-2 text-right font-semibold">
                    Total fuel deducted
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-destructive">
                    − {money(fuelBreakdownFor?.fuelCost ?? 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removing?.plateNumber} from this month's profit?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This takes it out of this list and out of the Dashboard's net profit total for this
              month. It does <strong>not</strong> delete the vehicle — it stays in the Fleet tab,
              and its trips, fuel and maintenance history are unaffected. You can bring it back into
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
