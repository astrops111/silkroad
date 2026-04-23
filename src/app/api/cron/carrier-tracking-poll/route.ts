import { NextRequest, NextResponse } from "next/server";
import { runCarrierTrackingPoll } from "@/lib/logistics/tracking/poll-runner";

/**
 * GET /api/cron/carrier-tracking-poll
 *
 * Polls the configured ocean-tracking aggregator (Searates today)
 * for new container milestones across active shipments. Mirrors the
 * auth + observability pattern used by /api/cron/exchange-rates.
 *
 * Cron config (vercel.json):
 *   { "path": "/api/cron/carrier-tracking-poll", "schedule": "*\u002F30 * * * *" }
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runCarrierTrackingPoll();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("carrier-tracking-poll cron failed", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
