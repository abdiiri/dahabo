import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";
import { driversData } from "@/data/mock";
import { createDriverAccount, deleteAuthAccount } from "./accounts.server";
import type { Driver, NewDriverInput } from "./types";

const PROFILE_COLUMNS = "full_name, email, phone, status, must_change_password";

function seedDrivers(): Driver[] {
  return driversData.map((d, i) => ({
    id: d.id,
    driverCode: d.id,
    fullName: d.name,
    email: `${d.name.toLowerCase().replace(/[^a-z]+/g, ".")}@dahaboglobal.com`,
    phone: d.phone,
    nationalId: `3${(20000000 + i * 4173).toString()}`,
    licenseNumber: d.license,
    licenseClass: "CE",
    licenseExpiry: `202${7 + (i % 3)}-0${(i % 9) + 1}-15`,
    dateOfBirth: undefined,
    address: undefined,
    nextOfKinName: undefined,
    nextOfKinPhone: undefined,
    status: d.status === "On Route" ? "on_route" : d.status === "Off Duty" ? "off_duty" : "available",
    accountStatus: "active",
    mustChangePassword: false,
    currentLocation: undefined,
    locationUpdatedAt: undefined,
    rating: Number(d.rating),
    totalTrips: d.trips,
    dateJoined: "2024-01-01",
    createdAt: "2024-01-01T00:00:00Z",
  }));
}

const store = localStore<Driver>("drivers", seedDrivers());

