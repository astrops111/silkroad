import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncMailbox, type FolderSyncResult } from "@/lib/mail/imap";
import { startJobRun, completeJobRun } from "@/lib/logging/jobs";
import { logError } from "@/lib/logging/activity";

// IMAP connect + fetch across mailboxes can exceed the default budget.
export const maxDuration = 300;

function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  try {
    const expected = Buffer.from(`Bearer ${secret}`, "utf-8");
    const received = Buffer.from(authHeader, "utf-8");
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/** Skip a mailbox if another invocation synced it moments ago. */
const FRESHNESS_WINDOW_MS = 2 * 60 * 1000;

/**
 * GET /api/cron/mail-sync
 *
 * Incrementally syncs every active hosted mailbox over IMAP.
 * Vercel Cron schedule: every 5 minutes.
 * Optional query: ?mailboxId=<uuid> to sync a single mailbox
 * (used by the admin "Sync now" button).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!verifyCronSecret(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const jobRunId = await startJobRun({ jobName: "mail-sync", jobType: "api_cron" });
  const onlyMailboxId = request.nextUrl.searchParams.get("mailboxId");

  let query = supabase.from("mailboxes").select("*").eq("is_active", true);
  if (onlyMailboxId) query = query.eq("id", onlyMailboxId);
  const { data: mailboxes, error } = await query;

  if (error) {
    await completeJobRun(jobRunId!, { status: "failed", errorMessage: error.message });
    return NextResponse.json({ success: false, error: "Failed to load mailboxes" }, { status: 500 });
  }

  const results: Record<string, FolderSyncResult[] | { skipped: string }> = {};
  let totalFetched = 0;
  const errors: string[] = [];

  for (const mailbox of mailboxes ?? []) {
    // Concurrency guard: another invocation may still be working this box.
    if (!onlyMailboxId) {
      const { data: recent } = await supabase
        .from("mailbox_sync_state")
        .select("last_synced_at")
        .eq("mailbox_id", mailbox.id)
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        recent?.last_synced_at &&
        Date.now() - new Date(recent.last_synced_at).getTime() < FRESHNESS_WINDOW_MS
      ) {
        results[mailbox.address] = { skipped: "recently synced" };
        continue;
      }
    }

    try {
      const folderResults = await syncMailbox(supabase, mailbox);
      results[mailbox.address] = folderResults;
      for (const fr of folderResults) {
        totalFetched += fr.fetched;
        if (fr.error) {
          errors.push(`${mailbox.address}/${fr.folder}: ${fr.error}`);
          await logError({
            errorCode: "mail_sync_failed",
            message: `${mailbox.address}/${fr.folder}: ${fr.error}`,
            source: "mail-sync",
            metadata: { mailboxId: mailbox.id, folder: fr.folder },
          }).catch(() => {});
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results[mailbox.address] = [{ folder: "*", fetched: 0, skipped: 0, error: message }];
      errors.push(`${mailbox.address}: ${message}`);
      await logError({
        errorCode: "mail_sync_failed",
        message: `${mailbox.address}: ${message}`,
        source: "mail-sync",
        metadata: { mailboxId: mailbox.id },
      }).catch(() => {});
    }
  }

  await completeJobRun(jobRunId!, {
    status: errors.length === 0 ? "success" : totalFetched > 0 ? "partial" : "failed",
    rowsAffected: totalFetched,
    metadata: { results, errors },
  });

  return NextResponse.json({ success: true, fetched: totalFetched, results, errors });
}
