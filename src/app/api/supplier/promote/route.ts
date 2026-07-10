import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Plan-tier gating is disabled for now — every company gets the same
// promotion quota regardless of tier. Restore per-tier values here to
// bring the paywall back.
const TIER_LIMITS: Record<string, number> = {
  free: 5,
  standard: 5,
  gold: 5,
  verified: 5,
};

/**
 * GET /api/supplier/promote — List supplier's promoted listings + usage
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = request.nextUrl.searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  // Verify caller belongs to this company
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userProfile?.id)
    .eq("company_id", companyId)
    .single();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get active promotions
  const { data: promotions } = await supabase
    .from("promoted_listings")
    .select(`
      *, products:product_id (id, name, slug, base_price, currency,
        product_images (url, is_primary))
    `)
    .eq("supplier_id", companyId)
    .order("created_at", { ascending: false });

  // Get supplier tier
  const { data: supplierProfile } = await supabase
    .from("supplier_profiles")
    .select("tier")
    .eq("company_id", companyId)
    .single();

  const tier = (supplierProfile as { tier?: string } | null)?.tier || "free";
  const limit = TIER_LIMITS[tier] || 0;

  // Get current month usage
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: usage } = await supabase
    .from("promotion_usage")
    .select("promotions_used")
    .eq("supplier_id", companyId)
    .eq("month_start", monthStart.toISOString().slice(0, 10))
    .single();

  return NextResponse.json({
    promotions: promotions || [],
    tier,
    limit,
    used: usage?.promotions_used || 0,
    remaining: Math.max(0, limit - (usage?.promotions_used || 0)),
  });
}

/**
 * POST /api/supplier/promote — Promote a product listing
 * Body: { productId, companyId, placement?, durationDays? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { productId, companyId, placement = "search", durationDays = 30 } = await request.json();

  if (!productId || !companyId) {
    return NextResponse.json({ error: "productId and companyId required" }, { status: 400 });
  }

  // Check tier
  const { data: profile } = await supabase
    .from("supplier_profiles")
    .select("tier")
    .eq("company_id", companyId)
    .single();

  const tier = profile?.tier || "free";
  const limit = TIER_LIMITS[tier] || 0;

  if (limit === 0) {
    return NextResponse.json(
      { error: "Your subscription tier does not include promoted listings. Upgrade to Gold or Verified." },
      { status: 403 }
    );
  }

  // Check monthly usage
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStr = monthStart.toISOString().slice(0, 10);

  const { data: usage } = await supabase
    .from("promotion_usage")
    .select("id, promotions_used")
    .eq("supplier_id", companyId)
    .eq("month_start", monthStr)
    .single();

  const used = usage?.promotions_used || 0;
  if (used >= limit) {
    return NextResponse.json(
      { error: `Monthly promotion limit reached (${limit} for ${tier} tier)` },
      { status: 403 }
    );
  }

  // Verify product belongs to supplier
  const { data: product } = await supabase
    .from("products")
    .select("id, moderation_status")
    .eq("id", productId)
    .eq("supplier_id", companyId)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.moderation_status !== "approved") {
    return NextResponse.json({ error: "Only approved products can be promoted" }, { status: 400 });
  }

  // Create promotion
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + durationDays);

  const { data: promo, error } = await supabase
    .from("promoted_listings")
    .insert({
      product_id: productId,
      supplier_id: companyId,
      placement,
      starts_at: new Date().toISOString(),
      ends_at: endsAt.toISOString(),
      billing_type: "included",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update is_featured on product
  await supabase.from("products").update({ is_featured: true }).eq("id", productId);

  // Upsert usage counter
  if (usage) {
    await supabase
      .from("promotion_usage")
      .update({ promotions_used: used + 1 })
      .eq("id", usage.id);
  } else {
    await supabase.from("promotion_usage").insert({
      supplier_id: companyId,
      month_start: monthStr,
      promotions_used: 1,
      promotions_limit: limit,
    });
  }

  return NextResponse.json({ success: true, promotionId: promo.id });
}

/**
 * DELETE /api/supplier/promote — Remove a promotion
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { promotionId } = await request.json();

  if (!promotionId) {
    return NextResponse.json({ error: "promotionId required" }, { status: 400 });
  }

  // Verify caller owns this promotion via company membership
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  const { data: promoCheck } = await supabase
    .from("promoted_listings")
    .select("supplier_id")
    .eq("id", promotionId)
    .single();
  if (!promoCheck) return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
  const { data: memberCheck } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", profile?.id)
    .eq("company_id", promoCheck.supplier_id)
    .single();
  if (!memberCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get promotion to un-feature the product
  const { data: promo } = await supabase
    .from("promoted_listings")
    .select("product_id")
    .eq("id", promotionId)
    .single();

  await supabase.from("promoted_listings").update({ is_active: false }).eq("id", promotionId);

  // Check if product has other active promotions
  if (promo) {
    const { count } = await supabase
      .from("promoted_listings")
      .select("id", { count: "exact", head: true })
      .eq("product_id", promo.product_id)
      .eq("is_active", true)
      .neq("id", promotionId);

    if (!count || count === 0) {
      await supabase.from("products").update({ is_featured: false }).eq("id", promo.product_id);
    }
  }

  return NextResponse.json({ success: true });
}
