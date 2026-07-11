import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processEmailSequences } from "@/lib/mail/sequences";
import { startJobRun, completeJobRun } from "@/lib/logging/jobs";

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
 * GET /api/cron/email-sequences
 *
 * Enrolls due subjects into active email sequences and advances chains
 * whose next step is due. Intended cadence: hourly — the vercel.json
 * cron entry is intentionally absent while automated crons are paused;
 * trigger manually with the CRON_SECRET bearer header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!verifyCronSecret(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobRunId = await startJobRun({ jobName: "email-sequences", jobType: "api_cron" });

  try {
    const summary = await processEmailSequences();
    await completeJobRun(jobRunId!, {
      status: summary.errors.length === 0 ? "success" : "partial",
      rowsAffected: summary.sent,
      metadata: summary as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await completeJobRun(jobRunId!, { status: "failed", errorMessage: message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
