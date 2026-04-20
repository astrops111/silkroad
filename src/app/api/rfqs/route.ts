import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/rfqs — List RFQs
 * Query: status, buyerOnly (my RFQs), category, search, limit, offset
 * Suppliers see open/public RFQs. Buyers see their own.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const buyerOnly = searchParams.get("buyerOnly") === "true";
  const supplierView = searchParams.get("supplierView") === "true";
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("rfqs")
    .select(
      `
      id, rfq_number, title, description, quantity, unit,
      target_price, target_currency, delivery_country, delivery_city,
      required_by, status, is_public, deadline, quotation_count, view_count,
      buyer_company_name, buyer_country, created_at, published_at,
      category_id,
      categories ( name, slug ),
      rfq_items ( id, product_name, quantity, unit, target_unit_price )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (buyerOnly) {
    // Buyer's own RFQs
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (profile) {
      query = query.eq("buyer_user_id", profile.id);
    }
  } else if (supplierView) {
    // Suppliers see open public RFQs
    query = query.eq("is_public", true).in("status", ["open", "quoted"]);
  }

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category_id", category);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rfqs: data || [], total: count || 0, limit, offset });
}

/**
 * POST /api/rfqs — Create a new RFQ
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, country_code")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await request.json();
  const {
    title, description, categoryId, quantity, unit,
    targetPrice, currency, deliveryCountry, deliveryCity,
    requiredBy, tradeTerm, specifications, certificationsRequired,
    sampleRequired, isPublic, deadline, items, publish,
  } = body;

  if (!title || !quantity) {
    return NextResponse.json({ error: "Title and quantity are required" }, { status: 400 });
  }

  // Generate RFQ number
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rfqNumber = `RFQ-${date}-${rand}`;

  // Get buyer company info
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies ( name )")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  const { data: rfq, error } = await supabase
    .from("rfqs")
    .insert({
      rfq_number: rfqNumber,
      buyer_user_id: profile.id,
      buyer_company_id: membership?.company_id || null,
      buyer_company_name: (membership?.companies as unknown as { name: string } | null)?.name || null,
      buyer_country: profile.country_code,
      title,
      description,
      category_id: categoryId || null,
      target_price: targetPrice || null,
      target_currency: currency || "USD",
      quantity,
      unit: unit || "pieces",
      delivery_country: deliveryCountry || profile.country_code,
      delivery_city: deliveryCity || null,
      required_by: requiredBy || null,
      trade_term: tradeTerm || null,
      specifications: specifications || {},
      certifications_required: certificationsRequired || [],
      sample_required: sampleRequired || false,
      is_public: isPublic !== false,
      deadline: deadline || null,
      status: publish ? "open" : "draft",
      published_at: publish ? new Date().toISOString() : null,
    })
    .select("id, rfq_number")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create RFQ line items
  if (items?.length) {
    const rfqItems = items.map((item: { productName: string; description?: string; quantity: number; unit?: string; targetUnitPrice?: number; hsCode?: string }, idx: number) => ({
      rfq_id: rfq.id,
      product_name: item.productName,
      description: item.description || null,
      quantity: item.quantity,
      unit: item.unit || "pieces",
      target_unit_price: item.targetUnitPrice || null,
      hs_code: item.hsCode || null,
      sort_order: idx,
    }));

    await supabase.from("rfq_items").insert(rfqItems);
  }

  // Log activity
  await supabase.from("rfq_activity_log").insert({
    rfq_id: rfq.id,
    actor_user_id: profile.id,
    actor_company_id: membership?.company_id || null,
    action: publish ? "published" : "created",
    details: { rfqNumber },
  });

  return NextResponse.json({
    success: true,
    rfqId: rfq.id,
    rfqNumber: rfq.rfq_number,
    status: publish ? "open" : "draft",
  });
}

/**
 * PATCH /api/rfqs — Update RFQ (publish, cancel, award)
 * Body: { rfqId, action: "publish" | "cancel" | "award", quotationId? }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rfqId, action, quotationId } = await request.json();

  if (!rfqId || !action) {
    return NextResponse.json({ error: "Missing rfqId or action" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  switch (action) {
    case "publish": {
      const { error } = await supabase
        .from("rfqs")
        .update({
          status: "open",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", rfqId)
        .eq("status", "draft");

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase.from("rfq_activity_log").insert({
        rfq_id: rfqId,
        actor_user_id: profile?.id,
        action: "published",
      });

      return NextResponse.json({ success: true, action: "publish" });
    }

    case "cancel": {
      const { error } = await supabase
        .from("rfqs")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", rfqId)
        .in("status", ["draft", "open", "quoted"]);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase.from("rfq_activity_log").insert({
        rfq_id: rfqId,
        actor_user_id: profile?.id,
        action: "cancelled",
      });

      return NextResponse.json({ success: true, action: "cancel" });
    }

    case "award": {
      if (!quotationId) {
        return NextResponse.json({ error: "quotationId required for award" }, { status: 400 });
      }

      // Award the RFQ to the selected quotation
      const { error: rfqError } = await supabase
        .from("rfqs")
        .update({
          status: "awarded",
          awarded_at: new Date().toISOString(),
          awarded_quotation_id: quotationId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rfqId);

      if (rfqError) return NextResponse.json({ error: rfqError.message }, { status: 500 });

      // Accept the winning quotation
      await supabase
        .from("quotations")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", quotationId);

      // Reject all other quotations for this RFQ
      await supabase
        .from("quotations")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("rfq_id", rfqId)
        .neq("id", quotationId)
        .in("status", ["submitted", "revised"]);

      await supabase.from("rfq_activity_log").insert({
        rfq_id: rfqId,
        quotation_id: quotationId,
        actor_user_id: profile?.id,
        action: "awarded",
        details: { quotationId },
      });

      return NextResponse.json({ success: true, action: "award", quotationId });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
