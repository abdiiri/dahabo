import { useEffect, useRef } from "react";

/**
 * Re-runs `refetch` whenever the tab becomes visible/focused again, or the
 * browser regains a network connection — not on an interval, and not on
 * every render.
 *
 * Why this exists: every staff list page loads its data once on mount via
 * a plain useEffect, with no live sync. If someone leaves a tab open (say,
 * on Trips or Transport Orders) and an admin deletes something elsewhere
 * in the meantime, that tab keeps showing the stale list indefinitely —
 * it has no reason to know anything changed. This only fixes that one
 * case: coming back to a tab that was already open. It intentionally
 * doesn't add polling or realtime sync, which would refetch constantly
 * even while someone's actively looking at the list.
 */
export function useRefetchOnFocus(refetch: () => void) {
  // Keep the latest refetch without re-subscribing the listeners on every
  // render (callers often pass an inline function).
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    function onFocusOrVisible() {
      if (document.visibilityState === "hidden") return;
      refetchRef.current();
    }
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);
    window.addEventListener("online", onFocusOrVisible);
    return () => {
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      window.removeEventListener("online", onFocusOrVisible);
    };
  }, []);
}
