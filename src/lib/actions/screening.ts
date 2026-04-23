"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const QUEUE_PATH = "/admin/logistics/screening";
const QUOTES_PATH = "/admin/logistics/quotes";
const WRITE_ROLES = ["admin_super", "admin_moderator"];

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireAdminWrite(): Promise<ActionResult<{ userId: string }>> {
  const user = await getCurrentUser();
  const role = user?.company_members?.[0]?.role;
  if (!role || !WRITE_ROLES.includes(role)) {
    return { success: false, error: "Forbidden — admin role required" };
  }
  return { success: true, data: { userId: user!.id } };
}

// Clearing flips the parent ops_quote (if any) back to 'draft' so
// the normal lifecycle resumes. The audit row keeps the original
// hit + matches for the compliance trail.
export async function clearScreening(checkId: string, notes: string): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!notes || notes.trim().length < 5) {
    return { success: false, error: "Decision notes are required (min 5 chars)" };
  }

  const supabase = await createClient();

  const { data: check, error: readErr } = await supabase
    .from("screening_checks")
    .select("subject_type, subject_id, reviewed_at")
    .eq("id", checkId)
    .maybeSingle();
  if (readErr || !check) return { success: false, error: readErr?.message ?? "Check not found" };
  if (check.reviewed_at) return { success: false, error: "Already reviewed" };

  const update: TablesUpdate<"screening_checks"> = {
    reviewed_at: new Date().toISOString(),
    reviewed_by: gate.data!.userId,
    decision: "cleared",
    decision_notes: notes,
  };
  const { error } = await supabase.from("screening_checks").update(update).eq("id", checkId);
  if (error) return { success: false, error: error.message };

  if (check.subject_type === "ops_quote") {
    const { error: quoteErr } = await supabase
      .from("ops_freight_quotes")
      .update({ status: "draft" })
      .eq("id", check.subject_id)
      .eq("status", "pending_screening");
    if (quoteErr) console.error("clearScreening: quote status update failed", quoteErr);
    revalidatePath(`${QUOTES_PATH}/${check.subject_id}`);
  }

  revalidatePath(QUEUE_PATH);
  revalidatePath(QUOTES_PATH);
  return { success: true };
}

// Rejecting archives the parent quote so it leaves the active
// pipeline but stays queryable. Status moves to 'archived' rather
// than 'declined' (which is reserved for buyer-side declines).
export async function rejectScreening(checkId: string, notes: string): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!notes || notes.trim().length < 5) {
    return { success: false, error: "Decision notes are required (min 5 chars)" };
  }

  const supabase = await createClient();

  const { data: check, error: readErr } = await supabase
    .from("screening_checks")
    .select("subject_type, subject_id, reviewed_at")
    .eq("id", checkId)
    .maybeSingle();
  if (readErr || !check) return { success: false, error: readErr?.message ?? "Check not found" };
  if (check.reviewed_at) return { success: false, error: "Already reviewed" };

  const update: TablesUpdate<"screening_checks"> = {
    reviewed_at: new Date().toISOString(),
    reviewed_by: gate.data!.userId,
    decision: "rejected",
    decision_notes: notes,
  };
  const { error } = await supabase.from("screening_checks").update(update).eq("id", checkId);
  if (error) return { success: false, error: error.message };

  if (check.subject_type === "ops_quote") {
    const { error: quoteErr } = await supabase
      .from("ops_freight_quotes")
      .update({ status: "archived", outcome_notes: `Screening rejected: ${notes}` })
      .eq("id", check.subject_id);
    if (quoteErr) console.error("rejectScreening: quote status update failed", quoteErr);
    revalidatePath(`${QUOTES_PATH}/${check.subject_id}`);
  }

  revalidatePath(QUEUE_PATH);
  revalidatePath(QUOTES_PATH);
  return { success: true };
}
