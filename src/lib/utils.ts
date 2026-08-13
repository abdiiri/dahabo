import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts a readable message from any thrown value. Real `Error` instances
 * are handled, but Supabase/Postgrest errors are plain objects with a
 * `.message` string that don't pass `instanceof Error` — so that check alone
 * silently swallows the actual reason and shows a generic fallback instead.
 */
export function getErrorMessage(err: unknown, fallback = "Please try again."): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (typeof err === "string") return err;
  return fallback;
}
