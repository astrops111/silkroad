import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/rfqs/[id] — Full RFQ detail with line items and received quotations.
 *
 * Accessible by: the buyer who created it, a supplier invited to it or
 * viewing a public/open one, or an admin — enforced by the RLS policies on
 * `rfqs`/`rfq_items` (see 00015_rfq_system.sql + 00093_rfq_invited_supplier_
 * access.sql), not by an app-level filter here. A supplier only ever sees
 * their own row in the embedded `quotations` (never a competitor's pricing)
 * because the "Quotation access" RLS policy scopes that independently.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { id } = await params;

  const { data: rfq, error } = await supabase
    .from("rfqs")
    .select(
      `id, rfq_number, title, description, category, quantity, unit,
       target_price, currency, delivery_country, delivery_city,
       required_by, deadline, status, is_public, awarded_quotation_id,
       buyer_company_name, created_at, updated_at,
       rfq_items (
         id, product_name, description, quantity, unit,
         target_unit_price, specifications, hs_code, sort_order
       ),
       quotations (
         id, quotation_number, supplier_id, supplier_name,
         total_amount, currency, payment_terms, trade_term,
         lead_time_days, validity_days, valid_until, moq,
         shipping_cost, shipping_method, notes, version, status, submitted_at,
         landed_cost_snapshot, landed_cost_status, landed_cost_computed_at,
         quotation_items (
           id, product_name, quantity, unit, unit_price, total_price, lead_time_days
         )
       )`
    )
    .eq("id", id)
    .single();

  if (error || !rfq) {
    return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
  }

  return NextResponse.json({ rfq });
}
