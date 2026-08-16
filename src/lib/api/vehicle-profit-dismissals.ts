// Vehicle Profit rows are a computed summary (revenue minus costs), not a
// real record — there's nothing in the database to delete. "Deleting" a row
// here just hides that vehicle from this month's profit view; it must NEVER
// touch the vehicles table, so Fleet is completely unaffected. Stored in
// localStorage, keyed per vehicle + month, so it persists across reloads on
// this browser without needing a schema change.

const KEY = "dahabo:vehicle-profit-dismissed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / private-mode errors
  }
}

function dismissalKey(vehicleId: string, periodMonth: string): string {
  return `${vehicleId}:${periodMonth.slice(0, 7)}`;
}

export function isDismissed(vehicleId: string, periodMonth: string): boolean {
  return read().includes(dismissalKey(vehicleId, periodMonth));
}

export function dismissVehicleProfitRow(vehicleId: string, periodMonth: string): void {
  const key = dismissalKey(vehicleId, periodMonth);
  const ids = read();
  if (!ids.includes(key)) write([...ids, key]);
}
