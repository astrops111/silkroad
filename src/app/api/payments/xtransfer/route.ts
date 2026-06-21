import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { xtransferGateway } from "@/lib/payments/gateways/xtransfer";

/**
 * POST /api/payments/xtransfer
 *
 * Generates XTransfer bank transfer instructions for a B2B buyer to pay
 * the platform. Follows the same pattern as /api/payments/stripe and
 * /api/payments/mtn-momo — creates a payment_transactions record and
 * returns instructions to the frontend.
 *
 * The buyer makes a SWIFT/domestic wire to the platform's XTransfer
 * virtual account, including the returned reference in the memo field.
 * XTransfer fires a collection webhook when funds arrive, which updates
 * the order to "paid" via /api/webhooks/xtransfer.
 *
 * Body: { orderId: string, amount: number, currency: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { orderId?: string; amount?: number; currency?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, amount, currency } = body;
  if (!orderId || !amount || !currency) {
    return NextResponse.json(
      { error: "orderId, amount, and currency are required" },
      { status: 400 }
    );
  }

  // Verify order belongs to this user and is awaiting payment
  const { data: order } = await supabase
    .from("purchase_orders")
    .select("id, order_number, grand_total, currency, status")
    .eq("id", orderId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Order is not awaiting payment" },
      { status: 409 }
    );
  }

  // Generate payment instructions (reads env-var virtual account details — no XTransfer API call)
  let result: Awaited<ReturnType<typeof xtransferGateway.createPayment>>;
  try {
    result = await xtransferGateway.createPayment({
      orderId: order.order_number,
      amount,
      currency,
    });
  } catch (err) {
    console.error("[payments/xtransfer] createPayment error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to generate payment instructions",
        hint: "Ensure XTRANSFER_COLLECTION_BANK_NAME, XTRANSFER_COLLECTION_ACCOUNT_NO, and XTRANSFER_COLLECTION_SWIFT are set",
      },
      { status: 500 }
    );
  }

  // Record the pending payment transaction
  const { error: txError } = await supabase.from("payment_transactions").insert({
    purchase_order_id: orderId,
    gateway: "xtransfer",
    gateway_transaction_id: result.transactionId,
    amount,
    currency,
    status: result.status,
    expires_at: result.expiresAt?.toISOString(),
    raw_response: result.rawResponse,
  });

  if (txError) {
    // Non-fatal — instructions were generated; surface the data even if recording fails
    console.error("[payments/xtransfer] payment_transactions insert failed:", txError);
  }

  const raw = result.rawResponse as Record<string, unknown>;

  return NextResponse.json({
    success: true,
    transactionId: result.transactionId,
    status: result.status,
    requiresAction: true,
    actionType: "bank_transfer_instructions",
    expiresAt: result.expiresAt,
    paymentInstructions: {
      reference:     raw.reference,
      bankName:      raw.bankName,
      accountNo:     raw.accountNo,
      swiftCode:     raw.swiftCode,
      iban:          raw.iban,
      routingNumber: raw.routingNumber,
      amount,
      currency,
      expiresAt:     raw.expiresAt,
      memo:          raw.memo,
    },
  });
}
