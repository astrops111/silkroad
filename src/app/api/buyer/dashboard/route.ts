import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/buyer/dashboard — Buyer dashboard stats + recent data
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, full_name, country_code")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies ( name )")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  const companyName = (membership?.companies as unknown as { name: string } | null)?.name;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalOrdersResult,
    activeRfqsResult,
    inTransitResult,
    totalSpendResult,
    recentOrdersResult,
    recentRfqsResult,
    unreadMessagesResult,
    unreadNotificationsResult,
    monthlySpendResult,
  ] = await Promise.all([
    // Total orders
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_user_id", profile.id),

    // Active RFQs
    supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .eq("buyer_user_id", profile.id)
      .in("status", ["open", "quoted"]),

    // In transit orders
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_user_id", profile.id)
      .in("status", ["shipped", "dispatched", "in_transit", "out_for_delivery"]),

    // Total spend
    supabase
      .from("purchase_orders")
      .select("grand_total")
      .eq("buyer_user_id", profile.id)
      .in("status", ["paid", "confirmed", "shipped", "delivered", "completed"]),

    // Recent 8 orders
    supabase
      .from("purchase_orders")
      .select(`
        id, order_number, grand_total, currency, status, created_at,
        buyer_company_name
      `)
      .eq("buyer_user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(8),

    // Recent RFQs
    supabase
      .from("rfqs")
      .select("id, rfq_number, title, status, quotation_count, deadline, created_at")
      .eq("buyer_user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),

    // Unread messages
    membership ? supabase
      .from("conversations")
      .select("buyer_unread_count")
      .eq("buyer_company_id", membership.company_id)
    : Promise.resolve({ data: [] }),

    // Unread notifications
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_read", false),

    // Monthly spend (last 6 months)
    supabase
      .from("purchase_orders")
      .select("grand_total, created_at")
      .eq("buyer_user_id", profile.id)
      .in("status", ["paid", "confirmed", "shipped", "delivered", "completed"])
      .gte("created_at", new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString())
      .order("created_at", { ascending: true }),
  ]);

  const totalSpend = (totalSpendResult.data || []).reduce(
    (sum, o) => sum + (o.grand_total || 0), 0
  );

  const unreadMessages = (unreadMessagesResult.data || []).reduce(
    (sum, c) => sum + ((c as { buyer_unread_count: number }).buyer_unread_count || 0), 0
  );

  // Monthly spend breakdown
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlySpend: { month: string; spend: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthTotal = (monthlySpendResult.data || [])
      .filter((o) => o.created_at.startsWith(monthKey))
      .reduce((sum, o) => sum + (o.grand_total || 0), 0);
    monthlySpend.push({ month: `${monthNames[d.getMonth()]}`, spend: monthTotal });
  }

  // Supplier count from recent orders
  let supplierOrdersData: { supplier_id: string }[] = [];
  const poIds = (recentOrdersResult.data || []).map((o) => o.id);
  if (poIds.length > 0) {
    const { data } = await supabase
      .from("supplier_orders")
      .select("supplier_id, purchase_order_id, order_number, status, total_amount, currency")
      .in("purchase_order_id", poIds);
    supplierOrdersData = data || [];
  }

  return NextResponse.json({
    buyer: {
      name: profile.full_name || companyName || "Buyer",
      companyName,
      countryCode: profile.country_code,
    },
    kpis: {
      totalOrders: totalOrdersResult.count || 0,
      activeRfqs: activeRfqsResult.count || 0,
      inTransit: inTransitResult.count || 0,
      totalSpend,
      unreadMessages,
      unreadNotifications: unreadNotificationsResult.count || 0,
    },
    recentOrders: (recentOrdersResult.data || []).map((o) => {
      const sos = supplierOrdersData.filter(
        (so) => (so as unknown as { purchase_order_id: string }).purchase_order_id === o.id
      );
      return {
        id: o.id,
        orderNumber: o.order_number,
        total: o.grand_total,
        currency: o.currency,
        status: o.status,
        supplierCount: new Set(sos.map((s) => s.supplier_id)).size,
        createdAt: o.created_at,
      };
    }),
    recentRfqs: recentRfqsResult.data || [],
    monthlySpend,
  });
}
