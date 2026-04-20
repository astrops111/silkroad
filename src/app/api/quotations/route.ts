import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

/**
 * GET /api/quotations — List quotations
 * Query: rfqId (quotes for a specific RFQ), supplierOnly (my quotes), status
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const rfqId = searchParams.get("rfqId");
  const supplierOnly = searchParams.get("supplierOnly") === "true";
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("quotations")
    .select(
      `
      id, quotation_number, rfq_id, supplier_id, supplier_name,
      total_amount, currency, payment_terms, trade_term,
      lead_time_days, validity_days, valid_until, moq,
      shipping_cost, shipping_method, notes, version, status,
      submitted_at, buyer_feedback, buyer_rating, created_at,
      quotation_items (
        id, product_name, quantity, unit, unit_price, total_price, lead_time_days, moq
      ),
      rfqs ( rfq_number, title, quantity, unit, buyer_company_name )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (rfqId) query = query.eq("rfq_id", rfqId);
  if (status) query = query.eq("status", status);

  if (supplierOnly) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (profile) {
      query = query.eq("supplier_user_id", profile.id);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[quotations]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ quotations: data || [], total: count || 0, limit, offset });
}

/**
 * POST /api/quotations — Supplier submits a quotation for an RFQ
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await request.json();
  const {
    rfqId, totalAmount, currency, paymentTerms, tradeTerm,
    leadTimeDays, validityDays, moq, shippingMethod, shippingCost,
    notes, termsAndConditions, items, submit,
  } = body;

  if (!rfqId || !totalAmount) {
    return NextResponse.json({ error: "rfqId and totalAmount are required" }, { status: 400 });
  }

  // Verify RFQ is open
  const { data: rfq } = await supabase
    .from("rfqs")
    .select("id, status, deadline")
    .eq("id", rfqId)
    .single();

  if (!rfq || !["open", "quoted"].includes(rfq.status)) {
    return NextResponse.json({ error: "RFQ is not open for quotations" }, { status: 400 });
  }

  if (rfq.deadline && new Date(rfq.deadline) < new Date()) {
    return NextResponse.json({ error: "RFQ deadline has passed" }, { status: 400 });
  }

  // Get supplier company
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies ( name )")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "You must belong to a supplier company" }, { status: 400 });
  }

  // Check if supplier already quoted (for revision)
  const { data: existing } = await supabase
    .from("quotations")
    .select("id, version")
    .eq("rfq_id", rfqId)
    .eq("supplier_id", membership.company_id)
    .in("status", ["submitted", "revised", "draft"])
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const version = existing ? existing.version + 1 : 1;

  // Generate quotation number
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  const quotationNumber = `QTN-${date}-${rand}`;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + (validityDays || 30));

  const { data: quotation, error } = await supabase
    .from("quotations")
    .insert({
      quotation_number: quotationNumber,
      rfq_id: rfqId,
      supplier_id: membership.company_id,
      supplier_user_id: profile.id,
      supplier_name: (membership.companies as unknown as { name: string } | null)?.name || null,
      total_amount: totalAmount,
      currency: currency || "USD",
      payment_terms: paymentTerms || "immediate",
      trade_term: tradeTerm || null,
      lead_time_days: leadTimeDays || null,
      validity_days: validityDays || 30,
      valid_until: validUntil.toISOString().slice(0, 10),
      moq: moq || null,
      shipping_method: shippingMethod || null,
      shipping_cost: shippingCost || 0,
      notes: notes || null,
      terms_and_conditions: termsAndConditions || null,
      version,
      parent_quotation_id: existing?.id || null,
      status: submit ? "submitted" : "draft",
      submitted_at: submit ? new Date().toISOString() : null,
    })
    .select("id, quotation_number")
    .single();

  if (error) {
    console.error("[quotations]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // If revising, mark old one as revised
  if (existing && submit) {
    await supabase
      .from("quotations")
      .update({ status: "revised" })
      .eq("id", existing.id);
  }

  // Create quotation line items
  if (items?.length) {
    const qItems = items.map((item: {
      rfqItemId?: string; productName: string; description?: string;
      quantity: number; unit?: string; unitPrice: number;
      productId?: string; leadTimeDays?: number; moq?: number;
    }, idx: number) => ({
      quotation_id: quotation.id,
      rfq_item_id: item.rfqItemId || null,
      product_name: item.productName,
      description: item.description || null,
      quantity: item.quantity,
      unit: item.unit || "pieces",
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
      product_id: item.productId || null,
      lead_time_days: item.leadTimeDays || null,
      moq: item.moq || null,
      sort_order: idx,
    }));

    await supabase.from("quotation_items").insert(qItems);
  }

  // Log activity
  await supabase.from("rfq_activity_log").insert({
    rfq_id: rfqId,
    quotation_id: quotation.id,
    actor_user_id: profile.id,
    actor_company_id: membership.company_id,
    action: submit ? (version > 1 ? "revised" : "quoted") : "draft_saved",
    details: { quotationNumber, version },
  });

  return NextResponse.json({
    success: true,
    quotationId: quotation.id,
    quotationNumber: quotation.quotation_number,
    version,
    status: submit ? "submitted" : "draft",
  });
}
