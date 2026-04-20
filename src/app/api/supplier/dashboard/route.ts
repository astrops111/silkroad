import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/supplier/dashboard — Supplier dashboard stats + recent data
 * Returns KPIs, recent orders, product stats, revenue breakdown, inquiry count
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user profile + company
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies ( name, country_code, verification_status )")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a supplier" }, { status: 403 });
  }

  const companyId = membership.company_id;
  const company = membership.companies as unknown as {
    name: string; country_code: string; verification_status: string;
  } | null;

  // ============================================================
  // KPI Queries (all in parallel)
  // ============================================================
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  const [
    totalRevenueResult,
    prevMonthRevenueResult,
    pendingOrdersResult,
    thisWeekOrdersResult,
    activeProductsResult,
    pendingProductsResult,
    supplierProfileResult,
    recentOrdersResult,
    unreadMessagesResult,
    openRfqsResult,
    topProductsResult,
    monthlyRevenueResult,
  ] = await Promise.all([
    // Total revenue (all time from completed orders)
    supabase
      .from("supplier_orders")
      .select("total_amount")
      .eq("supplier_id", companyId)
      .in("status", ["completed", "delivered"]),

    // Previous month revenue (for trend)
    supabase
      .from("supplier_orders")
      .select("total_amount")
      .eq("supplier_id", companyId)
      .in("status", ["completed", "delivered"])
      .gte("created_at", prevMonthStart)
      .lte("created_at", prevMonthEnd),

    // Pending orders
    supabase
      .from("supplier_orders")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", companyId)
      .in("status", ["paid", "pending_payment", "confirmed"]),

    // Orders this week
    supabase
      .from("supplier_orders")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", companyId)
      .gte("created_at", sevenDaysAgo),

    // Active products
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", companyId)
      .eq("is_active", true)
      .eq("moderation_status", "approved"),

    // Products pending review
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", companyId)
      .eq("moderation_status", "pending"),

    // Supplier profile (rating, response rate)
    supabase
      .from("supplier_profiles")
      .select("average_rating, response_rate, on_time_delivery_rate, total_orders, total_revenue, tier")
      .eq("company_id", companyId)
      .single(),

    // Recent orders (last 10)
    supabase
      .from("supplier_orders")
      .select(`
        id, order_number, subtotal, tax_amount, total_amount, currency,
        status, shipping_method, created_at,
        purchase_orders!supplier_orders_purchase_order_id_fkey (
          buyer_company_name, buyer_user_id,
          user_profiles!purchase_orders_buyer_user_id_fkey ( full_name, country_code )
        )
      `)
      .eq("supplier_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10),

    // Unread messages
    supabase
      .from("conversations")
      .select("supplier_unread_count")
      .eq("supplier_company_id", companyId),

    // Open RFQs that match supplier (public + open)
    supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .in("status", ["open", "quoted"]),

    // Top products by views/orders (from order items)
    supabase
      .from("supplier_order_items")
      .select("product_name, quantity, subtotal, supplier_order_id")
      .in(
        "supplier_order_id",
        (await supabase
          .from("supplier_orders")
          .select("id")
          .eq("supplier_id", companyId)
        ).data?.map((o) => o.id) || []
      )
      .limit(50),

    // Monthly revenue for last 6 months
    supabase
      .from("supplier_orders")
      .select("total_amount, created_at")
      .eq("supplier_id", companyId)
      .in("status", ["completed", "delivered", "paid", "confirmed", "shipped"])
      .gte("created_at", new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString())
      .order("created_at", { ascending: true }),
  ]);

  // ============================================================
  // Calculate KPIs
  // ============================================================
  const totalRevenue = (totalRevenueResult.data || []).reduce(
    (sum, o) => sum + (o.total_amount || 0), 0
  );
  const prevMonthRevenue = (prevMonthRevenueResult.data || []).reduce(
    (sum, o) => sum + (o.total_amount || 0), 0
  );
  const thisMonthRevenue = (totalRevenueResult.data || [])
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const revenueChange = prevMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
    : 0;

  const unreadTotal = (unreadMessagesResult.data || []).reduce(
    (sum, c) => sum + (c.supplier_unread_count || 0), 0
  );

  // Aggregate top products
  const productMap: Record<string, { name: string; orders: number; revenue: number }> = {};
  for (const item of topProductsResult.data || []) {
    if (!productMap[item.product_name]) {
      productMap[item.product_name] = { name: item.product_name, orders: 0, revenue: 0 };
    }
    productMap[item.product_name].orders += item.quantity;
    productMap[item.product_name].revenue += item.subtotal;
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Monthly revenue breakdown
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const monthTotal = (monthlyRevenueResult.data || [])
      .filter((o) => o.created_at.startsWith(monthKey))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    monthlyRevenue.push({ month: monthLabel, revenue: monthTotal });
  }

  const supplierProfile = supplierProfileResult.data;

  return NextResponse.json({
    company: {
      id: companyId,
      name: company?.name || "Your Company",
      countryCode: company?.country_code,
      verificationStatus: company?.verification_status,
      tier: supplierProfile?.tier || "free",
    },
    kpis: {
      totalRevenue,
      revenueChange,
      pendingOrders: pendingOrdersResult.count || 0,
      ordersThisWeek: thisWeekOrdersResult.count || 0,
      activeProducts: activeProductsResult.count || 0,
      pendingProducts: pendingProductsResult.count || 0,
      averageRating: supplierProfile?.average_rating || 0,
      responseRate: supplierProfile?.response_rate || 0,
      onTimeDeliveryRate: supplierProfile?.on_time_delivery_rate || 0,
      totalOrders: supplierProfile?.total_orders || 0,
      unreadMessages: unreadTotal,
      openRfqs: openRfqsResult.count || 0,
    },
    recentOrders: (recentOrdersResult.data || []).map((o) => {
      const po = o.purchase_orders as unknown as {
        buyer_company_name: string;
        user_profiles: { full_name: string; country_code: string } | null;
      } | null;
      return {
        id: o.id,
        orderNumber: o.order_number,
        buyerName: po?.buyer_company_name || po?.user_profiles?.full_name || "Unknown Buyer",
        buyerCountry: po?.user_profiles?.country_code || null,
        total: o.total_amount,
        currency: o.currency,
        status: o.status,
        createdAt: o.created_at,
      };
    }),
    topProducts,
    monthlyRevenue,
  });
}
