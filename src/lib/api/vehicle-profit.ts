import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { listVehicles } from "./vehicles";
import { listTrips } from "./trips";
import { listTransportOrders } from "./transport-orders";
import { listFuelRecords } from "./fuel-records";
import { listMaintenanceRecords } from "./maintenance-records";
import { listDriverPayments } from "./driver-payments";
import type { VehicleProfitMonth } from "./types";

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "2026-08"
}

/** Vehicle profit for the current calendar month, per vehicle. Real data, computed either from Supabase or from local/demo records — same formula either way. */
export async function listVehicleProfitThisMonth(): Promise<VehicleProfitMonth[]> {
  const thisMonth = monthKey(new Date().toISOString());

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("vehicle_profit_monthly")
      .select("*")
      .gte("period_month", `${thisMonth}-01`)
      .lt("period_month", `${thisMonth}-31`);
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

  return vehicles.map((v) => {
    const vehicleTrips = trips.filter((t) => t.vehicleId === v.id && t.status === "completed" && t.completedAt && monthKey(t.completedAt) === thisMonth);
    const revenue = vehicleTrips.reduce((sum, t) => {
      const order = orders.find((o) => o.id === t.transportOrderId);
      return sum + (order?.agreedAmount ?? 0);
    }, 0);
    const mileagePayments = vehicleTrips.reduce((sum, t) => {
      const pay = payments.find((p) => p.tripId === t.id);
      return sum + (pay?.amount ?? 0);
    }, 0);
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
    };
  });
}
