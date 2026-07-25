import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

const GMV_STATUSES = ["paid", "confirmed", "in_production", "ready_to_ship", "assigned_to_logistics", "dispatched", "in_transit", "out_for_delivery", "delivered", "completed"];
const ACTIVE_SHIPMENT_STATUSES = ["pending", "assigned", "driver_accepted", "picking", "packed", "dispatched", "in_transit", "at_hub", "out_for_delivery", "delivery_attempted"];

function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

/**
 * GET /api/admin/dashboard — Platform-level KPIs, 12-month trend, quick-link counts
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  const since12mo = twelveMonthsAgo.toISOString();

  const [
    ordersRes,
    activeSuppliersRes,
    activeBuyersRes,
    pendingApplicationsRes,
    settlementsRes,
    failedPaymentsRes,
    activeShipmentsRes,
    openDisputesRes,
    recentOrdersRes,
    recentDisputesRes,
    recentApplicationsRes,
  ] = await Promise.all([
    supabase.from("purchase_orders").select("grand_total, created_at").in("status", GMV_STATUSES).gte("created_at", since12mo),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("type", "supplier").eq("is_active", true),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("type", "buyer_org").eq("is_active", true),
    supabase.from("supplier_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("settlements").select("gross_sales, total_commission, net_payout, created_at").gte("created_at", since12mo),
    supabase.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("b2b_shipments").select("id", { count: "exact", head: true }).in("status", ACTIVE_SHIPMENT_STATUSES),
    supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review", "awaiting_evidence", "escalated"]),
    supabase.from("purchase_orders").select("order_number, grand_total, currency, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("disputes").select("title, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("supplier_applications").select("company_name, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const recentActivity = [
    ...(recentOrdersRes.data || []).map((o) => ({
      type: "order" as const,
      text: `Order ${o.order_number} — ${o.status}`,
      detail: `${o.currency} ${(o.grand_total / 100).toLocaleString()}`,
      at: o.created_at,
    })),
    ...(recentDisputesRes.data || []).map((d) => ({
      type: "dispute" as const,
      text: "Dispute raised",
      detail: d.title,
      at: d.created_at ?? "",
    })),
    ...(recentApplicationsRes.data || []).map((a) => ({
      type: "application" as const,
      text: "Supplier application received",
      detail: a.company_name,
      at: a.created_at,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  // ── Monthly GMV / commission / payout trend ──
  const gmvByMonth = new Map<string, number>();
  for (const o of ordersRes.data || []) {
    const key = monthKey(o.created_at);
    gmvByMonth.set(key, (gmvByMonth.get(key) || 0) + (o.grand_total || 0));
  }
  const commissionByMonth = new Map<string, number>();
  const payoutByMonth = new Map<string, number>();
  for (const s of settlementsRes.data || []) {
    if (!s.created_at) continue;
    const key = monthKey(s.created_at);
    commissionByMonth.set(key, (commissionByMonth.get(key) || 0) + (s.total_commission || 0));
    payoutByMonth.set(key, (payoutByMonth.get(key) || 0) + (s.net_payout || 0));
  }

  const months: string[] = [];
  const cursor = new Date(twelveMonthsAgo);
  for (let i = 0; i < 12; i++) {
    months.push(monthKey(cursor.toISOString()));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const trend = months.map((m) => ({
    month: m,
    gmv: gmvByMonth.get(m) || 0,
    commission: commissionByMonth.get(m) || 0,
    payouts: payoutByMonth.get(m) || 0,
  }));

  const totalGmv12mo = trend.reduce((sum, t) => sum + t.gmv, 0);

  return NextResponse.json({
    kpis: {
      gmv12mo: totalGmv12mo,
      activeSuppliers: activeSuppliersRes.count || 0,
      activeBuyers: activeBuyersRes.count || 0,
      pendingApprovals: pendingApplicationsRes.count || 0,
    },
    trend,
    quickLinks: {
      pendingKyc: pendingApplicationsRes.count || 0,
      failedPayments7d: failedPaymentsRes.count || 0,
      activeShipments: activeShipmentsRes.count || 0,
      openDisputes: openDisputesRes.count || 0,
    },
    recentActivity,
  });
}
