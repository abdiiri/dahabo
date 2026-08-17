import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore, nextFleetRef, extractRefNumber } from "./local-store";
import { getDriver } from "./drivers";
import { syncLocalDriverPayment } from "./driver-payments";
import { updateTransportOrderStatus, getTransportOrder } from "./transport-orders";
import type { Trip, NewTripInput, CompleteTripInput } from "./types";

const store = localStore<Trip>("trips", []);

const SELECT = "*, vehicles(vehicle_code, plate_number), drivers(full_name)";

/** Looks up a single trip by id — used to resolve a linked trip's reference
 * number when creating a fuel record against it. */
export async function getTrip(id: string): Promise<Trip | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("trips").select(SELECT).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapSupabaseTrip(data) : undefined;
  }
  return store.get(id);
}

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
    // trip_code is assigned by the trips_set_code trigger in the database
    // (migration 015): it reuses the linked transport order's number so a
    // trip made from order TO-4 becomes TRIP-4, and only draws a fresh
    // sequential number when the trip has no linked order. Intentionally
    // not sent from here.
    //
    // mileage_amount is the flat driver pay agreed for this trip. The
    // trips_sync_driver_payment trigger (migration 016) creates the
    // driver_payments row for it right away, on insert — no distance or
    // rate calculation involved.
    const { data, error } = await supabase
      .from("trips")
      .insert({
        transport_order_id: input.transportOrderId ?? null,
        vehicle_id: input.vehicleId,
        driver_id: input.driverId,
        branch_id: input.branch ?? null,
        origin: input.origin,
        destination: input.destination,
        start_odometer_km: input.startOdometerKm,
        mileage_amount: input.mileageAmount ?? 0,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapSupabaseTrip(data);
  }

  // Reuse the linked transport order's reference number (order TO-4 -> trip
  // TRIP-4) so the pair reads as one job. Falls back to a fresh number if
  // there's no linked order, or if that number is somehow already taken by
  // another trip (e.g. a second trip against the same order).
  const existing = store.list();
  let ref: number | undefined;
  if (input.transportOrderId) {
    const order = await getTransportOrder(input.transportOrderId);
    ref = extractRefNumber(order?.orderCode);
  }
  if (ref === undefined || existing.some((t) => t.tripCode === `TRIP-${ref}`)) {
    ref = nextFleetRef();
  }

  const trip: Trip = {
    id: `local-${crypto.randomUUID()}`,
    tripCode: `TRIP-${ref}`,
    transportOrderId: input.transportOrderId,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    branch: input.branch,
    origin: input.origin,
    destination: input.destination,
    startOdometerKm: input.startOdometerKm,
    mileageAmount: input.mileageAmount ?? 0,
    status: "in_progress",
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const created = store.insert(trip);

  // Mirrors the trips_sync_driver_payment trigger (migration 016), which
  // now fires on insert: the flat mileage amount is known as soon as the
  // trip is created, no need to wait for completion.
  const driver = await getDriver(created.driverId);
  syncLocalDriverPayment({
    tripId: created.id,
    tripCode: created.tripCode,
    driverId: created.driverId,
    driverName: driver?.fullName,
    amount: created.mileageAmount,
  });

  return created;
}

/**
 * Completes a trip. The mileage payment was already set (and recorded in
 * driver_payments) when the trip was created, so completing it just marks
 * it done — the ending odometer is optional, kept only as a record of
 * distance travelled, and plays no part in the payment.
 */
export async function completeTrip(id: string, input: CompleteTripInput): Promise<Trip | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trips")
      .update({
        end_odometer_km: input.endOdometerKm ?? null,
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
  const distanceKm =
    input.endOdometerKm != null ? Math.max(input.endOdometerKm - trip.startOdometerKm, 0) : undefined;
  const updated = store.update(id, {
    endOdometerKm: input.endOdometerKm,
    distanceKm,
    status: "completed",
    completedAt: new Date().toISOString(),
  });

  if (trip.transportOrderId) {
    await updateTransportOrderStatus(trip.transportOrderId, "completed").catch(() => undefined);
  }

  return updated;
}

/**
 * Edits a trip's own details — origin, destination, starting odometer, and
 * the flat mileage amount. Editing the mileage amount updates its driver
 * payment (and therefore vehicle profit) automatically, whether or not the
 * trip has been completed yet:
 *  - in Supabase, the trips_sync_driver_payment trigger re-fires on this
 *    update the same way it does when the trip is first created
 *  - in local/demo mode, right here, so the app behaves the same either way
 * This is what lets a trip's agreed amount be corrected after the fact if
 * it was entered wrong.
 */
export type EditTripInput = Partial<{
  origin: string;
  destination: string;
  startOdometerKm: number;
  mileageAmount: number;
}>;

export async function editTrip(id: string, input: EditTripInput): Promise<Trip> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trips")
      .update({
        ...(input.origin !== undefined ? { origin: input.origin } : {}),
        ...(input.destination !== undefined ? { destination: input.destination } : {}),
        ...(input.startOdometerKm !== undefined ? { start_odometer_km: input.startOdometerKm } : {}),
        ...(input.mileageAmount !== undefined ? { mileage_amount: input.mileageAmount } : {}),
      })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapSupabaseTrip(data);
  }

  const existing = store.get(id);
  if (!existing) throw new Error("Trip not found");
  const updated = store.update(id, input as Partial<Trip>);
  if (!updated) throw new Error("Trip not found");

  // The agreed amount changed — recalculate its pending driver payment,
  // same as when the trip is first created.
  if (input.mileageAmount !== undefined) {
    const driver = await getDriver(updated.driverId);
    syncLocalDriverPayment({
      tripId: updated.id,
      tripCode: updated.tripCode,
      driverId: updated.driverId,
      driverName: driver?.fullName,
      amount: updated.mileageAmount,
    });
  }

  return updated;
}

/** Moves the trip to the Recycle Bin (soft delete) — restorable there any
 * time. Its driver_payments row (if the trip was completed) goes with it,
 * since driver_payments.trip_id cascades on delete/relies on the same
 * soft-delete convention used across the app. */
export async function deleteTrip(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("trips")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
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
    mileageAmount: Number(row.mileage_amount ?? 0),
    status: row.status,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}
