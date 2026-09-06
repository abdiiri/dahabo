import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { listVehicles } from "./vehicles";
import { listTrips } from "./trips";
import { listTransportOrders } from "./transport-orders";
import { listFuelRecords } from "./fuel-records";
import { listMaintenanceRecords } from "./maintenance-records";
import { listDriverPayments } from "./driver-payments";
import type {
  Trip,
  TransportOrder,
  DriverPayment,
  FuelRecord,
  MaintenanceRecord,
  VehicleProfitMonth,
  VehicleProfitTrip,
  VehicleProfitFuelEntry,
  VehicleProfitMaintenanceEntry,
} from "./types";

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "2026-08"
}

/** First day of the month after the given "YYYY-MM" key, as "YYYY-MM-DD" —
 * an always-valid exclusive upper bound for a month-range query. Building
 * this as `${thisMonth}-31` instead (as a previous version of this file
 * did) breaks every month with fewer than 31 days: Postgres rejects
 * "2026-09-31" outright since September has no 31st. */
function firstDayOfNextMonth(monthOf: string): string {
  const [year, month] = monthOf.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1)); // JS Date rolls Dec -> next Jan automatically
  return next.toISOString().slice(0, 10);
}

/** Builds the per-trip breakdown (exact revenue + mileage pay per trip) for
 * one vehicle in one month, from trips/orders/payments already in memory. */
