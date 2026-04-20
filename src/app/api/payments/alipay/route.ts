import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { alipayGateway } from "@/lib/payments";

/**
 * POST /api/payments/alipay — Create Alipay payment
 * Body: { orderId, amount, payType?: "page"|"wap"|"app" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, amount, payType = "page" } = await request.json();

  if (!orderId || !amount) {
    return NextResponse.json({ error: "Missing orderId or amount" }, { status: 400 });
  }

  const result = await alipayGateway.createPayment({
    orderId,
    amount,
    currency: "CNY",
    description: "Silk Road Africa Order",
    metadata: { payType },
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${orderId}`,
  });

  // Store transaction
  await supabase.from("payment_transactions").insert({
    purchase_order_id: orderId,
    gateway: "alipay",
    gateway_transaction_id: result.transactionId,
    alipay_trade_no: result.transactionId,
    amount,
    currency: "CNY",
    status: result.status,
    raw_response: result.rawResponse,
    expires_at: result.expiresAt?.toISOString(),
  });

  return NextResponse.json({
    success: result.success,
    transactionId: result.transactionId,
    status: result.status,
    actionUrl: result.actionUrl, // Redirect URL to Alipay payment page
    actionType: result.actionType,
    expiresAt: result.expiresAt,
    error: result.error,
  });
}
