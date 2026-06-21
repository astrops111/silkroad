import type { EventHandler } from "../types";
import { processSettlement } from "@/lib/settlement/engine";
import { onSettlementPaid } from "@/lib/email/events";
import { logActivity } from "@/lib/logging";

const DISPUTE_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * settlement.triggered
 * Fires when supplier_order transitions to 'delivered' (DB trigger).
 * Waits for the 72-hour dispute window to elapse, then processes payout.
 *
 * If < 72h since delivery: re-enqueues itself at 72h mark (no retry slots consumed).
 * If >= 72h and no blocking disputes: calls processSettlement + emails supplier.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { supplier_order_id } = event;
  if (!supplier_order_id) return { success: false, error: "Missing supplier_order_id" };

  // ── Find delivered_at ────────────────────────────────────────────────────────
  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("delivered_at")
    .eq("supplier_order_id", supplier_order_id)
    .order("delivered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const deliveredAt = shipment?.delivered_at ? new Date(shipment.delivered_at).getTime() : null;

  // If we can't determine delivery time, fail so retry backoff applies (not an infinite loop)
  if (!deliveredAt) {
    return {
      success: false,
      error: `No delivered_at for supplier_order ${supplier_order_id} — cannot determine dispute window`,
    };
  }

  const now = Date.now();

  if (now - deliveredAt < DISPUTE_WINDOW_MS) {
    // Dispute window still open — re-queue to fire exactly at the 72h mark
    const retryAt = new Date(deliveredAt + DISPUTE_WINDOW_MS).toISOString();
    return {
      success: true,
      result:  { waitingForDisputeWindow: true, retryAt },
      nextEvents: [{
        eventType:       "settlement.triggered",
        supplierOrderId: supplier_order_id,
        nextRetryAt:     retryAt,
        idempotencyKey:  `settlement.defer:${supplier_order_id}`,
        payload:         { deferred: true },
      }],
    };
  }

  // ── Find settlement record ───────────────────────────────────────────────────
  const { data: settlements } = await supabase
    .from("settlements")
    .select("id, status")
    .contains("supplier_order_ids", [supplier_order_id])
    .order("created_at", { ascending: false })
    .limit(1);

  const settlement = settlements?.[0];

  if (!settlement) {
    return { success: false, error: `No settlement found for supplier_order ${supplier_order_id}` };
  }

  // Already processed
  if (settlement.status === "paid" || settlement.status === "processing") {
    return { success: true, result: { alreadyProcessed: true, status: settlement.status } };
  }

  if (settlement.status !== "ready") {
    return { success: false, error: `Settlement ${settlement.id} is in status '${settlement.status}', expected 'ready'` };
  }

  // ── Process payout ───────────────────────────────────────────────────────────
  const payoutResult = await processSettlement(settlement.id);
  if (!payoutResult.success) {
    // Dispute-blocked settlements re-check daily rather than burning retry slots
    if (payoutResult.error?.startsWith("DISPUTE_BLOCK:")) {
      const retryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      return {
        success: true,
        result:  { disputeBlocked: true, retryAt },
        nextEvents: [{
          eventType:      "settlement.triggered",
          supplierOrderId: supplier_order_id,
          nextRetryAt:    retryAt,
          idempotencyKey: `settlement.dispute_hold:${supplier_order_id}`,
          payload:        { blockedByDispute: true },
        }],
      };
    }
    return { success: false, error: `processSettlement failed: ${payoutResult.error}` };
  }

  // ── Email supplier (non-fatal) ───────────────────────────────────────────────
  // XTransfer payouts are async (status='processing') — email sent by webhook when confirmed.
  if (payoutResult.data?.status === "paid") {
    await onSettlementPaid(settlement.id)
      .catch((err) => console.error("[pipeline:settlement.triggered] Supplier email failed:", err));
  }

  await logActivity({
    activityType: "settlement_processed",
    description:  `Settlement ${settlement.id} processed via ${payoutResult.data?.payoutMethod}`,
    targetType:   "supplier_order",
    targetId:     supplier_order_id,
    metadata:     { settlementId: settlement.id, payoutMethod: payoutResult.data?.payoutMethod, status: payoutResult.data?.status },
  }).catch(() => {});

  return {
    success: true,
    result: {
      settlementId:  settlement.id,
      payoutMethod:  payoutResult.data?.payoutMethod,
      payoutStatus:  payoutResult.data?.status,
    },
  };
};
