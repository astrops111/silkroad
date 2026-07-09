import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { flutterwaveGateway } from "@/lib/payments/gateways/flutterwave";

/**
 * GET /api/payments/flutterwave/status?transactionId=xxx
 * Poll for Flutterwave payment status (mobile money is async; card redirects
 * are normally finalized by /api/webhooks/flutterwave, this is a fallback poll).
 */
export async function GET(request: NextRequest) {
  const transactionId = request.nextUrl.searchParams.get("transactionId");
  if (!transactionId) {
    return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: tx } = await supabase
    .from("payment_transactions")
    .select("id, purchase_order_id, status")
    .eq("gateway_transaction_id", transactionId)
    .maybeSingle();
  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  // Verify the transaction's order belongs to the authenticated buyer
  const { data: order } = await supabase
    .from("purchase_orders")
    .select("buyer_user_id")
    .eq("id", tx.purchase_order_id)
    .single();
  if (!order || order.buyer_user_id !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = await flutterwaveGateway.checkStatus(transactionId);

  if (
    (status.status === "succeeded" || status.status === "failed") &&
    tx.status !== "succeeded" &&
    tx.status !== "failed"
  ) {
    await supabase
      .from("payment_transactions")
      .update({
        status: status.status,
        raw_response: status.rawResponse as object,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    if (status.status === "succeeded") {
      await supabase
        .from("purchase_orders")
        .update({ status: "paid" })
        .eq("id", tx.purchase_order_id);

      await supabase
        .from("supplier_orders")
        .update({ status: "paid" })
        .eq("purchase_order_id", tx.purchase_order_id);
    }
  }

  return NextResponse.json({
    transactionId: status.transactionId,
    status: status.status,
    amount: status.amount,
    currency: status.currency,
    paidAt: status.paidAt,
  });
}
