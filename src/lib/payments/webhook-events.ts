import type { createServiceClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logging/activity";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Sum of all "succeeded" payment_transactions for a purchase order, used by
 * both the payment-creation routes (resolveChargeAmount's priorSucceededAmount
 * — called BEFORE the new transaction row is inserted, so it naturally
 * excludes it) and the webhook routes (resolveOrderStatusAfterSuccess's
 * totalSucceeded — called AFTER this transaction's status flips to
 * "succeeded", so it naturally includes it). Refunds are separate
 * payment_transactions rows with their own status, not subtracted here —
 * deposit/balance sequencing doesn't need that, refunds are handled entirely
 * by handleGatewayRefund/processRefund.
 *
 * CAVEAT: amounts are summed as stored, in whatever currency each individual
 * transaction settled in. Alipay/WeChat always record CNY regardless of the
 * order's own currency (see the identical caveat already documented in
 * src/lib/payments/refund.ts) — a deposit paid via one of those and a
 * balance paid via an order-currency gateway (or vice versa) would compare
 * mismatched units here. Same known limitation as refund.ts, not newly
 * introduced; a full fix needs currency-normalized amounts on every
 * payment_transactions row, which is out of scope for deposit wiring alone.
 */
export async function sumSucceededPaymentAmount(
  supabase: ServiceClient,
  purchaseOrderId: string
): Promise<number> {
  const { data } = await supabase
    .from("payment_transactions")
    .select("amount")
    .eq("purchase_order_id", purchaseOrderId)
    .eq("status", "succeeded");

  return (data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
}

/**
 * Shared handling for gateway-initiated refund/dispute events, called from
 * all 6 payment webhook routes. A "refund" here means the gateway told us
 * money moved back to the buyer OUTSIDE our own processRefund() flow (e.g.
 * an admin issued it directly from the Stripe dashboard, or WeChat's
 * REFUND.SUCCESS notify). A "dispute" is a card-network chargeback or
 * equivalent gateway-side dispute — these reuse the existing buyer-dispute
 * table/admin-resolution/settlement-blocking machinery
 * (src/lib/actions/disputes.ts, PATCH /api/admin/disputes,
 * src/lib/settlement/engine.ts) rather than a parallel system.
 */

export interface GatewayRefundParams {
  gateway: string;
  txId: string; // payment_transactions.id
  purchaseOrderId: string;
  rawEvent: unknown;
}

export async function handleGatewayRefund(
  supabase: ServiceClient,
  params: GatewayRefundParams
): Promise<void> {
  const now = new Date().toISOString();

  await supabase
    .from("payment_transactions")
    .update({ status: "refunded", raw_response: params.rawEvent as object, updated_at: now })
    .eq("id", params.txId);

  await supabase
    .from("purchase_orders")
    .update({ status: "refunded", updated_at: now })
    .eq("id", params.purchaseOrderId);

  const { data: supplierOrders } = await supabase
    .from("supplier_orders")
    .select("id, status")
    .eq("purchase_order_id", params.purchaseOrderId);

  if (!supplierOrders?.length) return;

  await supabase
    .from("supplier_orders")
    .update({ status: "refunded", updated_at: now })
    .eq("purchase_order_id", params.purchaseOrderId);

  await supabase.from("order_status_history").insert(
    supplierOrders.map((so) => ({
      supplier_order_id: so.id,
      from_status: so.status,
      to_status: "refunded" as const,
      reason: `Refunded via ${params.gateway} webhook`,
    }))
  );
}

export interface GatewayDisputeParams {
  gateway: string;
  purchaseOrderId: string;
  gatewayDisputeId: string;
  amount?: number;
  currency?: string;
  reason?: string;
}

export async function handleGatewayDispute(
  supabase: ServiceClient,
  params: GatewayDisputeParams
): Promise<void> {
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, buyer_company_id, currency")
    .eq("id", params.purchaseOrderId)
    .single();

  if (!po?.buyer_company_id) {
    await logError({
      errorCode: "CHARGEBACK_NO_BUYER_COMPANY",
      message: `Chargeback received via ${params.gateway} for purchase order ${params.purchaseOrderId}, but it has no buyer_company_id — cannot open a dispute record. Needs manual handling.`,
      source: `webhook/${params.gateway}`,
      severity: "critical",
      metadata: { purchaseOrderId: params.purchaseOrderId, gatewayDisputeId: params.gatewayDisputeId },
    });
    return;
  }

  const { data: supplierOrders } = await supabase
    .from("supplier_orders")
    .select("id, supplier_id")
    .eq("purchase_order_id", params.purchaseOrderId);

  if (!supplierOrders?.length) return;

  for (const so of supplierOrders) {
    const { data: existing } = await supabase
      .from("disputes")
      .select("id")
      .eq("gateway_dispute_id", params.gatewayDisputeId)
      .eq("supplier_order_id", so.id)
      .maybeSingle();

    if (existing) continue; // idempotent — webhook retry already recorded

    await supabase.from("disputes").insert({
      supplier_order_id: so.id,
      purchase_order_id: params.purchaseOrderId,
      opened_by_user_id: null,
      opened_by_company_id: po.buyer_company_id,
      supplier_company_id: so.supplier_id,
      initiated_by: "gateway",
      gateway_dispute_id: params.gatewayDisputeId,
      type: "chargeback",
      title: `Chargeback via ${params.gateway}`,
      description: params.reason
        ? `Gateway-initiated chargeback (${params.reason})`
        : `Gateway-initiated chargeback via ${params.gateway}`,
      disputed_amount: params.amount ?? null,
      currency: params.currency ?? po.currency ?? "USD",
      blocks_settlement: true,
    });

    // If the settlement for this supplier_order already paid out, the
    // 72h-window/blocks_settlement checks in the settlement engine never
    // got a chance to run — flag it for manual ops recovery instead of
    // reading as clean. Automatic clawback from the supplier is out of
    // scope here (confirmed with product owner).
    const { data: settlement } = await supabase
      .from("settlements")
      .select("id")
      .contains("supplier_order_ids", [so.id])
      .eq("status", "paid")
      .maybeSingle();

    if (settlement) {
      await supabase
        .from("settlements")
        .update({ status: "disputed", updated_at: new Date().toISOString() })
        .eq("id", settlement.id);

      await logError({
        errorCode: "CHARGEBACK_AFTER_PAYOUT",
        message: `Chargeback via ${params.gateway} for supplier_order ${so.id} arrived after settlement ${settlement.id} was already paid out. Manual recovery required.`,
        source: `webhook/${params.gateway}`,
        severity: "critical",
        metadata: { supplierOrderId: so.id, settlementId: settlement.id, gatewayDisputeId: params.gatewayDisputeId },
      });
    }
  }
}
