import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Last 12 months as "YYYY-MM" keys, most recent first — the standard
 * window used by every "current month, with history" view in the app
 * (Vehicle Profit, Driver Payments, Maintenance). */
export function recentMonthOptions(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

/** "2026-09" -> "September 2026". */
export function monthLabel(monthKey: string): string {
  return new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Extracts a readable message from any thrown value. Real `Error` instances
 * are handled, but Supabase/Postgrest errors are plain objects with a
 * `.message` string that don't pass `instanceof Error` — so that check alone
 * silently swallows the actual reason and shows a generic fallback instead.
 */
export function getErrorMessage(err: unknown, fallback = "Please try again."): string {
  if (err instanceof Error) return err.message;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  if (typeof err === "string") return err;
  return fallback;
}

/**
 * Normalizes a free-typed Kenyan phone number (07…, 01…, +254…, 254…, with
 * spaces/dashes) into the digits-only 254… form wa.me expects. Returns
 * undefined if there's nothing usable to send to.
 */
export function toWhatsAppNumber(phone: string | undefined | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

/** Builds a wa.me link that opens WhatsApp with the message pre-filled. */
export function buildWhatsAppLink(
  phone: string | undefined | null,
  text: string,
): string | undefined {
  const number = toWhatsAppNumber(phone);
  if (!number) return undefined;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
