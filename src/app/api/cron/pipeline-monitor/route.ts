import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { startJobRun, completeJobRun } from "@/lib/logging/jobs";
import { logError } from "@/lib/logging";
import {
  DISPATCH_SLA_DAYS,
  CUSTOMS_ENTRY_SLA_HOURS,
  DEMURRAGE_SLA_HOURS,
} from "@/lib/pipeline/config";

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

    // ── 2. Supplier dispatch SLA: confirmed but not ready_to_ship in N days ──
    const dispatchCutoff = new Date(
      now.getTime() - DISPATCH_SLA_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: stalledOrders } = await supabase
      .from("supplier_orders")
      .select("id, purchase_order_id, order_number")
      .eq("status", "confirmed")
      .lt("confirmed_at", dispatchCutoff)
      .not("confirmed_at", "is", null);

    for (const order of stalledOrders ?? []) {
      const idemKey = `shipment.stalled:dispatch:${order.id}`;
      // Rely on DB ON CONFLICT DO NOTHING — no app-side existence check needed
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
      issues.push(`Dispatch SLA: ${order.order_number} confirmed >${DISPATCH_SLA_DAYS}d ago`);
    }

    // ── 3. Customs entry overdue: arrived but not filed in N hours ────────
    const customsEntryCutoff = new Date(
      now.getTime() - CUSTOMS_ENTRY_SLA_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: arrivedShipments } = await supabase
      .from("b2b_shipments")
      .select("id, supplier_order_id, tracking_number")
      .eq("status", "at_hub")
      .eq("customs_status", "pending")
      .lt("updated_at", customsEntryCutoff);

    for (const shipment of arrivedShipments ?? []) {
      const idemKey = `customs.arrival_notice_received:overdue:${shipment.id}`;
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

    // ── 3b. Stalled customs prep: preparing for > N hours without filing ──
    const demurrageCutoff = new Date(
      now.getTime() - DEMURRAGE_SLA_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: stalledPrepShipments } = await supabase
      .from("b2b_shipments")
      .select("id, supplier_order_id, tracking_number")
      .eq("customs_status", "preparing")
      .lt("updated_at", demurrageCutoff);

    for (const shipment of stalledPrepShipments ?? []) {
      const idemKey = `customs.demurrage_warning:stalled_prep:${shipment.id}`;
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
      issues.push(`Customs prep stalled (>${DEMURRAGE_SLA_HOURS}h in 'preparing'): ${shipment.tracking_number ?? shipment.id}`);
    }

    // ── 4. Demurrage warning: duties not paid N hours after filing ────────
    const { data: filedShipments } = await supabase
      .from("b2b_shipments")
      .select("id, supplier_order_id, tracking_number")
      .eq("customs_status", "submitted")
      .not("customs_filed_at", "is", null)
      .lt("customs_filed_at", demurrageCutoff);

    for (const shipment of filedShipments ?? []) {
      const idemKey = `customs.demurrage_warning:duties:${shipment.id}`;
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

    // ── 5. Settlements stuck in processing > 2h (XTransfer webhook not received) ─
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const { data: stuckSettlements } = await supabase
      .from("settlements")
      .select("id, settlement_number")
      .eq("status", "processing")
      .lt("updated_at", twoHoursAgo);

    for (const s of stuckSettlements ?? []) {
      issues.push(`Settlement stuck in processing: ${s.settlement_number}`);
      await logError({
        errorCode: "SETTLEMENT_STUCK_PROCESSING",
        message:   `Settlement ${s.settlement_number} has been in 'processing' > 2h — XTransfer webhook may be missing`,
        source:    "pipeline-monitor",
        severity:  "error",
        metadata:  { settlementId: s.id, settlementNumber: s.settlement_number },
      }).catch(() => {});
    }

    // ── 6. Dead events ────────────────────────────────────────────────────
    const { count: deadCount } = await supabase
      .from("pipeline_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "dead");

    if (deadCount && deadCount > 0) {
      issues.push(`${deadCount} dead event(s) require admin intervention`);
      await logError({
        errorCode: "PIPELINE_DEAD_EVENTS",
        message:   `${deadCount} dead pipeline event(s) require admin intervention`,
        source:    "pipeline-monitor",
        severity:  "critical",
        metadata:  { deadCount },
      }).catch(() => {});
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
