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

const SEQ_KEY = "fleet_ref_seq";

function readSeq(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(PREFIX + SEQ_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeSeq(n: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + SEQ_KEY, String(n));
  } catch {
    // ignore quota / private-mode errors — demo mode only
  }
}

/**
 * Single shared reference-number counter used by transport orders, trips,
 * and fuel records — starts at 1 and counts 1, 2, 3, 4… across all three,
 * instead of each table keeping its own independent sequence. Call this
 * whenever a brand-new number is needed. A record that belongs to a parent
 * (a trip made from a transport order, a fuel record made against a trip)
 * should reuse the parent's number instead — see extractRefNumber below —
 * so the whole chain (order → trip → fuel) shows the same number.
 */
export function nextFleetRef(): number {
  const next = readSeq() + 1;
  writeSeq(next);
  return next;
}

/** Pulls the numeric part out of a reference code, e.g. "TO-42" -> 42. */
export function extractRefNumber(code: string | undefined | null): number | undefined {
  if (!code) return undefined;
  const digits = code.replace(/\D/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

export function localStore<T extends { id: string }>(key: string, seed: T[]) {
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
      return updated;
    },
    remove(id: string): void {
      const rows = read<T>(key, seed);
      write(
        key,
        rows.filter((row) => row.id !== id),
      );
    },
  };
}
