import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wechatPayGateway } from "@/lib/payments";

/**
 * POST /api/payments/wechat — Create WeChat Pay order
 * Body: { orderId, amount, tradeType?: "NATIVE"|"JSAPI"|"H5", openid? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, amount, tradeType = "NATIVE", openid, clientIp } = await request.json();

  if (!orderId || !amount) {
    return NextResponse.json({ error: "Missing orderId or amount" }, { status: 400 });
  }

  const result = await wechatPayGateway.createPayment({
    orderId,
    amount,
    currency: "CNY",
    description: "Silk Road Africa Order",
    metadata: { tradeType, openid, clientIp },
  });

  // Store transaction
  await supabase.from("payment_transactions").insert({
    purchase_order_id: orderId,
    gateway: "wechat_pay",
    gateway_transaction_id: result.transactionId,
    wechat_transaction_id: result.transactionId,
    wechat_prepay_id: (result.rawResponse as Record<string, unknown>)?.prepay_id as string || null,
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
    actionType: result.actionType, // "qr_code" for NATIVE, "redirect" for H5
    actionUrl: result.actionUrl,   // QR code URL or H5 redirect
    jsapiParams: (result.rawResponse as Record<string, unknown>)?.jsapiParams, // For JSAPI
    expiresAt: result.expiresAt,
    error: result.error,
  });
}
