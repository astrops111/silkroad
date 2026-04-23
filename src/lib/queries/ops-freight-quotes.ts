"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type OpsQuoteStatus = Enums<"ops_quote_status">;
export type OpsQuoteRequesterType = Enums<"ops_quote_requester_type">;
export type OpsFreightQuoteRow = Tables<"ops_freight_quotes">;

export interface OpsQuoteListFilters {
  status?: OpsQuoteStatus | OpsQuoteStatus[];
  requesterType?: OpsQuoteRequesterType;
  assignedTo?: string;
  createdBy?: string;
  query?: string;             // matches quote_number / requester_name / requester_company
  originCountry?: string;
  destinationCountry?: string;
  expiringWithinDays?: number;
}

export async function listOpsFreightQuotes(
  filters: OpsQuoteListFilters = {},
): Promise<OpsFreightQuoteRow[]> {
  const supabase = await createClient();
  let q = supabase.from("ops_freight_quotes").select("*");

  if (filters.status) {
    if (Array.isArray(filters.status)) q = q.in("status", filters.status);
    else q = q.eq("status", filters.status);
  }
  if (filters.requesterType) q = q.eq("requester_type", filters.requesterType);
  if (filters.assignedTo) q = q.eq("assigned_to_user_id", filters.assignedTo);
  if (filters.createdBy) q = q.eq("created_by_user_id", filters.createdBy);
  if (filters.originCountry) q = q.eq("origin_country", filters.originCountry);
  if (filters.destinationCountry) q = q.eq("destination_country", filters.destinationCountry);
  if (filters.query) {
    const escaped = filters.query.replace(/[%_]/g, (m) => `\\${m}`);
    q = q.or(
      `quote_number.ilike.%${escaped}%,requester_name.ilike.%${escaped}%,requester_company.ilike.%${escaped}%`,
    );
  }
  if (filters.expiringWithinDays !== undefined) {
    const cutoff = new Date(Date.now() + filters.expiringWithinDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    q = q.lte("valid_until", cutoff).in("status", ["quoted", "sent"]);
  }

  const { data, error } = await q.order("created_at", { ascending: false }).limit(500);
  if (error) {
    console.error("listOpsFreightQuotes failed", error);
    return [];
  }
  return data ?? [];
}

export async function getOpsFreightQuote(id: string): Promise<OpsFreightQuoteRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ops_freight_quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getOpsFreightQuote failed", error);
    return null;
  }
  return data;
}
