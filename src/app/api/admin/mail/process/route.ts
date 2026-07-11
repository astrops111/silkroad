import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { syncMailbox } from "@/lib/mail/imap";
import { processUnprocessedEmails } from "@/lib/ai/email-skills";
import { processEmailSequences } from "@/lib/mail/sequences";
import { startJobRun, completeJobRun } from "@/lib/logging/jobs";
import { logError } from "@/lib/logging/activity";

// IMAP + AI batch can take a while on a cold queue.
export const maxDuration = 300;

/** Skip work if another admin already triggered a pass moments ago. */
const FRESHNESS_WINDOW_MS = 2 * 60 * 1000;

/**
 * POST /api/admin/mail/process — On-demand email queue processing,
 * fired when an admin opens the mail section (the scheduled crons are
 * paused by choice). One pass = IMAP sync of all active mailboxes +
 * AI skill runs over the unprocessed queue + due sequence steps.
 * Freshness-guarded so concurrent admins don't double-sync.
 */
export async function POST() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = createServiceClient();

  // Freshness guard across the whole pass
  const { data: recent } = await supabase
    .from("mailbox_sync_state")
    .select("last_synced_at")
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    recent?.last_synced_at &&
    Date.now() - new Date(recent.last_synced_at).getTime() < FRESHNESS_WINDOW_MS
  ) {
    return NextResponse.json({ success: true, skipped: "recently processed" });
  }

  const jobRunId = await startJobRun({ jobName: "mail-onload", jobType: "on_demand" });
  let fetched = 0;
  const errors: string[] = [];

  // 1. IMAP sync every active mailbox
  const { data: mailboxes } = await supabase
    .from("mailboxes")
    .select("*")
    .eq("is_active", true);

  for (const mailbox of mailboxes ?? []) {
    try {
      const folderResults = await syncMailbox(supabase, mailbox);
      for (const fr of folderResults) {
        fetched += fr.fetched;
        if (fr.error) errors.push(`${mailbox.address}/${fr.folder}: ${fr.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${mailbox.address}: ${message}`);
      await logError({
        errorCode: "mail_sync_failed",
        message: `${mailbox.address}: ${message}`,
        source: "mail-sync",
        metadata: { mailboxId: mailbox.id, trigger: "onload" },
      }).catch(() => {});
    }
  }

  // 2. AI skills over the unprocessed queue (no-ops while the flag is off)
  let skills = null;
  try {
    skills = await processUnprocessedEmails();
    errors.push(...skills.errors);
  } catch (err) {
    errors.push(`skills: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Due sequence steps
  let sequences = null;
  try {
    sequences = await processEmailSequences();
    errors.push(...sequences.errors);
  } catch (err) {
    errors.push(`sequences: ${err instanceof Error ? err.message : String(err)}`);
  }

  await completeJobRun(jobRunId!, {
    status: errors.length === 0 ? "success" : fetched > 0 ? "partial" : "failed",
    rowsAffected: fetched,
    metadata: { fetched, skills, sequences, errors, trigger: "onload" },
  });

  return NextResponse.json({ success: true, fetched, skills, sequences, errors });
}
