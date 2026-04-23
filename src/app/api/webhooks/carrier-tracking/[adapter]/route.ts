import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdapterById } from "@/lib/logistics/carriers/registry";
import { ingestTrackingEvent, type IngestOutcome } from "@/lib/logistics/tracking/ingest";
import type { Json } from "@/lib/supabase/database.types";

/**
 * POST /api/webhooks/carrier-tracking/[adapter]
 *
 * Inbound webhook surface for carrier-tracking aggregators (Searates,
 * Freightos future). Mirrors the poll-runner pipeline so a webhook
 * event and a polled event of the same milestone dedupe against each
 * other via shipment_tracking_events.(source_adapter_id, external_event_id).
 *
 * Auth: HMAC signature in adapter-specific header, verified via the
 * adapter's verifyWebhookSignature() against the raw body.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ adapter: string }> },
) {
  const { adapter: adapterId } = await context.params;
  const adapter = getAdapterById(adapterId);
  if (!adapter) {
    return NextResponse.json({ ok: false, error: "Unknown adapter" }, { status: 404 });
  }
  if (!adapter.verifyWebhookSignature || !adapter.parseWebhookPayload) {
    return NextResponse.json(
      { ok: false, error: "Adapter does not support webhooks" },
      { status: 400 },
    );
  }

  // Header values arrive as a HeadersInit-like object; lower-case all
  // keys for the adapter so it doesn't have to know the casing scheme.
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  if (!adapter.verifyWebhookSignature(rawBody, headers)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = adapter.parseWebhookPayload(payload, headers);
  if (!parsed) {
    return NextResponse.json({ ok: true, ingested: 0, message: "Payload parsed to no events" });
  }
  const events = Array.isArray(parsed) ? parsed : [parsed];

  const supabase = createServiceClient();
  const counts: Record<IngestOutcome, number> = {
    inserted: 0,
    skipped_dedup: 0,
    skipped_no_match: 0,
    error: 0,
  };

  for (const event of events) {
    const outcome = await ingestTrackingEvent(supabase, adapter.id, event);
    counts[outcome] += 1;
  }

  // Log to scheduled_job_runs for observability symmetry with the poll runner.
  // Status 'partial' when any error or no-match; 'success' when fully clean.
  const status = counts.error > 0 || counts.skipped_no_match > 0 ? "partial" : "success";
  await supabase.from("scheduled_job_runs").insert({
    job_name: `carrier-webhook-${adapter.id}`,
    job_type: "background_worker",
    status,
    metadata: { adapter: adapter.id, eventCount: events.length, ...counts } as Json,
  });

  return NextResponse.json({ ok: true, adapter: adapter.id, eventCount: events.length, ...counts });
}
