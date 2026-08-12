import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { createServiceClient } from "@/lib/supabase/server";
import { createTradeFlowFromRfq, createTradeFlowFromOrder } from "@/lib/trade-flow/create";

/**
 * GET  /api/admin/trade-flows — list flows (filter: step, search; paging).
 * POST /api/admin/trade-flows — open a flow from an RFQ or purchase order:
 *        { rfqId } | { purchaseOrderId }
 */

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (isAuthError(admin)) return admin;

  const { searchParams } = new URL(request.url);
  const step = searchParams.get("step");
  const search = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

  const supabase = createServiceClient();
  let query = supabase
    .from("trade_flows")
    .select(
      "id, flow_number, rfq_id, purchase_order_id, current_step, buyer_company_name, supplier_name, destination_port, currency, grand_total, shipping_fee_due, created_at, updated_at",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (step) query = query.eq("current_step", step);
  if (search) {
    query = query.or(
      `flow_number.ilike.%${search}%,buyer_company_name.ilike.%${search}%,supplier_name.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin/trade-flows] list failed:", error);
    return NextResponse.json({ error: "Failed to list trade flows" }, { status: 500 });
  }
  return NextResponse.json({ flows: data ?? [], total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (isAuthError(admin)) return admin;

  const body = await request.json().catch(() => ({}));
  const { rfqId, purchaseOrderId }: { rfqId?: string; purchaseOrderId?: string } = body;

  if (!rfqId && !purchaseOrderId) {
    return NextResponse.json(
      { error: "rfqId or purchaseOrderId is required" },
      { status: 400 }
    );
  }

  const flowId = rfqId
    ? await createTradeFlowFromRfq(rfqId, admin.profile.id)
    : await createTradeFlowFromOrder(purchaseOrderId!, admin.profile.id);

  if (!flowId) {
    return NextResponse.json({ error: "Failed to create trade flow (source not found?)" }, { status: 400 });
  }
  return NextResponse.json({ success: true, flowId });
}
