import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore, nextTableRef, renumberFleetCodes } from "./local-store";
import { getDriver, syncLocalDriverTripStatus } from "./drivers";
import { syncLocalDriverPayment } from "./driver-payments";
import { getTransportOrder, updateTransportOrderStatus } from "./transport-orders";
import type { Trip, NewTripInput, CompleteTripInput } from "./types";

const store = localStore<Trip>("trips", []);

const ACTIVE_TRIP_STATUSES = ["scheduled", "in_progress"] as const;

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
    const { data, error } = await supabase
      .from("trips")
      .select(SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
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

/** Which drivers and vehicles are currently on an active (scheduled or
 * in_progress) trip, and which trip that is — used to keep the Start Trip
 * dropdowns from offering someone who's already out on the road, and to
 * show a "busy" badge on the Drivers and Fleet pages. The database itself
 * is the real source of truth (see the trips_guard_availability trigger,
 * migration 030) — this is just what the UI reads to stay in step with it. */
export async function listActiveTripAssignments(): Promise<{
  tripByDriverId: Map<string, Trip>;
  tripByVehicleId: Map<string, Trip>;
}> {
  const trips = await listTrips();
  const active = trips.filter((t) =>
    (ACTIVE_TRIP_STATUSES as readonly string[]).includes(t.status),
  );
  return {
    tripByDriverId: new Map(active.map((t) => [t.driverId, t])),
    tripByVehicleId: new Map(active.map((t) => [t.vehicleId, t])),
  };
}

export async function createTrip(input: NewTripInput): Promise<Trip> {
  if (isSupabaseConfigured && supabase) {
    // trip_code is assigned by the trips_set_code trigger in the database
    // (migration 025): trips get their own dense sequential number,
    // exactly like transport orders (TRIP-1, TRIP-2, TRIP-3…) — the oldest
    // trip is always TRIP-1 and a new trip always gets the next number,
    // regardless of which order (if any) it's linked to. Intentionally not
    // sent from here.
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
        mileage_amount: input.mileageAmount ?? 0,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapSupabaseTrip(data);
  }

  // Trips get their own dense sequential number, same as transport orders —
  // the oldest trip is TRIP-1 and a new trip always gets the next number in
  // the trips table, regardless of which order (if any) it's linked to.
  const existing = store.list();

  // Mirrors the trips_guard_availability trigger (migration 030): a driver
  // or vehicle already on an active trip can't be booked onto another one.
  const conflict = existing.find(
    (t) =>
      (ACTIVE_TRIP_STATUSES as readonly string[]).includes(t.status) &&
      (t.driverId === input.driverId || t.vehicleId === input.vehicleId),
  );
  if (conflict) {
    const reason = conflict.driverId === input.driverId ? "driver" : "vehicle";
    throw new Error(
      `This ${reason} is already on trip ${conflict.tripCode} — complete or remove that trip first.`,
    );
  }

  const ref = nextTableRef(existing.map((t) => t.tripCode));

  const trip: Trip = {
    id: `local-${crypto.randomUUID()}`,
    tripCode: `TRIP-${ref}`,
    transportOrderId: input.transportOrderId,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    branch: input.branch,
    origin: input.origin,
    destination: input.destination,
    mileageAmount: input.mileageAmount ?? 0,
    status: "in_progress",
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const created = store.insert(trip);

  // Mirrors the trips_sync_driver_status trigger (migration 030): the
  // driver is now on the road, so their status flips to on_route.
  syncLocalDriverTripStatus(created.driverId, true);

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

  // Mirrors the trips_sync_transport_order trigger (migration 027): a trip
  // always starts as "in_progress", so its linked order should too — unless
  // that order's already completed or cancelled, which a brand-new trip
  // should never move backwards.
  if (created.transportOrderId) {
    const order = await getTransportOrder(created.transportOrderId);
    if (order && order.status !== "completed" && order.status !== "cancelled") {
      await updateTransportOrderStatus(created.transportOrderId, "in_progress").catch(
        () => undefined,
      );
    }
  }

  return created;
}

/**
 * Completes a trip. The mileage payment was already set (and recorded in
 * driver_payments) when the trip was created, so completing it just marks
 * it done and records the completion date/time automatically — no
 * odometer reading needed.
 */
export async function completeTrip(
  id: string,
  _input: CompleteTripInput = {},
): Promise<Trip | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trips")
      .update({
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
  const updated = store.update(id, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });

  // Mirrors the trips_sync_driver_status trigger (migration 030): the
  // driver is free again now the trip's done.
  syncLocalDriverTripStatus(trip.driverId, false);

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
  mileageAmount: number;
}>;

export async function editTrip(id: string, input: EditTripInput): Promise<Trip> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trips")
      .update({
        ...(input.origin !== undefined ? { origin: input.origin } : {}),
        ...(input.destination !== undefined ? { destination: input.destination } : {}),
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
  const trip = store.get(id);
  store.remove(id);
  renumberFleetCodes();

  // Mirrors the trips_sync_driver_status trigger (migration 030): a
  // deleted trip no longer keeps its driver marked as on the road.
  if (trip && (ACTIVE_TRIP_STATUSES as readonly string[]).includes(trip.status)) {
    syncLocalDriverTripStatus(trip.driverId, false);
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseTrip(row: any): Trip {
  return {
    id: row.id,
    tripCode: row.trip_code,
    transportOrderId: row.transport_order_id ?? undefined,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicles ? row.vehicles.plate_number : undefined,
    driverId: row.driver_id,
    driverName: row.drivers?.full_name ?? undefined,
    branch: row.branch_id ?? undefined,
    origin: row.origin,
    destination: row.destination,
    mileageAmount: Number(row.mileage_amount ?? 0),
    status: row.status,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}
