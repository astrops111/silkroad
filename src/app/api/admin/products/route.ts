import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "") +
    "-" + Math.random().toString(36).slice(2, 7);
}

/**
 * GET /api/admin/products — List products with moderation status
 * Query params: status (pending|approved|rejected|suspended), search, supplierId, limit, offset
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const supplierId = searchParams.get("supplierId");
  const shippingGroupId = searchParams.get("shippingGroupId");
  const country = searchParams.get("country");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("products")
    .select(
      `
      id, name, name_local, slug, description, brand,
      base_price, compare_price, currency,
      moq, lead_time_days, trade_term,
      origin_country, hs_code, category_id, category_ids,
      sample_available, sample_price,
      moderation_status, is_active, is_featured, created_at,
      supplier_id, shipping_group_id,
      companies!products_supplier_id_fkey ( name, country_code, verification_status ),
      categories ( name, slug ),
      product_images ( url, is_primary ),
      product_shipping_groups ( name, code )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("moderation_status", status);
  }
  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }
  if (shippingGroupId) {
    query = query.eq("shipping_group_id", shippingGroupId);
  }
  if (country) {
    query = query.eq("origin_country", country);
  }
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[admin/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({
    products: data || [],
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * PATCH /api/admin/products — Moderate a product
 * Body: { productId, action: "approve" | "reject" | "suspend" | "feature" | "unfeature" }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { productId, action } = await request.json();

  if (!productId || !action) {
    return NextResponse.json(
      { error: "Missing productId or action" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    moderated_at: new Date().toISOString(),
  };

  switch (action) {
    case "approve":
      updates.moderation_status = "approved";
      updates.is_active = true;
      break;
    case "reject":
      updates.moderation_status = "rejected";
      updates.is_active = false;
      break;
    case "suspend":
      updates.moderation_status = "suspended";
      updates.is_active = false;
      break;
    case "feature":
      updates.is_featured = true;
      break;
    case "unfeature":
      updates.is_featured = false;
      break;
    default:
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  }

  const { error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId);

  if (error) {
    console.error("[admin/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, productId, action });
}

/**
 * POST /api/admin/products — Create a product for any supplier (admin bypass)
 * Body: { supplierId, name, basePriceDollars, ...optional fields }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const body = await request.json();
  const {
    supplierId, categoryId, shippingGroupId, name, nameLocal, description,
    basePriceDollars, comparePriceDollars, currency,
    moq, leadTimeDays, tradeTerm, originCountry, hsCode,
    sampleAvailable, samplePriceDollars, allowMixShipping, minOrderAmountDollars,
  } = body;

  if (!supplierId || !name || basePriceDollars == null) {
    return NextResponse.json({ error: "supplierId, name, basePriceDollars required" }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      supplier_id: supplierId,
      category_id: categoryId || null,
      shipping_group_id: shippingGroupId || null,
      name,
      name_local: nameLocal || null,
      slug: slugify(name),
      description: description || null,
      base_price: Math.round(basePriceDollars * 100),
      compare_price: comparePriceDollars != null ? Math.round(comparePriceDollars * 100) : null,
      currency: currency || "USD",
      moq: moq || 1,
      lead_time_days: leadTimeDays || null,
      trade_term: tradeTerm || "FOB",
      origin_country: originCountry || null,
      hs_code: hsCode || null,
      sample_available: sampleAvailable || false,
      sample_price: samplePriceDollars != null ? Math.round(samplePriceDollars * 100) : null,
      allow_mix_shipping: allowMixShipping || false,
      min_order_amount: minOrderAmountDollars ? Math.round(Number(minOrderAmountDollars) * 100) : null,
      moderation_status: "approved",
      is_active: true,
      moderated_at: new Date().toISOString(),
      moderated_by: auth.profile.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, productId: product.id }, { status: 201 });
}

/**
 * PUT /api/admin/products — Edit product fields (admin bypass)
 * Body: { productId, basePriceDollars?, comparePriceDollars?, ...other fields }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const body = await request.json();
  const { productId, basePriceDollars, comparePriceDollars, samplePriceDollars, minOrderAmountDollars, categoryIds, ...rest } = body;

  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const allowed = ["name", "name_local", "description", "brand", "currency", "moq", "lead_time_days",
    "trade_term", "origin_country", "hs_code", "category_id", "is_featured", "is_active",
    "sample_available", "shipping_group_id", "allow_mix_shipping"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const key of allowed) {
    if (rest[key] !== undefined) update[key] = rest[key];
  }
  if (basePriceDollars != null) update.base_price = Math.round(basePriceDollars * 100);
  if (comparePriceDollars != null) update.compare_price = Math.round(comparePriceDollars * 100);
  if (samplePriceDollars != null) update.sample_price = Math.round(samplePriceDollars * 100);
  if (minOrderAmountDollars != null) update.min_order_amount = minOrderAmountDollars === "" ? null : Math.round(Number(minOrderAmountDollars) * 100);
  if (Array.isArray(categoryIds)) {
    update.category_ids = categoryIds;
    update.category_id = categoryIds[0] ?? null;
  }

  const { error } = await supabase.from("products").update(update).eq("id", productId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/products?id= — Soft-delete (suspend) a product
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const productId = request.nextUrl.searchParams.get("id");
  if (!productId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: false, moderation_status: "suspended" })
    .eq("id", productId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
