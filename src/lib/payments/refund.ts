import { createServiceClient } from "@/lib/supabase/server";
import { getGateway } from "@/lib/payments/gateway-registry";
import type { GatewayType } from "@/lib/payments/types";

// Gateway values that represent manual/back-office settlement rather than a
// real refund API — there's nothing to call, so these are recorded as
// "processing" for ops to reconcile by hand instead of routed to getGateway().
const MANUAL_SETTLEMENT_GATEWAYS = new Set(["bank_transfer", "platform_wallet"]);

export type RefundType = "full" | "partial";

export type RefundOutcome =
  | {
      success: true;
      refundAmount: number;
      currency: string;
      refundMethod: string;
      refundReference: string;
      refundStatus: "refunded" | "processing";
    }
  | { success: false; error: string; status: number };

/**
 * Shared refund execution — used by both the admin refund endpoint
 * (POST /api/refunds) and dispute resolution (which can also trigger a
 * buyer refund). Caller is responsible for authorization; this assumes the
 * caller has already verified the actor may issue refunds.
 */
export async function processRefund(params: {
  supplierOrderId: string;
  reason: string;
  amount?: number;
  type: RefundType;
  adminProfileId: string;
}): Promise<RefundOutcome> {
  const { supplierOrderId, reason, amount, type, adminProfileId } = params;
  const serviceClient = createServiceClient();

  const { data: order } = await serviceClient
    .from("supplier_orders")
    .select("id, status, total_amount, currency, purchase_order_id, supplier_id")
    .eq("id", supplierOrderId)
    .single();

  if (!order) {
    return { success: false, error: "Order not found", status: 404 };
  }

  if (!["paid", "delivered", "completed", "disputed"].includes(order.status)) {
    return { success: false, error: `Cannot refund order in status: ${order.status}`, status: 400 };
  }

  // The original successful payment's amount/currency are the source of
  // truth for the cap and the gateway call — NOT order.total_amount/
  // order.currency, which can diverge for gateways that settle in a fixed
  // currency (Alipay/WeChat always charge in CNY regardless of the order's
  // own currency).
  const { data: payment } = await serviceClient
    .from("payment_transactions")
    .select("id, gateway, gateway_transaction_id, amount, currency, status")
    .eq("purchase_order_id", order.purchase_order_id)
    .eq("status", "succeeded")
    .limit(1)
    .single();

  if (!payment?.gateway || !payment.gateway_transaction_id) {
    return { success: false, error: "No successful payment found for this order — nothing to refund", status: 400 };
  }

  const requestedAmount = type === "full" ? payment.amount : Math.min(amount || 0, payment.amount);
  if (requestedAmount <= 0) {
    return { success: false, error: "Invalid refund amount", status: 400 };
  }

  const { data: priorRefunds } = await serviceClient
    .from("payment_transactions")
    .select("amount, status")
    .eq("purchase_order_id", order.purchase_order_id)
    .in("status", ["refunded", "processing"])
    .contains("raw_request", { originalOrderId: supplierOrderId });

  const alreadyRefunded = (priorRefunds || []).reduce((sum, r) => sum + (r.amount || 0), 0);
  const refundAmount = Math.min(requestedAmount, payment.amount - alreadyRefunded);

  if (refundAmount <= 0) {
    return { success: false, error: "This order has already been fully refunded", status: 400 };
  }

  let refundReference: string;
  let refundStatus: "refunded" | "processing";

  if (MANUAL_SETTLEMENT_GATEWAYS.has(payment.gateway)) {
    refundReference = `MANUAL-${Date.now().toString(36).toUpperCase()}`;
    refundStatus = "processing";
  } else {
    try {
      const gateway = getGateway(payment.gateway as GatewayType);
      const gwResult = await gateway.refund(payment.gateway_transaction_id, refundAmount, payment.currency);
      if (!gwResult.success) {
        return { success: false, error: gwResult.error || `${payment.gateway} refund failed`, status: 502 };
      }
      refundReference = gwResult.refundId || `${payment.gateway.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      refundStatus = gwResult.status === "succeeded" ? "refunded" : "processing";
    } catch (err) {
      console.error(`[refund] gateway refund failed for ${payment.gateway}:`, err);
      return {
        success: false,
        error: `Refund could not be processed automatically for ${payment.gateway}: ${err instanceof Error ? err.message : "unknown error"}`,
        status: 502,
      };
    }
  }

  await serviceClient.from("payment_transactions").insert({
    purchase_order_id: order.purchase_order_id,
    gateway: payment.gateway,
    amount: refundAmount,
    currency: payment.currency,
    status: refundStatus,
    gateway_transaction_id: refundReference,
    raw_request: { type, reason, originalOrderId: supplierOrderId },
  });

  const fullyRefunded = alreadyRefunded + refundAmount >= payment.amount;
  const newStatus = fullyRefunded ? "refunded" : order.status;
  if (fullyRefunded) {
    await serviceClient
      .from("supplier_orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", supplierOrderId);
  }

  await serviceClient.from("order_status_history").insert({
    supplier_order_id: supplierOrderId,
    from_status: order.status,
    to_status: newStatus,
    changed_by: adminProfileId,
    reason: `Refund ${type}: ${reason}. Amount: ${payment.currency} ${(refundAmount / 100).toFixed(2)}. Ref: ${refundReference}`,
  });

  return {
    success: true,
    refundAmount,
    currency: payment.currency,
    refundMethod: payment.gateway,
    refundReference,
    refundStatus,
  };
}
