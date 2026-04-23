import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logWebhookDelivery } from "@/lib/logging/webhook";
import { listAdapters } from "@/lib/logistics/carriers/registry";
import type { TrackingEventIngestion } from "@/lib/logistics/carriers/types";

/**
 * POST /api/webhooks/carriers/[adapterId]
 *
 * Ingest inbound tracking events from a carrier/aggregator.
 * - Signature verified per adapter (HMAC or other)
 * - Payload parsed into normalized TrackingEventIngestion
 * - Shipment resolved by tracking_number, shipment_id, or external_ref
 * - Events deduped by (shipment_id, external_event_id) where provided
 * - Status transition applied when newStatus is set
 *
 * Returns 200 for any accepted-or-deduped event so carriers don't retry us.
 * Returns 4xx only for signature/parse failures that *should* be retried later.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ adapterId: string }> },
) {
  const { adapterId } = await params;
  const startTime = Date.now();

  const adapter = listAdapters().find((a) => a.id === adapterId);
  if (!adapter) {
    return NextResponse.json({ error: `Unknown adapter: ${adapterId}` }, { status: 404 });
  }
  if (!adapter.verifyWebhookSignature || !adapter.parseWebhookPayload) {
    return NextResponse.json({ error: `Adapter ${adapterId} does not support webhooks` }, { status: 400 });
  }

  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  // 1) Signature verification.
  if (!adapter.verifyWebhookSignature(rawBody, headers)) {
    await logWebhookDelivery({
      webhookType: `carrier/${adapterId}`,
      eventType: "unknown",
      status: "failed",
      httpStatusCode: 401,
      errorMessage: "Signature verification failed",
      processingTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2) JSON parse.
  let payload: unknown;
  try {
    payload = rawBody.length > 0 ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3) Adapter-specific payload → normalized ingestion.
  let parsed: TrackingEventIngestion | TrackingEventIngestion[] | null;
  try {
    parsed = adapter.parseWebhookPayload(payload, headers);
  } catch (e) {
    await logWebhookDelivery({
      webhookType: `carrier/${adapterId}`,
      eventType: "unknown",
      status: "failed",
      httpStatusCode: 400,
      errorMessage: `Parse error: ${(e as Error).message}`,
      requestPayload: asRecord(payload),
      processingTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: "Parse failed" }, { status: 400 });
  }

  if (!parsed) {
    // Adapter says "nothing actionable here" (e.g. an ack or handshake event).
    await logWebhookDelivery({
      webhookType: `carrier/${adapterId}`,
      eventType: typeof (payload as { event?: string })?.event === "string"
        ? (payload as { event: string }).event
        : "noop",
      status: "delivered",
      httpStatusCode: 200,
      requestPayload: asRecord(payload),
      processingTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  // 4) Ingest each event.
  const ingestions = Array.isArray(parsed) ? parsed : [parsed];
  const supabase = createServiceClient();
  const results: Array<{ eventType: string; status: "recorded" | "deduped" | "failed"; error?: string }> = [];

  for (const ing of ingestions) {
    try {
      const shipmentId = await resolveShipmentId(supabase, adapterId, ing);
      if (!shipmentId) {
        results.push({ eventType: ing.eventType, status: "failed", error: "Shipment not found" });
        continue;
      }

      // Dedupe via composite unique index on
      // (shipment_id, source_adapter_id, external_event_id) added in 00055.
      // If external_event_id is set, we rely on the DB to reject duplicates
      // and surface that as "deduped". Events with no external id always insert.
      const { error: insertErr } = await supabase.from("shipment_tracking_events").insert({
        shipment_id: shipmentId,
        event_type: ing.eventType,
        description: ing.description ?? null,
        location: ing.location ?? null,
        created_at: ing.occurredAt ?? undefined,
        external_event_id: ing.externalEventId ?? null,
        source_adapter_id: adapterId,
      });

      if (insertErr) {
        // Postgres 23505 = unique_violation → dedupe hit
        if (insertErr.code === "23505") {
          results.push({ eventType: ing.eventType, status: "deduped" });
          continue;
        }
        results.push({ eventType: ing.eventType, status: "failed", error: insertErr.message });
        continue;
      }

      // Status transition side effects.
      if (ing.newStatus) {
        const update: Record<string, unknown> = { status: ing.newStatus };
        if (ing.newStatus === "dispatched") update.dispatched_at = new Date().toISOString();
        if (ing.newStatus === "delivered") update.delivered_at = new Date().toISOString();
        if (ing.location) update.current_location = ing.location;
        await supabase.from("b2b_shipments").update(update).eq("id", shipmentId);
      }

      results.push({ eventType: ing.eventType, status: "recorded" });
    } catch (e) {
      results.push({ eventType: ing.eventType, status: "failed", error: (e as Error).message });
    }
  }

  await logWebhookDelivery({
    webhookType: `carrier/${adapterId}`,
    eventType: ingestions[0]?.eventType ?? "bulk",
    externalEventId: ingestions[0]?.externalEventId,
    status: results.every((r) => r.status !== "failed") ? "delivered" : "failed",
    httpStatusCode: 200,
    requestPayload: asRecord(payload),
    responsePayload: { results },
    processingTimeMs: Date.now() - startTime,
  });

  return NextResponse.json({ received: true, results });
}

// Resolve a shipment id from whatever lookup the adapter provided.
async function resolveShipmentId(
  supabase: ReturnType<typeof createServiceClient>,
  adapterId: string,
  ing: TrackingEventIngestion,
): Promise<string | null> {
  if (ing.lookup.by === "shipment_id") {
    return ing.lookup.value;
  }
  if (ing.lookup.by === "tracking_number") {
    const { data } = await supabase
      .from("b2b_shipments")
      .select("id")
      .eq("tracking_number", ing.lookup.value)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }
  if (ing.lookup.by === "external_ref") {
    // external_ref lives on ops_freight_quotes.source_reference (our outbound id
    // to the carrier), not on shipments directly. Join through converted_shipment_id.
    const { data } = await supabase
      .from("ops_freight_quotes")
      .select("converted_shipment_id")
      .eq("source_reference", ing.lookup.value)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.converted_shipment_id ?? null;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : { raw: v };
}
