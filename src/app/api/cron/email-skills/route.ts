import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processUnprocessedEmails } from "@/lib/ai/email-skills";
import { startJobRun, completeJobRun } from "@/lib/logging/jobs";

// AI calls across a batch can take a while.
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

/**
 * GET /api/cron/email-skills
 *
 * Runs admin-defined AI email skills over inbound messages that have
 * not been processed yet (skill_processed_at IS NULL). Decoupled from
 * mail-sync by that queue column. No-ops while the 'email_skills'
 * feature flag is disabled.
 * Vercel Cron schedule: every 5 minutes.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!verifyCronSecret(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobRunId = await startJobRun({ jobName: "email-skills", jobType: "api_cron" });

  try {
    const summary = await processUnprocessedEmails();
    await completeJobRun(jobRunId!, {
      status: summary.errors.length === 0 ? "success" : "partial",
      rowsAffected: summary.processed,
      metadata: summary as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await completeJobRun(jobRunId!, { status: "failed", errorMessage: message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
