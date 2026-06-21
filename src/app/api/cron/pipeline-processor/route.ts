import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getHandler } from "@/lib/pipeline";
import { computeNextRetry } from "@/lib/pipeline/retry-policy";
import { startJobRun, completeJobRun } from "@/lib/logging/jobs";
import { logActivity, logError } from "@/lib/logging";
import type { PipelineEvent, EnqueueRequest } from "@/lib/pipeline/types";

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

const BATCH_SIZE = 20;

/**
 * GET /api/cron/pipeline-processor
 *
 * Processes pending pipeline events in batches of 20.
 * Vercel Cron schedule: every minute ("* * * * *").
 *
 * Uses claim_pipeline_events() RPC (FOR UPDATE SKIP LOCKED) so
 * concurrent invocations never double-process the same event.
 *
 * Per-event flow:
 *   success → mark 'succeeded', enqueue child events if any
 *   failure → compute next retry via backoff policy
 *           → exhausted → mark 'dead' (admin must intervene)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!verifyCronSecret(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const jobRunId = await startJobRun({ jobName: "pipeline-processor", jobType: "api_cron" });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let dead = 0;
  const errors: string[] = [];

  try {
    const { data: events, error: claimErr } = await supabase
      .rpc("claim_pipeline_events", { p_batch_size: BATCH_SIZE });

    if (claimErr) throw new Error(`Claim RPC failed: ${claimErr.message}`);

    if (!events || events.length === 0) {
      await completeJobRun(jobRunId!, { status: "success", rowsAffected: 0, metadata: { processed: 0 } });
      return NextResponse.json({ success: true, processed: 0 });
    }

    for (const event of events as PipelineEvent[]) {
      processed++;
      const outcome = await processEvent(event, supabase);
      if (outcome === "succeeded") succeeded++;
      else if (outcome === "dead") { failed++; dead++; }
      else { failed++; errors.push(`${event.event_type}:${event.id}`); }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await completeJobRun(jobRunId!, {
      status: "failed",
      errorMessage: message,
      metadata: { processed, succeeded, failed, dead },
    });
    return NextResponse.json({ success: false, error: "Internal processing error" }, { status: 500 });
  }

  const status =
    processed === 0 ? "success"
    : failed === 0   ? "success"
    : succeeded === 0 ? "failed"
    : "partial";

  await completeJobRun(jobRunId!, {
    status,
    rowsAffected: processed,
    metadata: { processed, succeeded, failed, dead, errors },
  });

  return NextResponse.json({ success: true, processed, succeeded, failed, dead });
}

// ── Per-event processing ────────────────────────────────────────────────────

async function processEvent(
  event: PipelineEvent,
  supabase: ReturnType<typeof createServiceClient>
): Promise<"succeeded" | "failed" | "dead"> {
  const handler = getHandler(event.event_type);

  // No handler registered yet (stub stage) — pass through as succeeded
  if (!handler) {
    await markSucceeded(event.id, { unhandled: true }, supabase);
    return "succeeded";
  }

  let handlerResult;
  try {
    handlerResult = await handler(event, supabase);
  } catch (err) {
    handlerResult = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (handlerResult.success) {
    await markSucceeded(event.id, handlerResult.result ?? {}, supabase);
    if (handlerResult.nextEvents?.length) {
      await enqueueChildren(handlerResult.nextEvents, event, supabase);
    }
    return "succeeded";
  }

  const isDead = await markFailed(
    event,
    handlerResult.error ?? "Handler returned success:false",
    supabase
  );
  return isDead ? "dead" : "failed";
}

// ── State transitions ───────────────────────────────────────────────────────

async function markSucceeded(
  id: string,
  result: Record<string, unknown>,
  supabase: ReturnType<typeof createServiceClient>
) {
  await supabase
    .from("pipeline_events")
    .update({
      status: "succeeded",
      result,
      processed_at: new Date().toISOString(),
      locked_until: null,
    })
    .eq("id", id);
}

/** Returns true if event was moved to 'dead' (retries exhausted). */
async function markFailed(
  event: PipelineEvent,
  errorMessage: string,
  supabase: ReturnType<typeof createServiceClient>
): Promise<boolean> {
  const nextRetry = computeNextRetry(event.event_type, event.attempt_count);
  const newHistory = [
    ...(event.error_history ?? []),
    { attempt: event.attempt_count, error: errorMessage, at: new Date().toISOString() },
  ];

  if (!nextRetry) {
    await supabase
      .from("pipeline_events")
      .update({
        status: "dead",
        last_error: errorMessage,
        error_history: newHistory,
        locked_until: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    console.error(
      `[pipeline] DEAD: ${event.event_type} id=${event.id} ` +
      `order=${event.purchase_order_id ?? event.supplier_order_id} attempts=${event.attempt_count}`
    );

    const orderId = event.purchase_order_id ?? event.supplier_order_id ?? event.shipment_id;
    await Promise.all([
      logActivity({
        activityType: "pipeline_event_dead",
        description: `DEAD after ${event.attempt_count} attempts: ${event.event_type}. Error: ${errorMessage}`,
        targetType:  event.purchase_order_id ? "purchase_order"
                     : event.supplier_order_id ? "supplier_order" : "shipment",
        targetId:    orderId ?? undefined,
        targetLabel: event.event_type,
        metadata:    { eventId: event.id, eventType: event.event_type, attemptCount: event.attempt_count, lastError: errorMessage },
      }),
      logError({
        errorCode:  "PIPELINE_DEAD",
        message:    errorMessage,
        source:     "pipeline-processor",
        severity:   "critical",
        metadata:   { eventId: event.id, eventType: event.event_type, orderId },
      }),
    ]);

    return true;
  }

  await supabase
    .from("pipeline_events")
    .update({
      status: "failed",
      last_error: errorMessage,
      error_history: newHistory,
      next_retry_at: nextRetry.toISOString(),
      locked_until: null,
    })
    .eq("id", event.id);

  return false;
}

async function enqueueChildren(
  requests: EnqueueRequest[],
  parent: PipelineEvent,
  supabase: ReturnType<typeof createServiceClient>
) {
  for (const req of requests) {
    const { error } = await supabase.rpc("enqueue_pipeline_event", {
      p_event_type:        req.eventType,
      p_purchase_order_id: req.purchaseOrderId ?? parent.purchase_order_id ?? null,
      p_supplier_order_id: req.supplierOrderId ?? null,
      p_shipment_id:       req.shipmentId ?? null,
      p_payload:           req.payload ?? {},
      p_idempotency_key:   req.idempotencyKey ?? null,
      p_triggered_by_type: parent.event_type,
      p_triggered_by_id:   parent.id,
      p_next_retry_at:     req.nextRetryAt ?? null,
      p_max_attempts:      req.maxAttempts ?? 5,
    });
    if (error) {
      await logError({
        errorCode: "PIPELINE_ENQUEUE_CHILD_FAILED",
        message:   error.message,
        source:    "pipeline-processor",
        severity:  "error",
        metadata:  { parentEventId: parent.id, parentEventType: parent.event_type, childEventType: req.eventType },
      }).catch(() => {});
    }
  }
}
