import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";

export type NotificationEntry = {
  id: string;
  category: string;
  title: string;
  tone: string;
  read: boolean;
  createdAt: string;
};

const store = localStore<NotificationEntry>("notifications", []);

export async function listNotifications(): Promise<NotificationEntry[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      tone: row.tone,
      read: row.read,
      createdAt: row.created_at,
    }));
  }
  return store.list();
}
