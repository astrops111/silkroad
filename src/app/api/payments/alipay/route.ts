import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { alipayGateway } from "@/lib/payments";
import { convertCurrency } from "@/lib/payments/currency";

/**
 * POST /api/payments/alipay — Create Alipay payment
 * Body: { orderId, amount, payType?: "page"|"wap"|"app" }
 *
 * Alipay only settles in CNY, so unlike a same-currency gateway this route
 * still must convert — but the order lookup + amount comparison below
 * happens BEFORE any conversion, against the DB-sourced grand_total, so a
 * client-supplied amount can never influence what actually gets charged.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, amount, payType = "page" } = await request.json();

  if (!orderId || !amount) {
    return NextResponse.json({ error: "Missing orderId or amount" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("id, status, grand_total, currency")
    .eq("id", orderId)
    .eq("buyer_user_id", profile.id)
    .single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment")
    return NextResponse.json({ error: "Order is not awaiting payment" }, { status: 400 });

  // Validate client-supplied amount against DB source of truth (in order currency)
  const requestAmount = Number(amount);
  if (Math.abs(requestAmount - order.grand_total) > 1) {
    return NextResponse.json({ error: "Amount does not match order total" }, { status: 400 });
  }

  // Alipay always settles in CNY — convert the DB-sourced amount, never the client-supplied value
  const orderCurrency = order.currency || "USD";
  const { convertedAmount: chargeAmount, exchangeRate } =
    orderCurrency === "CNY"
      ? { convertedAmount: order.grand_total, exchangeRate: 1 }
      : await convertCurrency(order.grand_total, orderCurrency, "CNY");

  const result = await alipayGateway.createPayment({
    orderId,
    amount: chargeAmount,
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
    amount: chargeAmount,
    currency: "CNY",
    exchange_rate: exchangeRate,
    amount_in_usd: orderCurrency === "USD" ? order.grand_total : null,
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
