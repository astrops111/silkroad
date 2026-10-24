import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncMailbox, type FolderSyncResult } from "@/lib/mail/imap";
import { startJobRun, completeJobRun } from "@/lib/logging/jobs";
import { logError } from "@/lib/logging/activity";
import { sendTelegramNotification, tgEsc } from "@/lib/telegram/notify";

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

/** Don't start another mailbox after this long, so runs end before the next 5-min tick. */
const RUN_BUDGET_MS = 3 * 60 * 1000;

/**
 * Consecutive-failure backoff for a mailbox that can't be reached: wait
 * 5, 10, 20, 40, then 60 min between attempts (measured from run start, so
 * the 5-min case still lands on the next tick). Reset by one success.
 */
function backoffMs(failures: number): number {
  return Math.min(5 * 2 ** (failures - 1), 60) * 60_000 - 30_000;
}

/** Page on the 3rd consecutive failure (~15 min down, not a blip), then
 * every 6th after that (~6 h at the 60-min cap). */
const ALERT_AFTER_FAILURES = 3;
function shouldAlert(failures: number): boolean {
  return (
    failures === ALERT_AFTER_FAILURES ||
    (failures > ALERT_AFTER_FAILURES && (failures - ALERT_AFTER_FAILURES) % 6 === 0)
  );
}

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

  const startedAt = Date.now();

  for (const mailbox of mailboxes ?? []) {
    // Leave the rest for the next tick rather than overlapping it — parallel
    // runs open extra connections to the same slow shared IMAP host.
    if (Date.now() - startedAt > RUN_BUDGET_MS) {
      results[mailbox.address] = { skipped: "run time budget exhausted" };
      continue;
    }

    // Backoff: a mailbox that keeps failing waits progressively longer
    // between attempts. A manual "Sync now" (?mailboxId=) ignores it.
    if (
      !onlyMailboxId &&
      mailbox.sync_retry_after &&
      new Date(mailbox.sync_retry_after).getTime() > Date.now()
    ) {
      results[mailbox.address] = {
        skipped: `backing off after ${mailbox.sync_failure_count} failures until ${mailbox.sync_retry_after}`,
      };
      continue;
    }

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

    let folderResults: FolderSyncResult[];
    try {
      folderResults = await syncMailbox(supabase, mailbox);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      folderResults = [{ folder: "*", fetched: 0, skipped: 0, error: message }];
    }
    results[mailbox.address] = folderResults;
    for (const fr of folderResults) totalFetched += fr.fetched;

    // Whole mailbox failed (couldn't connect, missing credential, or every
    // folder errored): back off, and only page once the outage is sustained.
    if (folderResults.every((fr) => fr.error)) {
      const failures = mailbox.sync_failure_count + 1;
      const retryAfter = new Date(startedAt + backoffMs(failures));
      const message = folderResults
        .map((fr) => (fr.folder === "*" ? fr.error : `${fr.folder}: ${fr.error}`))
        .join("; ");
      errors.push(`${mailbox.address}: ${message}`);

      await supabase
        .from("mailboxes")
        .update({
          sync_failure_count: failures,
          sync_retry_after: retryAfter.toISOString(),
          last_sync_error: message.slice(0, 1000),
        })
        .eq("id", mailbox.id);

      if (shouldAlert(failures)) {
        await logError({
          errorCode: "mail_sync_failed",
          message: `${mailbox.address}: ${failures} consecutive failures, next attempt ${retryAfter.toISOString().slice(11, 16)} UTC — ${message}`,
          source: "mail-sync",
          metadata: { mailboxId: mailbox.id, failures },
        }).catch(() => {});
      }
      continue;
    }

    // Some folders failed but the connection worked — no backoff.
    for (const fr of folderResults) {
      if (!fr.error) continue;
      errors.push(`${mailbox.address}/${fr.folder}: ${fr.error}`);
      await logError({
        errorCode: "mail_sync_failed",
        message: `${mailbox.address}/${fr.folder}: ${fr.error}`,
        source: "mail-sync",
        metadata: { mailboxId: mailbox.id, folder: fr.folder },
      }).catch(() => {});
    }

    if (mailbox.sync_failure_count > 0) {
      await supabase
        .from("mailboxes")
        .update({ sync_failure_count: 0, sync_retry_after: null, last_sync_error: null })
        .eq("id", mailbox.id);

      // Close the loop on an outage we paged about.
      if (mailbox.sync_failure_count >= ALERT_AFTER_FAILURES) {
        await sendTelegramNotification(
          `✅ <b>Mail sync recovered</b> — ${tgEsc(mailbox.address)}\n\nBack after ${mailbox.sync_failure_count} consecutive failures.`,
          {
            chatId: process.env.TELEGRAM_ERRORS_CHAT_ID ?? process.env.TELEGRAM_OPS_CHAT_ID,
            silent: true,
          }
        ).catch(() => {});
      }
    }
  }

  await completeJobRun(jobRunId!, {
    status: errors.length === 0 ? "success" : totalFetched > 0 ? "partial" : "failed",
    rowsAffected: totalFetched,
    metadata: { results, errors },
  });

  return NextResponse.json({ success: true, fetched: totalFetched, results, errors });
}
