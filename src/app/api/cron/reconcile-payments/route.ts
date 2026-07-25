import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getGateway } from "@/lib/payments/gateway-registry";
import type { GatewayType } from "@/lib/payments/types";

// Safety net for payments that never got a webhook — a buyer's browser
// closing mid-redirect, a dropped webhook delivery, etc. Everything here is
// meant to be a rare correction; the webhook handlers remain the primary
// path and already apply their own idempotency/amount checks.
//
// Only polls transactions old enough that a webhook plausibly should have
// already arrived — not a live payment still in flight.
const STALE_AFTER_MINUTES = 30;
// Beyond this, stop polling the gateway and just mark it expired so it
// doesn't get retried forever.
const GIVE_UP_AFTER_HOURS = 48;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();
  const staleThreshold = new Date(now - STALE_AFTER_MINUTES * 60 * 1000).toISOString();
  const giveUpThreshold = new Date(now - GIVE_UP_AFTER_HOURS * 60 * 60 * 1000).toISOString();

  const { data: stuck, error } = await supabase
    .from("payment_transactions")
    .select("id, gateway, gateway_transaction_id, purchase_order_id, status, created_at")
    .in("status", ["pending", "processing"])
    .lt("created_at", staleThreshold)
    .limit(100);

  if (error) {
    console.error("[cron/reconcile-payments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  let reconciled = 0;
  let expired = 0;
  let stillPending = 0;

  for (const tx of stuck ?? []) {
    if (!tx.gateway_transaction_id) continue;

    // Too old to plausibly still resolve — stop polling, let the buyer retry.
    if (tx.created_at < giveUpThreshold) {
      await supabase
        .from("payment_transactions")
        .update({ status: "expired" })
        .eq("id", tx.id);
      expired++;
      continue;
    }

    let result;
    try {
      const gateway = getGateway(tx.gateway as GatewayType);
      result = await gateway.checkStatus(tx.gateway_transaction_id);
    } catch (err) {
      console.error(`[cron/reconcile-payments] checkStatus failed for ${tx.id}:`, err);
      continue;
    }

    if (result.status === tx.status) {
      stillPending++;
      continue;
    }

    await supabase
      .from("payment_transactions")
      .update({ status: result.status, raw_response: result.rawResponse })
      .eq("id", tx.id);

    if (result.status === "succeeded" && tx.purchase_order_id) {
      await supabase
        .from("purchase_orders")
        .update({ status: "paid" })
        .eq("id", tx.purchase_order_id)
        .eq("status", "pending_payment");

      await supabase
        .from("supplier_orders")
        .update({ status: "paid" })
        .eq("purchase_order_id", tx.purchase_order_id)
        .eq("status", "pending_payment");
    }

    reconciled++;
  }

  console.log(
    `[cron/reconcile-payments] checked ${stuck?.length ?? 0}, reconciled ${reconciled}, expired ${expired}, still pending ${stillPending}`
  );

  return NextResponse.json({ success: true, checked: stuck?.length ?? 0, reconciled, expired, stillPending });
}
