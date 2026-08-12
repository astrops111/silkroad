import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/trade-flows — the signed-in user's trade flows.
 *
 * Uses the user-scoped client so the 00134 RLS policies decide visibility:
 * buyers see flows where they are the buyer (user or company), suppliers see
 * flows assigned to their company. Read-only — all writes are admin-side.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("trade_flows")
    .select(
      "id, flow_number, rfq_id, purchase_order_id, current_step, buyer_company_name, supplier_name, destination_port, currency, grand_total, shipping_fee_due, vessel_name, eta, created_at, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[trade-flows] list failed:", error);
    return NextResponse.json({ error: "Failed to list trade flows" }, { status: 500 });
  }
  return NextResponse.json({ flows: data ?? [] });
}
