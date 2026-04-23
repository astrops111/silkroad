// ============================================================
// Carrier-tracking poll runner.
//
// Selects active shipments with tracking_provider set, batches them
// by adapter, calls each adapter's pollTrackingEvents(), dedupes
// against shipment_tracking_events.(source_adapter_id, external_event_id),
// inserts new events, and updates each shipment's last_polled_at.
//
// Designed to run from a Vercel cron handler (no user session) using
// the service-role Supabase client to bypass RLS. Records each run
// in scheduled_job_runs for observability.
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";
import { getAdapterById } from "@/lib/logistics/carriers/registry";
import { ingestTrackingEvent } from "./ingest";
import type {
  CarrierAdapter,
  TrackingEventIngestion,
  TrackingPollRef,
} from "@/lib/logistics/carriers/types";
import type { Json } from "@/lib/supabase/database.types";

const TERMINAL_STATUSES = ["delivered", "lost", "damaged", "returned"];
const DEFAULT_BATCH_SIZE = 50;

export interface PollRunResult {
  shipmentsConsidered: number;
  adaptersUsed: string[];
  eventsIngested: number;
  eventsSkippedDedup: number;
  errors: { shipmentId?: string; adapter?: string; message: string }[];
}

interface ActiveShipmentRow {
  id: string;
  tracking_provider: string | null;
  tracking_external_ref: string | null;
  carrier_scac: string | null;
  last_polled_at: string | null;
}

export async function runCarrierTrackingPoll(
  options: { batchSize?: number } = {},
): Promise<PollRunResult> {
  const startedAt = new Date().toISOString();
  const supabase = createServiceClient();
  const errors: PollRunResult["errors"] = [];

  // Pick the stalest active shipments first so a finite-budget poll
  // makes forward progress across the whole fleet over time.
  const { data: shipments, error: selectErr } = await supabase
    .from("b2b_shipments")
    .select("id, tracking_provider, tracking_external_ref, carrier_scac, last_polled_at")
    .not("tracking_provider", "is", null)
    .not("tracking_external_ref", "is", null)
    .not("status", "in", `(${TERMINAL_STATUSES.map((s) => `"${s}"`).join(",")})`)
    .order("last_polled_at", { ascending: true, nullsFirst: true })
    .limit(options.batchSize ?? DEFAULT_BATCH_SIZE);

  if (selectErr) {
    errors.push({ message: `Shipment select failed: ${selectErr.message}` });
    await recordRun(supabase, startedAt, "failed", { errors });
    return {
      shipmentsConsidered: 0,
      adaptersUsed: [],
      eventsIngested: 0,
      eventsSkippedDedup: 0,
      errors,
    };
  }

  const rows = (shipments ?? []) as ActiveShipmentRow[];
  if (rows.length === 0) {
    await recordRun(supabase, startedAt, "success", { shipmentsConsidered: 0 });
    return { shipmentsConsidered: 0, adaptersUsed: [], eventsIngested: 0, eventsSkippedDedup: 0, errors };
  }

  // Group refs by adapter id so each adapter is called once per run.
  const byAdapter = new Map<string, { adapter: CarrierAdapter; refs: TrackingPollRef[] }>();
  for (const r of rows) {
    if (!r.tracking_provider || !r.tracking_external_ref) continue;
    const adapter = getAdapterById(r.tracking_provider);
    if (!adapter) {
      errors.push({ shipmentId: r.id, message: `Unknown adapter: ${r.tracking_provider}` });
      continue;
    }
    if (!adapter.enabled) {
      errors.push({ adapter: adapter.id, shipmentId: r.id, message: "Adapter not configured (missing API key)" });
      continue;
    }
    if (!adapter.pollTrackingEvents) {
      errors.push({ adapter: adapter.id, shipmentId: r.id, message: "Adapter does not support polling" });
      continue;
    }
    const bucket = byAdapter.get(adapter.id) ?? { adapter, refs: [] };
    bucket.refs.push({
      shipmentId: r.id,
      externalRef: r.tracking_external_ref,
      carrierScac: r.carrier_scac ?? undefined,
      sinceIso: r.last_polled_at ?? undefined,
    });
    byAdapter.set(adapter.id, bucket);
  }

  let eventsIngested = 0;
  let eventsSkippedDedup = 0;

  for (const { adapter, refs } of byAdapter.values()) {
    let events: TrackingEventIngestion[] = [];
    try {
      events = await adapter.pollTrackingEvents!(refs);
    } catch (e) {
      errors.push({ adapter: adapter.id, message: (e as Error).message });
      continue;
    }

    for (const event of events) {
      const ingested = await ingestTrackingEvent(supabase, adapter.id, event);
      if (ingested === "inserted") eventsIngested++;
      else if (ingested === "skipped_dedup") eventsSkippedDedup++;
      else if (ingested === "error") errors.push({ adapter: adapter.id, message: "Insert failed" });
      else if (ingested === "skipped_no_match") errors.push({ adapter: adapter.id, message: "No matching shipment for event" });
    }

    // Stamp last_polled_at on every shipment we attempted, even if
    // there were no new events — prevents the same stale shipments
    // from monopolising the next batch.
    const ids = refs.map((r) => r.shipmentId);
    const { error: stampErr } = await supabase
      .from("b2b_shipments")
      .update({ last_polled_at: new Date().toISOString() })
      .in("id", ids);
    if (stampErr) errors.push({ adapter: adapter.id, message: `last_polled_at stamp failed: ${stampErr.message}` });
  }

  const status = errors.length === 0 ? "success" : "partial";
  const result: PollRunResult = {
    shipmentsConsidered: rows.length,
    adaptersUsed: [...byAdapter.keys()],
    eventsIngested,
    eventsSkippedDedup,
    errors,
  };
  await recordRun(supabase, startedAt, status, { ...result });
  return result;
}

async function recordRun(
  supabase: ReturnType<typeof createServiceClient>,
  startedAt: string,
  status: "success" | "partial" | "failed",
  metadata: Record<string, unknown>,
): Promise<void> {
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - new Date(startedAt).getTime();
  const { error } = await supabase.from("scheduled_job_runs").insert({
    job_name: "carrier-tracking-poll",
    job_type: "api_cron",
    status,
    started_at: startedAt,
    completed_at: completedAt.toISOString(),
    duration_ms: durationMs,
    metadata: metadata as Json,
  });
  if (error) console.error("recordRun: failed to log scheduled_job_runs", error);
}
