import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  calculatePaymentTerms,
  qualifiesForCreditTerms,
  type PaymentTermType,
} from "@/lib/payments/payment-terms";

const VALID_TERMS: PaymentTermType[] = ["immediate", "deposit_balance", "net_30", "net_60"];

/**
 * PATCH /api/orders/[id]/payment-terms — Choose how this order gets paid.
 * Body: { paymentTerms: "immediate"|"deposit_balance"|"net_30"|"net_60", depositPercent? }
 *
 * Server-side only — the client's PaymentTermsSelector already gates net-30/60
 * behind qualifiesForCreditTerms, but that's a UI convenience, not security;
 * this route re-derives the buyer's verification/order-history and re-checks
 * eligibility itself before ever recording credit terms.
 *
 * immediate/deposit_balance: just records the terms — the caller proceeds to
 * a gateway route (POST /api/payments/<gateway>), which reads
 * purchase_orders.metadata.paymentTerms via resolveChargeAmount() to charge
 * the right amount for the right leg.
 *
 * net_30/net_60: no gateway call — $0 is collected now. A "processing"
 * payment_transactions row (gateway: "bank_transfer", the same manual/ops-
 * reconciled gateway type used elsewhere — see MANUAL_SETTLEMENT_GATEWAYS in
 * src/lib/payments/refund.ts) records the invoice + due date, and the order
 * moves straight to "paid" so the existing order.payment_confirmed trigger
 * unlocks fulfillment. An admin marks that transaction "succeeded" once the
 * wire actually lands (admin/payments "Mark Reconciled" action).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { id } = await params;

  let body: { paymentTerms?: string; depositPercent?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const paymentTerms = body.paymentTerms as PaymentTermType | undefined;
  if (!paymentTerms || !VALID_TERMS.includes(paymentTerms)) {
    return NextResponse.json({ error: "Invalid paymentTerms" }, { status: 400 });
  }

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("id, status, grand_total, currency, buyer_company_id, metadata")
    .eq("id", id)
    .eq("buyer_user_id", profile.id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Payment terms can only be chosen while the order is awaiting payment" },
      { status: 400 }
    );
  }

  let buyerVerified = false;
  let totalOrders = 0;
  let totalSpend = 0;
  if (order.buyer_company_id) {
    const [{ data: company }, { data: history }] = await Promise.all([
      supabase.from("companies").select("is_verified").eq("id", order.buyer_company_id).single(),
      supabase
        .from("purchase_orders")
        .select("grand_total")
        .eq("buyer_company_id", order.buyer_company_id)
        .not("status", "in", "(draft,pending_approval,pending_payment,cancelled)"),
    ]);
    buyerVerified = company?.is_verified ?? false;
    totalOrders = history?.length ?? 0;
    totalSpend = (history ?? []).reduce((sum, o) => sum + (o.grand_total ?? 0), 0);
  }

  if (
    (paymentTerms === "net_30" || paymentTerms === "net_60") &&
    !qualifiesForCreditTerms(buyerVerified, totalOrders, totalSpend).includes(paymentTerms)
  ) {
    return NextResponse.json({ error: "This account does not qualify for these payment terms" }, { status: 403 });
  }

  const result = calculatePaymentTerms(
    order.grand_total,
    order.currency || "USD",
    paymentTerms,
    { depositPercent: body.depositPercent }
  );

  const existingMetadata = (order.metadata as Record<string, unknown> | null) ?? {};
  await supabase
    .from("purchase_orders")
    .update({ metadata: { ...existingMetadata, paymentTerms: result } })
    .eq("id", id);

  if (paymentTerms === "net_30" || paymentTerms === "net_60") {
    // RLS restricts supplier_orders writes to the owning supplier company
    // (same reason quote-accept's order creation uses the service client) —
    // needed here since this is a buyer-triggered credit approval.
    const serviceClient = createServiceClient();
    const now = new Date().toISOString();

    await serviceClient.from("payment_transactions").insert({
      purchase_order_id: id,
      gateway: "bank_transfer",
      amount: order.grand_total,
      currency: order.currency || "USD",
      status: "processing",
      payment_terms: paymentTerms,
      balance_due_at: result.invoiceDueDate ? new Date(result.invoiceDueDate).toISOString() : null,
    });

    await serviceClient.from("purchase_orders").update({ status: "paid", updated_at: now }).eq("id", id);
    await serviceClient.from("supplier_orders").update({ status: "paid", updated_at: now }).eq("purchase_order_id", id);

    return NextResponse.json({ requiresPayment: false, paymentTerms: result });
  }

  return NextResponse.json({ requiresPayment: true, paymentTerms: result });
}
