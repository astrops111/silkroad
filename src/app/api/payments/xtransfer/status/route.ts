import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRequestMoneyStatus } from "@/lib/payments/gateways/xtransfer";

/**
 * GET /api/payments/xtransfer/status?transactionId=XT-REQ-123
 *
 * Polls XTransfer for the status of a Request Money transaction.
 * Called by the checkout page every 5 seconds after the buyer receives
 * a mobile money push (MTN, Orange, NIBSS, Vodacom, etc.).
 *
 * On terminal status (succeeded / failed):
 *   - Updates payment_transactions.status
 *   - Updates purchase_orders.status → "paid" on success
 *
 * This mirrors the MTN MoMo polling pattern at /api/payments/mtn-momo/status.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const transactionId = request.nextUrl.searchParams.get("transactionId");
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId query param is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Poll XTransfer API
  let xtStatus: Awaited<ReturnType<typeof checkRequestMoneyStatus>>;
  try {
    xtStatus = await checkRequestMoneyStatus(transactionId);
  } catch (err) {
    console.error("[payments/xtransfer/status] API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to check payment status" },
      { status: 502 }
    );
  }

  // On terminal status, update DB records (idempotent — skips already-terminal rows)
  if (xtStatus.status === "succeeded" || xtStatus.status === "failed") {
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("id, purchase_order_id, status")
      .eq("gateway_transaction_id", transactionId)
      .maybeSingle();

    if (tx && tx.status !== "succeeded" && tx.status !== "failed") {
      const now = new Date().toISOString();

      await supabase
        .from("payment_transactions")
        .update({ status: xtStatus.status, updated_at: now })
        .eq("id", tx.id);

      if (xtStatus.status === "succeeded") {
        await supabase
          .from("purchase_orders")
          .update({ status: "paid", updated_at: now })
          .eq("id", tx.purchase_order_id);
      }
    }
  }

  return NextResponse.json({ transactionId, status: xtStatus.status });
}