function generateDriverCode(existing: Driver[]): string {
  const max = existing.reduce((m, d) => {
    const n = Number(d.driverCode.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 900);
  return `DRV-${max + 1}`;
}

/** A reasonably strong random temporary password, e.g. "kg7-Rzq2-Pma9". */
export function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzACDEFGHJKMNPQRSTUVWXYZ23456789";
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}`;
}

export async function listDrivers(): Promise<Driver[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("drivers")
      .select(`*, profiles!inner(${PROFILE_COLUMNS})`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseDriver);
  }
  return store.list();
}

export async function getDriver(id: string): Promise<Driver | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("drivers")
      .select(`*, profiles!inner(${PROFILE_COLUMNS})`)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapSupabaseDriver(data) : undefined;
  }
  return store.get(id);
}

export async function createDriver(input: NewDriverInput): Promise<Driver> {
  if (isSupabaseConfigured && supabase) {
    // 1. Create the login with the email + password the admin chose, and
    //    force a password change on first sign-in. Runs server-side with
    //    the service role key — never in the browser.
    const { id } = await createDriverAccount({
      data: {
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        phone: input.phone,
      },
    });

    // 2. Insert the driver-specific compliance record.
    const driverCode = `DRV-${Date.now().toString().slice(-6)}`;
    try {
      const { data, error } = await supabase
        .from("drivers")
        .insert({
          id,
          driver_code: driverCode,
          national_id: input.nationalId,
          license_number: input.licenseNumber,
          license_class: input.licenseClass ?? "CE",
          license_expiry: input.licenseExpiry || null,
          date_of_birth: input.dateOfBirth || null,
          address: input.address || null,
          next_of_kin_name: input.nextOfKinName || null,
          next_of_kin_phone: input.nextOfKinPhone || null,
        })
        .select(`*, profiles!inner(${PROFILE_COLUMNS})`)
        .single();
      if (error) throw error;
      return mapSupabaseDriver(data);
    } catch (err) {
      // The login was created but the driver record failed — clean up so we
      // don't leave a half-created account behind.
      await deleteAuthAccount({ data: { userId: id } }).catch(() => undefined);
      throw err;
    }
  }

  const existing = store.list();
  const driver: Driver = {
    id: `local-${crypto.randomUUID()}`,
    driverCode: generateDriverCode(existing),
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    nationalId: input.nationalId,
    licenseNumber: input.licenseNumber,
    licenseClass: input.licenseClass ?? "CE",
    licenseExpiry: input.licenseExpiry,
    dateOfBirth: input.dateOfBirth,
    address: input.address,
    nextOfKinName: input.nextOfKinName,
    nextOfKinPhone: input.nextOfKinPhone,
    status: "available",
    accountStatus: "active",
    mustChangePassword: true,
    currentLocation: undefined,
    locationUpdatedAt: undefined,
    rating: 5,
    totalTrips: 0,
    dateJoined: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  return store.insert(driver);
}

export type EditDriverInput = Partial<
  Pick<
    NewDriverInput,
    | "fullName"
    | "phone"
    | "nationalId"
    | "licenseNumber"
    | "licenseClass"
    | "licenseExpiry"
    | "dateOfBirth"
    | "address"
    | "nextOfKinName"
    | "nextOfKinPhone"
  >
>;

export async function editDriver(id: string, input: EditDriverInput): Promise<Driver> {
  if (isSupabaseConfigured && supabase) {
    if (input.fullName !== undefined || input.phone !== undefined) {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    }
    const { data, error } = await supabase
      .from("drivers")
      .update({
        ...(input.nationalId !== undefined ? { national_id: input.nationalId } : {}),
        ...(input.licenseNumber !== undefined ? { license_number: input.licenseNumber } : {}),
        ...(input.licenseClass !== undefined ? { license_class: input.licenseClass } : {}),
        ...(input.licenseExpiry !== undefined ? { license_expiry: input.licenseExpiry || null } : {}),
        ...(input.dateOfBirth !== undefined ? { date_of_birth: input.dateOfBirth || null } : {}),
        ...(input.address !== undefined ? { address: input.address || null } : {}),
        ...(input.nextOfKinName !== undefined ? { next_of_kin_name: input.nextOfKinName || null } : {}),
        ...(input.nextOfKinPhone !== undefined ? { next_of_kin_phone: input.nextOfKinPhone || null } : {}),
      })
      .eq("id", id)
      .select(`*, profiles!inner(${PROFILE_COLUMNS})`)
      .single();
    if (error) throw error;
    return mapSupabaseDriver(data);
  }

  const updated = store.update(id, input as Partial<Driver>);
  if (!updated) throw new Error("Driver not found");
  return updated;
}

/** Permanently removes the driver's login and every record tied to it
 * (compliance record, assignments, cash advances) via cascading deletes. */
export async function deleteDriver(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await deleteAuthAccount({ data: { userId: id } });
    return;
  }
  store.remove(id);
}

/** Deactivate (or reactivate) a driver's login. A suspended account is
 * blocked at sign-in even with the correct password — see src/lib/auth.tsx. */
export async function setDriverAccountStatus(id: string, active: boolean): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("profiles")
      .update({ status: active ? "active" : "suspended" })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  store.update(id, { accountStatus: active ? "active" : "suspended" } as Partial<Driver>);
}

/** A driver checking in their current location, for the office to follow up. */
export async function updateMyLocation(driverId: string, location: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("drivers")
      .update({ current_location: location, location_updated_at: new Date().toISOString() })
      .eq("id", driverId);
    if (error) throw error;
    return;
  }
  store.update(driverId, {
    currentLocation: location,
    locationUpdatedAt: new Date().toISOString(),
  } as Partial<Driver>);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseDriver(row: any): Driver {
  return {
    id: row.id,
    driverCode: row.driver_code,
    fullName: row.profiles?.full_name ?? row.full_name ?? "",
    email: row.profiles?.email ?? row.email ?? "",
    phone: row.profiles?.phone ?? row.phone ?? undefined,
    nationalId: row.national_id,
    licenseNumber: row.license_number,
    licenseClass: row.license_class,
    licenseExpiry: row.license_expiry ?? undefined,
    dateOfBirth: row.date_of_birth ?? undefined,
    address: row.address ?? undefined,
    nextOfKinName: row.next_of_kin_name ?? undefined,
    nextOfKinPhone: row.next_of_kin_phone ?? undefined,
    status: row.status,
    accountStatus: row.profiles?.status ?? "active",
    mustChangePassword: Boolean(row.profiles?.must_change_password),
    currentLocation: row.current_location ?? undefined,
    locationUpdatedAt: row.location_updated_at ?? undefined,
    rating: Number(row.rating ?? 5),
    totalTrips: row.total_trips ?? 0,
    dateJoined: row.created_at?.slice(0, 10) ?? "",
    createdAt: row.created_at,
  };
}
