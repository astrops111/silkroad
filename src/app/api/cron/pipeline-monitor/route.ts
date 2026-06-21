import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { startJobRun, completeJobRun } from "@/lib/logging/jobs";

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
 * GET /api/cron/pipeline-monitor
 *
 * Runs every 15 minutes. Detects SLA breaches and stalled orders,
 * enqueues alert events for the processor to act on.
 *
 * Rules:
 *   1. Stuck processing locks (Vercel timeout) → reset to 'failed'
 *   2. Supplier not dispatched within 14d of confirmed → shipment.stalled
 *   3. Customs entry not filed within 24h of arrival → customs.arrival_notice_received
 *   4. Duties unpaid 48h after filing → customs.demurrage_warning
 *   5. Dead events → logged for admin visibility
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!verifyCronSecret(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const jobRunId = await startJobRun({ jobName: "pipeline-monitor", jobType: "api_cron" });

  const now = new Date();
  let alertsRaised = 0;
  let locksReset = 0;
  const issues: string[] = [];

  try {
    // ── 1. Reset expired processing locks ──────────────────────────────
    // Happens when a Vercel function times out mid-batch. The 90s lock
    // window expires and the monitor resets these to 'failed' for retry.
    const { data: stuckEvents } = await supabase
      .from("pipeline_events")
      .select("id")
      .eq("status", "processing")
      .lt("locked_until", now.toISOString());

    for (const ev of stuckEvents ?? []) {
      await supabase
        .from("pipeline_events")
        .update({
          status: "failed",
          last_error: "Processing lock expired — Vercel timeout suspected. Retrying.",
          locked_until: null,
        })
        .eq("id", ev.id);
      locksReset++;
    }

    // ── 2. Supplier dispatch SLA: confirmed but not ready_to_ship in 14d ─
    const fourteenDaysAgo = new Date(
      now.getTime() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: stalledOrders } = await supabase
      .from("supplier_orders")
      .select("id, purchase_order_id, order_number")
      .eq("status", "confirmed")
      .lt("updated_at", fourteenDaysAgo);

    for (const order of stalledOrders ?? []) {
      const idemKey = `shipment.stalled:dispatch:${order.id}`;
      const { data: exists } = await supabase
        .from("pipeline_events")
        .select("id")
        .eq("idempotency_key", idemKey)
        .maybeSingle();

      if (!exists) {
        await supabase.rpc("enqueue_pipeline_event", {
          p_event_type:        "shipment.stalled",
          p_purchase_order_id: order.purchase_order_id,
          p_supplier_order_id: order.id,
          p_shipment_id:       null,
          p_payload:           { reason: "supplier_dispatch_sla", orderNumber: order.order_number },
          p_idempotency_key:   idemKey,
          p_triggered_by_type: null,
          p_triggered_by_id:   null,
          p_next_retry_at:     null,
          p_max_attempts:      3,
        });
        alertsRaised++;
        issues.push(`Dispatch SLA: ${order.order_number} confirmed >14d ago`);
      }
    }

    // ── 3. Customs entry overdue: arrived but not filed in 24h ───────────
    const twentyFourHoursAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: arrivedShipments } = await supabase
      .from("b2b_shipments")
      .select("id, supplier_order_id, tracking_number")
      .eq("status", "at_hub")
      .eq("customs_status", "pending")
      .lt("updated_at", twentyFourHoursAgo);

    for (const shipment of arrivedShipments ?? []) {
      const idemKey = `customs.arrival_notice_received:overdue:${shipment.id}`;
      const { data: exists } = await supabase
        .from("pipeline_events")
        .select("id")
        .eq("idempotency_key", idemKey)
        .maybeSingle();

      if (!exists) {
        await supabase.rpc("enqueue_pipeline_event", {
          p_event_type:        "customs.arrival_notice_received",
          p_purchase_order_id: null,
          p_supplier_order_id: shipment.supplier_order_id,
          p_shipment_id:       shipment.id,
          p_payload:           { reason: "entry_filing_overdue", trackingNumber: shipment.tracking_number },
          p_idempotency_key:   idemKey,
          p_triggered_by_type: null,
          p_triggered_by_id:   null,
          p_next_retry_at:     null,
          p_max_attempts:      3,
        });
        alertsRaised++;
        issues.push(`Customs entry overdue: shipment ${shipment.tracking_number ?? shipment.id}`);
      }
    }

    // ── 3b. Stalled customs prep: preparing for > 48h without filing ──────────
    const fortyEightHoursAgo = new Date(
      now.getTime() - 48 * 60 * 60 * 1000
    ).toISOString();

    const { data: stalledPrepShipments } = await supabase
      .from("b2b_shipments")
      .select("id, supplier_order_id, tracking_number")
      .eq("customs_status", "preparing")
      .lt("updated_at", fortyEightHoursAgo);

    for (const shipment of stalledPrepShipments ?? []) {
      const idemKey = `customs.demurrage_warning:stalled_prep:${shipment.id}`;
      const { data: exists } = await supabase
        .from("pipeline_events")
        .select("id")
        .eq("idempotency_key", idemKey)
        .maybeSingle();

      if (!exists) {
        await supabase.rpc("enqueue_pipeline_event", {
          p_event_type:        "customs.demurrage_warning",
          p_purchase_order_id: null,
          p_supplier_order_id: shipment.supplier_order_id,
          p_shipment_id:       shipment.id,
          p_payload:           { reason: "customs_prep_stalled_48h", trackingNumber: shipment.tracking_number },
          p_idempotency_key:   idemKey,
          p_triggered_by_type: null,
          p_triggered_by_id:   null,
          p_next_retry_at:     null,
          p_max_attempts:      3,
        });
        alertsRaised++;
        issues.push(`Customs prep stalled (>48h in 'preparing'): ${shipment.tracking_number ?? shipment.id}`);
      }
    }

    // ── 4. Demurrage warning: duties not paid 48h after filing ───────────
    const { data: filedShipments } = await supabase
      .from("b2b_shipments")
      .select("id, supplier_order_id, tracking_number")
      .eq("customs_status", "submitted")
      .not("customs_filed_at", "is", null)
      .lt("customs_filed_at", fortyEightHoursAgo);

    for (const shipment of filedShipments ?? []) {
      const idemKey = `customs.demurrage_warning:duties:${shipment.id}`;
      const { data: exists } = await supabase
        .from("pipeline_events")
        .select("id")
        .eq("idempotency_key", idemKey)
        .maybeSingle();

      if (!exists) {
        await supabase.rpc("enqueue_pipeline_event", {
          p_event_type:        "customs.demurrage_warning",
          p_purchase_order_id: null,
          p_supplier_order_id: shipment.supplier_order_id,
          p_shipment_id:       shipment.id,
          p_payload:           { reason: "duties_payment_overdue", trackingNumber: shipment.tracking_number },
          p_idempotency_key:   idemKey,
          p_triggered_by_type: null,
          p_triggered_by_id:   null,
          p_next_retry_at:     null,
          p_max_attempts:      3,
        });
        alertsRaised++;
        issues.push(`Demurrage warning: duties overdue for shipment ${shipment.tracking_number ?? shipment.id}`);
      }
    }

    // ── 5. Count dead events ──────────────────────────────────────────────
    const { count: deadCount } = await supabase
      .from("pipeline_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "dead");

    if (deadCount && deadCount > 0) {
      issues.push(`${deadCount} dead event(s) require admin intervention`);
      console.warn(`[pipeline-monitor] ${deadCount} dead pipeline event(s)`);
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await completeJobRun(jobRunId!, {
      status: "failed",
      errorMessage: message,
      metadata: { alertsRaised, locksReset },
    });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  await completeJobRun(jobRunId!, {
    status: issues.length > 0 ? "partial" : "success",
    rowsAffected: alertsRaised + locksReset,
    metadata: { alertsRaised, locksReset, issues },
  });

  return NextResponse.json({ success: true, alertsRaised, locksReset, issues });
}
