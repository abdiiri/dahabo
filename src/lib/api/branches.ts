import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";

export type Branch = {
  id: string;
  name: string;
  address?: string | undefined;
  city?: string | undefined;
  phone?: string | undefined;
};

const store = localStore<Branch>("branches", []);

export async function listBranches(): Promise<Branch[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("branches").select("*").order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address ?? undefined,
      city: row.city ?? undefined,
      phone: row.phone ?? undefined,
    }));
  }
  return store.list();
}
