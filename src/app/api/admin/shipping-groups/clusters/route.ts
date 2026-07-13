import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

const PAGE_SIZE = 1000;
const MAX_PRODUCTS = 5000;
const MAX_BULK_ASSIGN = 500;

/**
 * GET /api/admin/shipping-groups/clusters
 * Returns every active product with the fields needed to cluster them by
 * origin country + shipping mode (groupage candidates) and by supplier
 * (single-MOQ pool candidates), plus the list of active shipping groups
 * for bulk assignment. Clustering itself happens client-side so filters
 * can re-group without another round trip.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const includeUnapproved = request.nextUrl.searchParams.get("all") === "1";

  type ProductRow = {
    id: string; name: string; brand: string | null;
    base_price: number; currency: string; moq: number;
    min_order_amount: number | null; min_order_grouped_by: string | null;
    shipping_mode: string | null; container_size_ft: number | null;
    origin_country: string | null; supplier_id: string;
    shipping_group_id: string | null; moderation_status: string;
    companies: { name: string; country_code: string | null } | null;
  };

  const products: ProductRow[] = [];
  for (let from = 0; from < MAX_PRODUCTS; from += PAGE_SIZE) {
    let query = supabase
      .from("products")
      .select(
        `id, name, brand, base_price, currency, moq,
         min_order_amount, min_order_grouped_by,
         shipping_mode, container_size_ft, origin_country,
         supplier_id, shipping_group_id, moderation_status,
         companies!products_supplier_id_fkey(name, country_code)`
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (!includeUnapproved) query = query.eq("moderation_status", "approved");

    const { data, error } = await query;
    if (error) {
      console.error("[admin/shipping-groups/clusters]", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    products.push(...((data ?? []) as unknown as ProductRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const { data: groups, error: gErr } = await supabase
    .from("product_shipping_groups")
    .select("id, name, code, group_type, country_code, preferred_container_type, product_mix, moq, min_order_amount, is_active")
    .eq("is_active", true)
    .order("name");

  if (gErr) {
    console.error("[admin/shipping-groups/clusters]", gErr);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      basePrice: p.base_price,
      currency: p.currency,
      moq: p.moq,
      minOrderAmount: p.min_order_amount,
      minOrderGroupedBy: p.min_order_grouped_by,
      shippingMode: p.shipping_mode,
      containerSizeFt: p.container_size_ft,
      // Origin resolution mirrors products_with_origin: product override first,
      // then the supplier company's country.
      originCountry: p.origin_country ?? p.companies?.country_code ?? null,
      supplierId: p.supplier_id,
      supplierName: p.companies?.name ?? "Unknown supplier",
      shippingGroupId: p.shipping_group_id,
      moderationStatus: p.moderation_status,
    })),
    groups: groups ?? [],
    truncated: products.length >= MAX_PRODUCTS,
  });
}

/**
 * POST /api/admin/shipping-groups/clusters — Bulk-assign products to a group.
 * Body: {
 *   productIds: string[],
 *   groupId?: string | null,           // existing group, or null to unassign
 *   createGroup?: { name, code?, group_type?, country_code?,
 *                   preferred_container_type?, product_mix?, moq?, min_order_amount? },
 *   markGroupedMinimum?: boolean,      // also set min_order_grouped_by='shipping_group'
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { productIds, groupId, createGroup, markGroupedMinimum } = await request.json();

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json({ error: "productIds required" }, { status: 400 });
  }
  if (productIds.length > MAX_BULK_ASSIGN) {
    return NextResponse.json({ error: `Max ${MAX_BULK_ASSIGN} products per request` }, { status: 400 });
  }

  let targetGroupId: string | null = groupId ?? null;

  if (createGroup) {
    if (!createGroup.name) return NextResponse.json({ error: "createGroup.name required" }, { status: 400 });
    const { data, error } = await supabase
      .from("product_shipping_groups")
      .insert({
        name: String(createGroup.name).trim(),
        code: createGroup.code
          ? String(createGroup.code).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20)
          : null,
        group_type: createGroup.group_type || "custom",
        country_code: createGroup.country_code || null,
        preferred_container_type: createGroup.preferred_container_type || null,
        product_mix: createGroup.product_mix ?? true,
        moq: createGroup.moq != null && createGroup.moq !== "" ? Number(createGroup.moq) : null,
        min_order_amount:
          createGroup.min_order_amount != null && createGroup.min_order_amount !== ""
            ? Number(createGroup.min_order_amount)
            : null,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[admin/shipping-groups/clusters] create failed:", error);
      return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
    }
    targetGroupId = data.id;
  }

  const update: Record<string, unknown> = {
    shipping_group_id: targetGroupId,
    updated_at: new Date().toISOString(),
  };
  if (targetGroupId && markGroupedMinimum) update.min_order_grouped_by = "shipping_group";
  if (!targetGroupId) update.min_order_grouped_by = null;

  const { error: upErr, count } = await supabase
    .from("products")
    .update(update, { count: "exact" })
    .in("id", productIds);

  if (upErr) {
    console.error("[admin/shipping-groups/clusters] assign failed:", upErr);
    return NextResponse.json({ error: "Failed to assign products" }, { status: 500 });
  }

  return NextResponse.json({ success: true, groupId: targetGroupId, assigned: count ?? productIds.length });
}
