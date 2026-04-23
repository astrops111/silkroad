// ============================================================
// Screening runner — called from server actions before persisting
// any quote / request that names an external party. Records every
// call (clear OR hit) to screening_checks so the compliance trail
// is complete.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, TablesInsert } from "@/lib/supabase/database.types";
import { openSanctionsProvider } from "./opensanctions";
import type { ScreeningMatch, ScreeningProvider, ScreeningQuery, SubjectType } from "./types";

const provider: ScreeningProvider = openSanctionsProvider;

export interface ScreeningRunResult {
  result: "clear" | "hit" | "error";
  checkId: string | null;
  matches: ScreeningMatch[];
  topScore: number | null;
}

// Inserts a screening_checks row and returns its id alongside the
// provider verdict. subject_id may be a placeholder UUID when the
// parent row hasn't been written yet — caller is responsible for
// later updating subject_id once the quote/request is inserted.
export async function runScreening(
  supabase: SupabaseClient<Database>,
  subject: { type: SubjectType; id: string },
  query: ScreeningQuery,
): Promise<ScreeningRunResult> {
  if (!provider.enabled) {
    return { result: "clear", checkId: null, matches: [], topScore: null };
  }

  const response = await provider.screen(query);

  const insert: TablesInsert<"screening_checks"> = {
    subject_type: subject.type,
    subject_id: subject.id,
    provider: provider.id,
    query: query as unknown as Json,
    result: response.result,
    matches: response.matches as unknown as Json,
    top_score: response.topScore,
  };

  const { data, error } = await supabase
    .from("screening_checks")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    console.error("runScreening: failed to persist check", error);
    return {
      result: response.result,
      checkId: null,
      matches: response.matches,
      topScore: response.topScore,
    };
  }

  return {
    result: response.result,
    checkId: data.id,
    matches: response.matches,
    topScore: response.topScore,
  };
}

// Convenience wrapper for ops freight quotes — extracts the screening
// query from the form shape and ties the check to the eventual quote row.
export async function screenOpsQuoteRequester(
  supabase: SupabaseClient<Database>,
  quoteId: string,
  requester: {
    name?: string | null;
    company?: string | null;
    country?: string | null;
    email?: string | null;
    phone?: string | null;
  },
): Promise<ScreeningRunResult> {
  return runScreening(
    supabase,
    { type: "ops_quote", id: quoteId },
    {
      name: requester.name ?? undefined,
      company: requester.company ?? undefined,
      country: requester.country ?? undefined,
      email: requester.email ?? undefined,
      phone: requester.phone ?? undefined,
    },
  );
}
