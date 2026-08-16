import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import { getDriver } from "./drivers";
import { syncLocalDriverPayment } from "./driver-payments";
import { updateTransportOrderStatus } from "./transport-orders";
import type { Trip, NewTripInput, CompleteTripInput } from "./types";

const store = localStore<Trip>("trips", []);

function generateTripCode(existing: Trip[]): string {
  const max = existing.reduce((m, t) => {
    const n = Number(t.tripCode.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 5000);
  return `TRIP-${max + 1}`;
}

const SELECT = "*, vehicles(vehicle_code, plate_number), drivers(full_name)";

export async function listTrips(): Promise<Trip[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("trips").select(SELECT).is("deleted_at", null).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseTrip);
  }
  return store.list();
}

/** Trips for a single vehicle — used on the vehicle detail / profit views. */
export async function listTripsForVehicle(vehicleId: string): Promise<Trip[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trips")
      .select(SELECT)
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseTrip);
  }
  return store.list().filter((t) => t.vehicleId === vehicleId);
}

export async function createTrip(input: NewTripInput): Promise<Trip> {
  if (isSupabaseConfigured && supabase) {
    const tripCode = `TRIP-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from("trips")
      .insert({
        trip_code: tripCode,
        transport_order_id: input.transportOrderId ?? null,
        vehicle_id: input.vehicleId,
        driver_id: input.driverId,
        branch_id: input.branch ?? null,
        origin: input.origin,
        destination: input.destination,
        start_odometer_km: input.startOdometerKm,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapSupabaseTrip(data);
  }

  const existing = store.list();
  const trip: Trip = {
    id: `local-${crypto.randomUUID()}`,
    tripCode: generateTripCode(existing),
    transportOrderId: input.transportOrderId,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    branch: input.branch,
    origin: input.origin,
    destination: input.destination,
    startOdometerKm: input.startOdometerKm,
    status: "in_progress",
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  return store.insert(trip);
}

/**
 * Completing a trip sets the end odometer reading. The distance and the
 * driver's mileage payment are then calculated automatically:
 *  - in Supabase, by the trips_sync_driver_payment trigger (see migration 004)
 *  - in local/demo mode, right here, so the app behaves the same either way
 */
export async function completeTrip(id: string, input: CompleteTripInput): Promise<Trip | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trips")
      .update({
        end_odometer_km: input.endOdometerKm,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapSupabaseTrip(data);
  }

  const trip = store.get(id);
  if (!trip) return undefined;
  const distanceKm = Math.max(input.endOdometerKm - trip.startOdometerKm, 0);
  const updated = store.update(id, {
    endOdometerKm: input.endOdometerKm,
    distanceKm,
    status: "completed",
    completedAt: new Date().toISOString(),
  });

  const driver = await getDriver(trip.driverId);
  syncLocalDriverPayment({
    tripId: trip.id,
    tripCode: trip.tripCode,
    driverId: trip.driverId,
    driverName: driver?.fullName,
    distanceKm,
    ratePerKm: driver?.mileageRatePerKm ?? 0,
  });

  if (trip.transportOrderId) {
    await updateTransportOrderStatus(trip.transportOrderId, "completed").catch(() => undefined);
  }

  return updated;
}

/** Moves the trip to the Recycle Bin (soft delete), along with the driver
 * payment and any fuel records logged against it — restorable there any time. */
export async function deleteTrip(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc("delete_trip_cascade", { p_trip_id: id });
    if (error) throw error;
    return;
  }
  store.remove(id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseTrip(row: any): Trip {
  return {
    id: row.id,
    tripCode: row.trip_code,
    transportOrderId: row.transport_order_id ?? undefined,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicles ? `${row.vehicles.vehicle_code} · ${row.vehicles.plate_number}` : undefined,
    driverId: row.driver_id,
    driverName: row.drivers?.full_name ?? undefined,
    branch: row.branch_id ?? undefined,
    origin: row.origin,
    destination: row.destination,
    startOdometerKm: row.start_odometer_km,
    endOdometerKm: row.end_odometer_km ?? undefined,
    distanceKm: row.distance_km ?? undefined,
    status: row.status,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}
