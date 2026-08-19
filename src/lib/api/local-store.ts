// A tiny browser-only persistence layer used ONLY when no Supabase project
// is connected yet (see src/lib/supabase.ts). It lets the dashboard be fully
// clickable — adding staff, drivers, and work assignments really "saves" —
// without requiring a database for a first look at the app.
//
// Once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set, the api modules
// in this folder talk to Supabase instead and this file is not used.

const PREFIX = "dahabo:demo:";

function read<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore quota / private-mode errors — demo mode only
  }
}

/** Pulls the numeric part out of a reference code, e.g. "TO-42" -> 42. */
export function extractRefNumber(code: string | undefined | null): number | undefined {
  if (!code) return undefined;
  const digits = code.replace(/\D/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Next reference number for a table, computed from the highest number
 * already used in that table's own codes — NOT a counter shared across
 * transport orders, trips, and fuel records. Pass in that table's current
 * codes (e.g. existing trips' tripCode values) and this returns the next
 * dense number: 6 existing rows numbered 1-6 always yields 7 next, never a
 * number borrowed from how many orders or fuel records happen to exist.
 * A record that belongs to a parent (a trip made from a transport order, a
 * fuel record made against a trip) should still reuse the parent's number
 * directly via extractRefNumber instead of calling this.
 */
export function nextTableRef(codes: Array<string | undefined | null>): number {
  const max = codes.reduce((best, code) => {
    const n = extractRefNumber(code);
    return n !== undefined && n > best ? n : best;
  }, 0);
  return max + 1;
}

type CodedRow = { id: string; createdAt: string; [key: string]: unknown };

function sortByCreated<T extends CodedRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Keeps transport order, trip, and fuel record reference numbers dense
 * (1, 2, 3… with no gaps) after a delete in demo mode — mirrors the
 * database renumbering trigger used once Supabase is connected, so a
 * table with 7 rows always shows 1-7, and deleting one drops it straight
 * to 1-6 with the next new row becoming 7. Reads and rewrites the three
 * tables' own localStorage entries directly so it can be called from any
 * of the three api modules without a circular import between them.
 *
 * Transport orders, trips, and fuel records each get their own dense
 * 1, 2, 3… counter by creation order — none of them borrow a number from
 * another table, so the oldest row in each table is always #1.
 */
export function renumberFleetCodes(): void {
  if (typeof window === "undefined") return;

  const orders = sortByCreated(read<CodedRow>("transport_orders", []));
  orders.forEach((order, i) => {
    order.orderCode = `TO-${i + 1}`;
  });
  write("transport_orders", orders);

  const trips = sortByCreated(read<CodedRow>("trips", []));
  trips.forEach((trip, i) => {
    trip.tripCode = `TRIP-${i + 1}`;
  });
  write("trips", trips);

  const tripCodeById = new Map<string, string>();
  trips.forEach((trip) => {
    tripCodeById.set(trip.id, trip.tripCode as string);
  });

  const fuels = sortByCreated(read<CodedRow>("fuel_records", []));
  fuels.forEach((fuel, i) => {
    fuel.fuelCode = `FUEL-${i + 1}`;
    // Keep the displayed trip label in sync with the trip's current code
    // (trips may have just been renumbered above too).
    const tripId = fuel.tripId as string | undefined;
    fuel.tripLabel = tripId ? tripCodeById.get(tripId) : undefined;
  });
  write("fuel_records", fuels);
}

// -----------------------------------------------------------------------------
// Local (demo-mode) audit trail — mirrors what the Supabase triggers do for
// a real database (see migration 033), so the Audit Logs tab still shows
// every create/update/delete even when no project is connected. Actions are
// generic here (no login exists in demo mode to know *who*), but every
// table's activity is still captured automatically — no per-file wiring.
// -----------------------------------------------------------------------------

type LocalAuditEntry = {
  id: string;
  actorName?: string;
  action: string;
  description?: string;
  targetTable?: string;
  targetId?: string;
  /** Human-readable label for the record the action happened to — mirrors
   * audit_logs.target_name from migration 035, so the Audit Logs tab's
   * "Target" column is just as readable in demo mode as it is for real. */
  targetName?: string | undefined;
  createdAt: string;
};

/** Human label per table, used in generated audit descriptions. */
const ENTITY_LABELS: Record<string, string> = {
  assignments: "Assignment",
  branches: "Branch",
  customer_transactions: "Customer transaction",
  customers: "Customer",
  documents: "Document",
  driver_advances: "Driver advance",
  driver_payments: "Driver payment",
  drivers: "Driver",
  fuel_records: "Fuel record",
  invoices: "Invoice",
  maintenance_records: "Maintenance record",
  salaries: "Salary/allowance entry",
  shipments: "Shipment",
  staff: "Staff account",
  transport_orders: "Transport order",
  trips: "Trip",
  vehicles: "Vehicle",
  warehouses: "Warehouse",
};

// Tables that shouldn't generate their own audit trail entries — either
// they aren't a real business record, or they'd just be noise.
const AUDIT_EXCLUDED_KEYS = new Set(["audit_logs", "notifications", "role_permissions"]);

/** Best-effort short display code/name for a row, tried in priority order. */
function codeOf(row: unknown): string | undefined {
  const r = row as Record<string, unknown> | null | undefined;
  if (!r) return undefined;
  const candidates = [
    "orderCode", "tripCode", "vehicleCode", "driverCode", "staffCode", "assignmentCode",
    "shipmentCode", "fuelCode", "customerCode", "invoiceCode", "warehouseCode", "documentCode",
    // Person/vehicle labels a row points at, checked before generic name
    // fields — e.g. a driver_payments row has no name of its own, but does
    // carry the driver's name, which is what "Target" should show.
    "driverName", "vehicleName", "plateNumber", "customerName", "staffName",
    // A salaries row is keyed by driverId/profileId, not a name — personName
    // is filled in by salaries.ts (driver or staff) so a salary/allowance/
    // bonus payment shows *who* was paid, same as driver_payments does.
    "personName",
    "fullName", "name", "title", "description", "purpose",
  ];
  for (const field of candidates) {
    const v = r[field];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function pushAuditLog(entry: Omit<LocalAuditEntry, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  try {
    const existing = read<LocalAuditEntry>("audit_logs", []);
    const row: LocalAuditEntry = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      actorName: "Demo user",
      ...entry,
    };
    write("audit_logs", [row, ...existing].slice(0, 300));
  } catch {
    // demo mode only — never block the real action over a logging failure
  }
}

export function localStore<T extends { id: string }>(key: string, seed: T[]) {
  const label = ENTITY_LABELS[key] ?? key;
  const trackAudit = !AUDIT_EXCLUDED_KEYS.has(key);

  return {
    list(): T[] {
      return read<T>(key, seed);
    },
    get(id: string): T | undefined {
      return read<T>(key, seed).find((row) => row.id === id);
    },
    insert(row: T): T {
      const rows = read<T>(key, seed);
      const next = [row, ...rows];
      write(key, next);
      if (trackAudit) {
        const code = codeOf(row);
        pushAuditLog({
          action: `${key}_created`,
          targetTable: key,
          targetId: row.id,
          targetName: code,
          description: code ? `Created ${label.toLowerCase()} — ${code}` : `Created a ${label.toLowerCase()}`,
        });
      }
      return row;
    },
    update(id: string, patch: Partial<T>): T | undefined {
      const rows = read<T>(key, seed);
      let updated: T | undefined;
      const next = rows.map((row) => {
        if (row.id !== id) return row;
        updated = { ...row, ...patch };
        return updated;
      });
      write(key, next);
      if (trackAudit && updated) {
        const code = codeOf(updated);
        const patchRecord = patch as Record<string, unknown>;
        const statusNote = typeof patchRecord.status === "string" ? ` — status changed to ${patchRecord.status}` : "";
        pushAuditLog({
          action: `${key}_updated`,
          targetTable: key,
          targetId: id,
          targetName: code,
          description: (code ? `Updated ${label.toLowerCase()} — ${code}` : `Updated a ${label.toLowerCase()}`) + statusNote,
        });
      }
      return updated;
    },
    remove(id: string): void {
      const rows = read<T>(key, seed);
      const removed = rows.find((row) => row.id === id);
      write(
        key,
        rows.filter((row) => row.id !== id),
      );
      if (trackAudit) {
        const code = codeOf(removed);
        pushAuditLog({
          action: `${key}_deleted`,
          targetTable: key,
          targetId: id,
          targetName: code,
          description: code ? `Deleted ${label.toLowerCase()} — ${code}` : `Deleted a ${label.toLowerCase()}`,
        });
      }
    },
  };
}
