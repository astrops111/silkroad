import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireSuperAdmin, isAuthError } from "@/lib/auth/guard";

function fmtCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
}

/**
 * GET /api/admin/shipping-groups
 * List all groups with product counts. ?id= returns single group + its products.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const [{ data: group, error: gErr }, { data: products }] = await Promise.all([
      supabase
        .from("product_shipping_groups")
        .select("*, ports:preferred_origin_port_id(code, name)")
        .eq("id", id)
        .single(),
      supabase
        .from("products")
        .select(
          `id, name, base_price, currency, moq, moderation_status, is_active,
           supplier_id,
           companies!products_supplier_id_fkey(name),
           categories(name)`
        )
        .eq("shipping_group_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (gErr) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    return NextResponse.json({ group, products: products ?? [] });
  }

  const { data: groups, error } = await supabase
    .from("product_shipping_groups")
    .select("id, name, code, group_type, description, country_code, preferred_container_type, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/shipping-groups]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Count products per group
  const groupIds = (groups ?? []).map((g) => g.id);
  const countMap: Record<string, number> = {};
  if (groupIds.length > 0) {
    const { data: rows } = await supabase
      .from("products")
      .select("shipping_group_id")
      .in("shipping_group_id", groupIds);
    for (const r of rows ?? []) {
      if (r.shipping_group_id) countMap[r.shipping_group_id] = (countMap[r.shipping_group_id] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    groups: (groups ?? []).map((g) => ({ ...g, product_count: countMap[g.id] ?? 0 })),
  });
}

/**
 * POST /api/admin/shipping-groups — Create a shipping group
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { name, code, group_type, description, country_code, preferred_container_type, preferred_origin_port_id, notes, product_mix, moq, min_order_amount } =
    await request.json();

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data, error } = await supabase
    .from("product_shipping_groups")
    .insert({
      name: name.trim(),
      code: code ? fmtCode(code) : null,
      group_type: group_type || "custom",
      description: description || null,
      country_code: country_code || null,
      preferred_container_type: preferred_container_type || null,
      preferred_origin_port_id: preferred_origin_port_id || null,
      notes: notes || null,
      product_mix: product_mix ?? false,
      moq: moq != null && moq !== "" ? Number(moq) : null,
      min_order_amount: min_order_amount != null && min_order_amount !== "" ? Number(min_order_amount) : null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, groupId: data.id }, { status: 201 });
}

/**
 * PUT /api/admin/shipping-groups — Update a shipping group
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { groupId, ...fields } = await request.json();
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

  const allowed = [
    "name", "code", "group_type", "description", "country_code",
    "preferred_container_type", "preferred_origin_port_id", "notes", "is_active",
    "product_mix", "moq", "min_order_amount",
  ];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      update[key] = key === "code" && fields[key] ? fmtCode(fields[key] as string) : fields[key];
    }
  }
  if (update.preferred_container_type === "") update.preferred_container_type = null;

  const { error } = await supabase.from("product_shipping_groups").update(update).eq("id", groupId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/shipping-groups?id= — Deactivate a group (super admin only)
 * Unassigns all products first.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const groupId = request.nextUrl.searchParams.get("id");
  if (!groupId) return NextResponse.json({ error: "id required" }, { status: 400 });

  await supabase.from("products").update({ shipping_group_id: null }).eq("shipping_group_id", groupId);

  const { error } = await supabase
    .from("product_shipping_groups")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", groupId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
