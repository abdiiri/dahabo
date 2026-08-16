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
  VehicleProfitMonth,
  VehicleProfitTrip,
} from "./types";

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "2026-08"
}

/** Builds the per-trip breakdown (exact revenue + mileage pay per trip) for
 * one vehicle in one month, from trips/orders/payments already in memory.
 * Fuel and maintenance are deliberately left out here — see VehicleProfitTrip. */
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
      };
    })
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/** Vehicle profit for the current calendar month, per vehicle. Real data, computed either from Supabase or from local/demo records — same formula either way. Each row also carries a per-trip breakdown so a vehicle with several trips in the month doesn't get flattened into one blended number. */
export async function listVehicleProfitThisMonth(): Promise<VehicleProfitMonth[]> {
  const thisMonth = monthKey(new Date().toISOString());

  if (isSupabaseConfigured && supabase) {
    const [{ data, error }, trips, orders, payments] = await Promise.all([
      supabase
        .from("vehicle_profit_monthly")
        .select("*")
        .gte("period_month", `${thisMonth}-01`)
        .lt("period_month", `${thisMonth}-31`),
      listTrips(),
      listTransportOrders(),
      listDriverPayments(),
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
      otherCost: Number(row.other_cost) || 0,
      netProfit: Number(row.net_profit) || 0,
      trips: tripBreakdownFor(row.vehicle_id, thisMonth, trips, orders, payments),
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
      const revenue = vehicleTrips.reduce((sum, t) => sum + t.revenue, 0);
      const mileagePayments = vehicleTrips.reduce((sum, t) => sum + t.mileagePayment, 0);
      const fuelCost = fuel
        .filter((f) => f.vehicleId === v.id && monthKey(f.filledAt) === thisMonth)
        .reduce((sum, f) => sum + f.cost, 0);
      const maintenanceCost = maintenance
        .filter((m) => m.vehicleId === v.id && monthKey(m.serviceDate) === thisMonth)
        .reduce((sum, m) => sum + m.cost, 0);

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
        otherCost: 0,
        netProfit: revenue - fuelCost - maintenanceCost - mileagePayments,
        trips: vehicleTrips,
      };
    });
}
