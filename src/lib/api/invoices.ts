import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local-store";

export type Invoice = {
  id: string;
  invoiceCode: string;
  customerId?: string | undefined;
  customerName?: string | undefined;
  shipmentId?: string | undefined;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  issuedDate: string;
  dueDate?: string | undefined;
  createdAt: string;
};

const store = localStore<Invoice>("invoices", []);
const SELECT = "*, customers(name)";

export async function listInvoices(): Promise<Invoice[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("invoices").select(SELECT).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  return store.list();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Invoice {
  return {
    id: row.id,
    invoiceCode: row.invoice_code,
    customerId: row.customer_id ?? undefined,
    customerName: row.customers?.name ?? undefined,
    shipmentId: row.shipment_id ?? undefined,
    amount: Number(row.amount) || 0,
    status: row.status,
    issuedDate: row.issued_date,
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
  };
}
