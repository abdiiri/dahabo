import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";

export type DocumentRecord = {
  id: string;
  documentCode: string;
  name: string;
  type: string;
  fileSizeKb?: number | undefined;
  ownerName?: string | undefined;
  createdAt: string;
};

const store = localStore<DocumentRecord>("documents", []);
const SELECT = "*, profiles(full_name)";

export async function listDocuments(): Promise<DocumentRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("documents").select(SELECT).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): DocumentRecord {
  return {
    id: row.id,
    documentCode: row.document_code,
    name: row.name,
    type: row.type,
    fileSizeKb: row.file_size_kb ?? undefined,
    ownerName: row.profiles?.full_name ?? undefined,
    createdAt: row.created_at,
  };
}
