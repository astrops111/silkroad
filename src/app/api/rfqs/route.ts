import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchTerm } from "@/lib/security/sanitize";

const rfqCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  quantity: z.number({ error: "Quantity is required" }).positive(),
  unit: z.string().max(50).optional(),
  targetPrice: z.number().positive().optional().nullable(),
  currency: z.string().length(3).optional(),
  deliveryCountry: z.string().length(2).optional(),
  deliveryCity: z.string().max(100).optional().nullable(),
  requiredBy: z.string().max(50).optional().nullable(),
  tradeTerm: z.enum(["fob", "cif", "exw", "ddp", "dap", "cpt", "fca"]).optional().nullable(),
  specifications: z.record(z.string(), z.unknown()).optional(),
  certificationsRequired: z.array(z.string().max(100)).max(20).optional(),
  sampleRequired: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  deadline: z.string().max(50).optional().nullable(),
  items: z
    .array(
      z.object({
        productName: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        quantity: z.number().positive(),
        unit: z.string().max(50).optional(),
        targetUnitPrice: z.number().positive().optional(),
        hsCode: z.string().max(20).optional(),
      })
    )
    .max(50)
    .optional(),
  publish: z.boolean().optional(),
});

/**
 * GET /api/rfqs — List RFQs
 * Query: status, buyerOnly (my RFQs), category, search, limit, offset
 * Suppliers see open/public RFQs. Buyers see their own.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const buyerOnly = searchParams.get("buyerOnly") === "true";
  const supplierView = searchParams.get("supplierView") === "true";
  const category = searchParams.get("category");
  const rawSearch = searchParams.get("search");
  const search = rawSearch ? sanitizeSearchTerm(rawSearch) : null;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

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
    console.error("[rfqs/GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = rfqCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const {
    title, description, categoryId, quantity, unit,
    targetPrice, currency, deliveryCountry, deliveryCity,
    requiredBy, tradeTerm, specifications, certificationsRequired,
    sampleRequired, isPublic, deadline, items, publish,
  } = parsed.data;

  // Generate RFQ number
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase().substring(0, 6);
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
    console.error("[rfqs/POST]", error);
    return NextResponse.json({ error: "Failed to create RFQ" }, { status: 500 });
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

  // H10: profile must resolve before any mutation
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        .eq("status", "draft")
        .eq("buyer_user_id", profile.id);

      if (error) { console.error("[rfqs/PATCH]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }

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
        .eq("buyer_user_id", profile.id)
        .in("status", ["draft", "open", "quoted"]);

      if (error) { console.error("[rfqs/PATCH]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }

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
        .eq("id", rfqId)
        .eq("buyer_user_id", profile?.id);

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
