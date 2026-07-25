import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { processRefund } from "@/lib/payments/refund";

/**
 * POST /api/refunds — Initiate a refund for a supplier order
 * Body: { supplierOrderId, reason, amount?, type: "full" | "partial" }
 *
 * Admin-only: refunds move real money, so this is not a buyer self-service
 * endpoint. Cumulative refunded amount (across prior calls for the same
 * supplier order) is capped at the original charge so repeated partial
 * refunds can't exceed what was actually paid. Dispute resolution
 * (PATCH /api/admin/disputes) can also trigger a refund via the same
 * processRefund() — this route and that one share the implementation.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (isAuthError(admin)) return admin;

  const { supplierOrderId, reason, amount, type = "full" } = await request.json();

  if (!supplierOrderId || !reason) {
    return NextResponse.json({ error: "supplierOrderId and reason are required" }, { status: 400 });
  }

  const result = await processRefund({
    supplierOrderId,
    reason,
    amount,
    type,
    adminProfileId: admin.profile.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ...result, type });
}

/**
 * GET /api/refunds — List refunds for the current user's orders
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Get user's purchase orders
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("id")
    .eq("buyer_user_id", profile.id);

  if (!orders || orders.length === 0) {
    return NextResponse.json({ refunds: [] });
  }

  const orderIds = orders.map((o) => o.id);

  const { data: refunds } = await supabase
    .from("payment_transactions")
    .select("id, gateway, amount, currency, status, gateway_transaction_id, raw_request, created_at")
    .in("purchase_order_id", orderIds)
    .in("status", ["refunded", "processing"])
    .order("created_at", { ascending: false });

  return NextResponse.json({ refunds: refunds || [] });
}
