import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

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
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("products")
    .select(
      `
      id, name, slug, base_price, currency, moq, moderation_status,
      is_active, is_featured, origin_country, created_at,
      supplier_id,
      companies!products_supplier_id_fkey ( name, country_code, verification_status ),
      categories ( name, slug ),
      product_images ( url, is_primary )
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
