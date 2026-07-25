import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/dashboard/search — Buyer dashboard header search.
 * Query: q (min 2 chars)
 * Returns up to 5 matching orders (by order number) and 5 matching
 * marketplace products (by name), scoped to the signed-in buyer.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Service client for the profile lookup — same RLS-race workaround used in
  // the /dashboard layout (the cookie-scoped client can return an empty
  // result for the signed-in user's own row).
  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ orders: [], products: [] });
  }

  const [ordersResult, productsResult] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("id, order_number, status, grand_total, currency")
      .eq("buyer_user_id", profile.id)
      .ilike("order_number", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select("id, name, base_price, currency, companies!products_supplier_id_fkey(name)")
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .ilike("name", `%${q}%`)
      .limit(5),
  ]);

  const orders = (ordersResult.data ?? []).map((o) => ({
    id: o.id,
    title: o.order_number,
    subtitle: o.status.replace(/_/g, " "),
    href: `/dashboard/orders/${o.id}`,
  }));

  const products = (productsResult.data ?? []).map((p) => ({
    id: p.id,
    title: p.name,
    subtitle: (p.companies as unknown as { name: string } | null)?.name ?? "",
    href: `/marketplace/${p.id}`,
  }));

  return NextResponse.json({ orders, products });
}
