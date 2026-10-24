import { NextRequest, NextResponse } from "next/server";
import { runCarrierTrackingPoll } from "@/lib/logistics/tracking/poll-runner";

/**
 * GET /api/cron/carrier-tracking-poll
 *
 * Polls the configured ocean-tracking aggregator (Searates today)
 * for new container milestones across active shipments. Mirrors the
 * auth + observability pattern used by /api/cron/exchange-rates.
 *
 * Scheduled by Supabase pg_cron → public.app_cron_call() (see
 * supabase/migrations/00102_pg_cron_schedules.sql; live schedule in cron.job). Every 30 min.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCarrierTrackingPoll();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("carrier-tracking-poll cron failed", e);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
