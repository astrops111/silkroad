import type { PaymentTermsResult } from "./payment-terms";

export interface ChargeAmountResolution {
  chargeAmount: number;
  leg: "full" | "deposit" | "balance";
}

interface OrderForCharge {
  grand_total: number;
  metadata?: unknown; // Supabase Json column — may hold { paymentTerms: PaymentTermsResult }
}

function extractPaymentTerms(metadata: unknown): PaymentTermsResult | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const terms = (metadata as Record<string, unknown>).paymentTerms;
  return (terms as PaymentTermsResult) ?? undefined;
}

/**
 * How much should THIS gateway call charge, given the order's chosen
 * payment terms (stored at purchase_orders.metadata.paymentTerms) and how
 * much has already succeeded for this order. Handles both legs of a
 * deposit_balance order (first call = deposit, second call once the
 * deposit has landed = remaining balance) plus the plain immediate case.
 * net_30/net_60 never reach a gateway route — PATCH /api/orders/[id]/payment-terms
 * handles those directly — so this function is never called for them.
 */
export function resolveChargeAmount(
  order: OrderForCharge,
  priorSucceededAmount: number
): ChargeAmountResolution {
  const terms = extractPaymentTerms(order.metadata);

  if (terms?.type === "deposit_balance" && terms.deposit) {
    if (priorSucceededAmount < terms.deposit.depositAmount) {
      return { chargeAmount: terms.deposit.depositAmount - priorSucceededAmount, leg: "deposit" };
    }
    return { chargeAmount: order.grand_total - priorSucceededAmount, leg: "balance" };
  }

  return { chargeAmount: order.grand_total - priorSucceededAmount, leg: "full" };
}

/**
 * What b2b_order_status a purchase/supplier order should move to once a
 * payment just succeeded. If the cumulative succeeded amount now covers
 * the full order, it's "paid"; otherwise this was a deposit leg landing.
 */
export function resolveOrderStatusAfterSuccess(
  totalSucceededIncludingThis: number,
  grandTotal: number
): "paid" | "deposit_paid" {
  return totalSucceededIncludingThis >= grandTotal ? "paid" : "deposit_paid";
}
