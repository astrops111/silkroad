"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type ScreeningCheckRow = Tables<"screening_checks">;
export type ScreeningResultEnum = Enums<"screening_result">;
export type ScreeningSubjectType = Enums<"screening_subject_type">;
export type ScreeningDecision = Enums<"screening_decision">;

export interface ScreeningQueueRow extends ScreeningCheckRow {
  // Joined ops_freight_quotes context, only populated when subject_type='ops_quote'.
  quote_number?: string | null;
  requester_name?: string | null;
  requester_company?: string | null;
  requester_country?: string | null;
}

// Pending queue: hits awaiting human review, newest first.
// Rejected/cleared rows fall out of the queue but remain queryable
// for audit via getScreeningCheck().
export async function listPendingScreening(): Promise<ScreeningQueueRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("screening_checks")
    .select("*")
    .eq("result", "hit")
    .is("reviewed_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("listPendingScreening failed", error);
    return [];
  }

  // Hand-join the quote context for ops_quote subjects so the queue
  // page can render the requester without a per-row roundtrip.
  const quoteIds = (data ?? [])
    .filter((r) => r.subject_type === "ops_quote")
    .map((r) => r.subject_id);
  if (quoteIds.length === 0) return data ?? [];

  const { data: quotes } = await supabase
    .from("ops_freight_quotes")
    .select("id, quote_number, requester_name, requester_company, requester_country")
    .in("id", quoteIds);
  const byId = new Map((quotes ?? []).map((q) => [q.id, q]));

  return (data ?? []).map((row) => {
    if (row.subject_type !== "ops_quote") return row;
    const q = byId.get(row.subject_id);
    return {
      ...row,
      quote_number: q?.quote_number,
      requester_name: q?.requester_name,
      requester_company: q?.requester_company,
      requester_country: q?.requester_country,
    } as ScreeningQueueRow;
  });
}

export async function getScreeningCheck(id: string): Promise<ScreeningCheckRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("screening_checks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getScreeningCheck failed", error);
    return null;
  }
  return data;
}
