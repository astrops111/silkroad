import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/trade-flows/[id] — read-only flow detail for the buyer/supplier.
 *
 * User-scoped client: the 00134 RLS policies restrict the flow and events to
 * the flow's parties, and documents to the released kinds only (buyer invoice
 * once sent; Seaway Bill + EBM only after completion).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: flow } = await supabase
    .from("trade_flows")
    .select(
      "id, flow_number, rfq_id, purchase_order_id, current_step, buyer_company_name, supplier_name, destination_port, currency, goods_total, shipping_cost, grand_total, shipping_fee_due, payment_instructions, shipping_payment_instructions, goods_summary, vessel_name, seaway_bill_number, etd, eta, completed_at, cancelled_at, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!flow) return NextResponse.json({ error: "Trade flow not found" }, { status: 404 });

  const [{ data: events }, { data: documents }] = await Promise.all([
    supabase
      .from("trade_flow_events")
      .select("id, from_step, to_step, note, created_at")
      .eq("trade_flow_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("trade_flow_documents")
      .select("id, kind, file_url, file_name, created_at")
      .eq("trade_flow_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return NextResponse.json({ flow, events: events ?? [], documents: documents ?? [] });
}