function tripBreakdownFor(
  vehicleId: string,
  monthOf: string,
  trips: Trip[],
  orders: TransportOrder[],
  payments: DriverPayment[],
): VehicleProfitTrip[] {
  return trips
    .filter(
      (t) =>
        t.vehicleId === vehicleId &&
        t.status === "completed" &&
        t.completedAt &&
        monthKey(t.completedAt) === monthOf,
    )
    .map((t) => {
      const order = orders.find((o) => o.id === t.transportOrderId);
      const payment = payments.find((p) => p.tripId === t.id);
      return {
        tripId: t.id,
        tripCode: t.tripCode,
        origin: t.origin,
        destination: t.destination,
        completedAt: t.completedAt as string,
        revenue: order?.agreedAmount ?? 0,
        mileagePayment: payment?.amount ?? 0,
        permitCost: t.permitCost ?? 0,
      };
    })
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/** Every fuel purchase for one vehicle in one month, kept as separate
 * entries (not summed) so two fill-ups on the same vehicle both show up
 * with their own date and cost. Linked back to a trip code when the fuel
 * record has a trip_id, so it's clear which trip a fill-up belongs to. */
function fuelBreakdownFor(
  vehicleId: string,
  monthOf: string,
  fuel: FuelRecord[],
  trips: Trip[],
): VehicleProfitFuelEntry[] {
  return fuel
    .filter((f) => f.vehicleId === vehicleId && monthKey(f.filledAt) === monthOf)
    .map((f) => {
      const trip = f.tripId ? trips.find((t) => t.id === f.tripId) : undefined;
      return {
        fuelRecordId: f.id,
        fuelCode: f.fuelCode,
        tripId: f.tripId,
        tripCode: trip?.tripCode,
        liters: f.liters,
        cost: f.cost,
        filledAt: f.filledAt,
      };
    })
    .sort((a, b) => a.filledAt.localeCompare(b.filledAt));
}

/** Every maintenance job for one vehicle in one month, kept as separate
 * entries rather than summed into one figure. */
function maintenanceBreakdownFor(
  vehicleId: string,
  monthOf: string,
  maintenance: MaintenanceRecord[],
): VehicleProfitMaintenanceEntry[] {
  return maintenance
    .filter((m) => m.vehicleId === vehicleId && monthKey(m.serviceDate) === monthOf)
    .map((m) => ({
      maintenanceRecordId: m.id,
      description: m.description,
      vendor: m.vendor,
      cost: m.cost,
      serviceDate: m.serviceDate,
    }))
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
}

/** Vehicle profit for a given calendar month ("YYYY-MM"; defaults to the
 * current month), per vehicle. Real data, computed either from Supabase or
 * from local/demo records — same formula either way. Each row also carries
 * a per-trip, per-fuel-purchase, and per-maintenance-job breakdown so
 * nothing gets flattened into one blended number — every KSh deducted is
 * traceable to a specific date and record. */
export async function listVehicleProfitForMonth(monthOf?: string): Promise<VehicleProfitMonth[]> {
  const thisMonth = monthOf ?? monthKey(new Date().toISOString());

  if (isSupabaseConfigured && supabase) {
    const [{ data, error }, trips, orders, payments, fuel, maintenance] = await Promise.all([
      supabase
        .from("vehicle_profit_monthly")
        .select("*")
        .gte("period_month", `${thisMonth}-01`)
        .lt("period_month", firstDayOfNextMonth(thisMonth)),
      listTrips(),
      listTransportOrders(),
      listDriverPayments(),
      listFuelRecords(),
      listMaintenanceRecords(),
    ]);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: `${row.vehicle_id}-${row.period_month}`,
      vehicleId: row.vehicle_id,
      vehicleCode: row.vehicle_code,
      plateNumber: row.plate_number,
      periodMonth: row.period_month,
      revenue: Number(row.revenue) || 0,
      fuelCost: Number(row.fuel_cost) || 0,
      maintenanceCost: Number(row.maintenance_cost) || 0,
      mileagePayments: Number(row.mileage_payments) || 0,
      permitCosts: Number(row.permit_costs) || 0,
      otherCost: Number(row.other_cost) || 0,
      netProfit: Number(row.net_profit) || 0,
      trips: tripBreakdownFor(row.vehicle_id, thisMonth, trips, orders, payments),
      fuelEntries: fuelBreakdownFor(row.vehicle_id, thisMonth, fuel, trips),
      maintenanceEntries: maintenanceBreakdownFor(row.vehicle_id, thisMonth, maintenance),
    }));
  }

  // Local/demo mode: compute the same figures from local records.
  const [vehicles, trips, orders, fuel, maintenance, payments] = await Promise.all([
    listVehicles(),
    listTrips(),
    listTransportOrders(),
    listFuelRecords(),
    listMaintenanceRecords(),
    listDriverPayments(),
  ]);

  return vehicles
    .filter((v) => !v.excludedFromProfit)
    .map((v) => {
      const vehicleTrips = tripBreakdownFor(v.id, thisMonth, trips, orders, payments);
      const vehicleFuel = fuelBreakdownFor(v.id, thisMonth, fuel, trips);
      const vehicleMaintenance = maintenanceBreakdownFor(v.id, thisMonth, maintenance);

      const revenue = vehicleTrips.reduce((sum, t) => sum + t.revenue, 0);
      const mileagePayments = vehicleTrips.reduce((sum, t) => sum + t.mileagePayment, 0);
      const permitCosts = vehicleTrips.reduce((sum, t) => sum + t.permitCost, 0);
      const fuelCost = vehicleFuel.reduce((sum, f) => sum + f.cost, 0);
      const maintenanceCost = vehicleMaintenance.reduce((sum, m) => sum + m.cost, 0);

      return {
        id: `${v.id}-${thisMonth}`,
        vehicleId: v.id,
        vehicleCode: v.vehicleCode,
        plateNumber: v.plateNumber,
        periodMonth: `${thisMonth}-01`,
        revenue,
        fuelCost,
        maintenanceCost,
        mileagePayments,
        permitCosts,
        otherCost: 0,
        netProfit: revenue - fuelCost - maintenanceCost - mileagePayments - permitCosts,
        trips: vehicleTrips,
        fuelEntries: vehicleFuel,
        maintenanceEntries: vehicleMaintenance,
      };
    });
}

/** Unchanged name/signature for existing callers (e.g. the dashboard, which
 * only ever wants the current month). */
export async function listVehicleProfitThisMonth(): Promise<VehicleProfitMonth[]> {
  return listVehicleProfitForMonth();
}

/** Last 12 months as "YYYY-MM" keys, most recent first — matches the
 * rolling 12-month window the vehicle_profit_monthly view itself keeps (see
 * migration 026/040), so every option in a month picker actually has data
 * behind it rather than silently coming back empty. */
export function recentMonthOptions(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return d.toISOString().slice(0, 7);
  });
}
