import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { listShipments } from "./shipments";
import { listTrips } from "./trips";
import { listTransportOrders } from "./transport-orders";

export type RevenuePoint = { month: string; revenue: number };
export type DeliveryPoint = { day: string; delivered: number };
export type RouteStat = { route: string; trips: number; revenue: string };

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short" });
}

/** Fleet-wide revenue for the last 6 months, from completed trips' transport orders. */
export async function getRevenueTrend(): Promise<RevenuePoint[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("vehicle_profit_monthly")
      .select("period_month, revenue");
    if (error) throw error;
    const byMonth = new Map<string, number>();
    for (const row of data ?? []) {
      const key = row.period_month as string;
      byMonth.set(key, (byMonth.get(key) ?? 0) + (Number(row.revenue) || 0));
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({ month: monthLabel(month), revenue }));
  }

  const [trips, orders] = await Promise.all([listTrips(), listTransportOrders()]);
  const byMonth = new Map<string, number>();
  for (const t of trips) {
    if (t.status !== "completed" || !t.completedAt) continue;
    const order = orders.find((o) => o.id === t.transportOrderId);
    if (!order) continue;
    const key = t.completedAt.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + order.agreedAmount);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, revenue]) => ({ month: monthLabel(month), revenue }));
}

/** Shipments marked delivered, per day, for the last 7 days. */
export async function getDeliveriesTrend(): Promise<DeliveryPoint[]> {
  const shipments = await listShipments();
  const days: DeliveryPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const delivered = shipments.filter(
      (s) => s.status === "delivered" && s.updatedAt?.slice(0, 10) === key,
    ).length;
    days.push({ day: label, delivered });
  }
  return days;
}

/** Trip revenue grouped by origin -> destination, top 6 by revenue. */
export async function getTopRoutes(): Promise<RouteStat[]> {
  const [trips, orders] = await Promise.all([listTrips(), listTransportOrders()]);
  const byRoute = new Map<string, { trips: number; revenue: number }>();
  for (const t of trips) {
    if (t.status !== "completed") continue;
    const route = `${t.origin} → ${t.destination}`;
    const order = orders.find((o) => o.id === t.transportOrderId);
    const entry = byRoute.get(route) ?? { trips: 0, revenue: 0 };
    entry.trips += 1;
    entry.revenue += order?.agreedAmount ?? 0;
    byRoute.set(route, entry);
  }
  return Array.from(byRoute.entries())
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 6)
    .map(([route, { trips, revenue }]) => ({ route, trips, revenue: `KSh ${revenue.toLocaleString()}` }));
}
