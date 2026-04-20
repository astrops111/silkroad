"use server";

import { createClient } from "@/lib/supabase/server";

export interface KpiData {
  totalOrders: number;
  totalSpend: number;
  avgOrderValue: number;
  activeRfqs: number;
}

export interface SpendByCategory {
  category: string;
  amount: number;
  orderCount: number;
}

export interface MonthlyTrend {
  month: string;
  amount: number;
  count: number;
}

export interface TopSupplier {
  supplierId: string;
  supplierName: string;
  totalSpend: number;
  orderCount: number;
}

// ── Buyer Analytics ──

export async function getBuyerKpis(companyId: string): Promise<KpiData> {
  const supabase = await createClient();

  const { count: totalOrders } = await supabase
    .from("purchase_orders")
    .select("*", { count: "exact", head: true })
    .eq("buyer_company_id", companyId);

  const { data: spendData } = await supabase
    .from("purchase_orders")
    .select("total_amount")
    .eq("buyer_company_id", companyId)
    .in("status", ["paid", "confirmed", "in_production", "ready_to_ship", "dispatched", "in_transit", "delivered", "completed"]);

  const totalSpend = spendData?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;
  const avgOrderValue = (totalOrders ?? 0) > 0 ? Math.round(totalSpend / (totalOrders ?? 1)) : 0;

  const { count: activeRfqs } = await supabase
    .from("rfqs")
    .select("*", { count: "exact", head: true })
    .eq("buyer_company_id", companyId)
    .in("status", ["open", "quoted"]);

  return {
    totalOrders: totalOrders ?? 0,
    totalSpend,
    avgOrderValue,
    activeRfqs: activeRfqs ?? 0,
  };
}

export async function getBuyerMonthlySpend(companyId: string, months = 12): Promise<MonthlyTrend[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("total_amount, created_at")
    .eq("buyer_company_id", companyId)
    .gte("created_at", since.toISOString())
    .in("status", ["paid", "confirmed", "in_production", "ready_to_ship", "dispatched", "in_transit", "delivered", "completed"]);

  const monthMap = new Map<string, { amount: number; count: number }>();
  for (const order of orders ?? []) {
    const month = order.created_at.slice(0, 7); // YYYY-MM
    const existing = monthMap.get(month) ?? { amount: 0, count: 0 };
    existing.amount += order.total_amount ?? 0;
    existing.count += 1;
    monthMap.set(month, existing);
  }

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getBuyerTopSuppliers(companyId: string, limit = 5): Promise<TopSupplier[]> {
  const supabase = await createClient();

  const { data: supplierOrders } = await supabase
    .from("supplier_orders")
    .select("supplier_company_id, total_amount, purchase_orders!inner(buyer_company_id)")
    .eq("purchase_orders.buyer_company_id", companyId)
    .in("status", ["paid", "confirmed", "in_production", "delivered", "completed"]);

  const supplierMap = new Map<string, { total: number; count: number }>();
  for (const so of supplierOrders ?? []) {
    const id = so.supplier_company_id;
    const existing = supplierMap.get(id) ?? { total: 0, count: 0 };
    existing.total += so.total_amount ?? 0;
    existing.count += 1;
    supplierMap.set(id, existing);
  }

  const topIds = Array.from(supplierMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit);

  // Fetch supplier names
  const results: TopSupplier[] = [];
  for (const [id, data] of topIds) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", id)
      .single();

    results.push({
      supplierId: id,
      supplierName: company?.name ?? "Unknown",
      totalSpend: data.total,
      orderCount: data.count,
    });
  }

  return results;
}

// ── Supplier Analytics ──

export async function getSupplierKpis(companyId: string) {
  const supabase = await createClient();

  const { count: totalOrders } = await supabase
    .from("supplier_orders")
    .select("*", { count: "exact", head: true })
    .eq("supplier_company_id", companyId);

  const { data: revenueData } = await supabase
    .from("supplier_orders")
    .select("total_amount")
    .eq("supplier_company_id", companyId)
    .in("status", ["paid", "confirmed", "in_production", "delivered", "completed"]);

  const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;

  const { count: activeProducts } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", companyId)
    .eq("is_active", true)
    .eq("moderation_status", "approved");

  const { data: profileData } = await supabase
    .from("supplier_profiles")
    .select("average_rating, response_rate, on_time_delivery_rate")
    .eq("company_id", companyId)
    .single();

  return {
    totalOrders: totalOrders ?? 0,
    totalRevenue,
    activeProducts: activeProducts ?? 0,
    averageRating: profileData?.average_rating ?? 0,
    responseRate: profileData?.response_rate ?? 0,
    onTimeDeliveryRate: profileData?.on_time_delivery_rate ?? 0,
  };
}

export async function getSupplierMonthlyRevenue(companyId: string, months = 12): Promise<MonthlyTrend[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data: orders } = await supabase
    .from("supplier_orders")
    .select("total_amount, created_at")
    .eq("supplier_company_id", companyId)
    .gte("created_at", since.toISOString())
    .in("status", ["paid", "confirmed", "in_production", "delivered", "completed"]);

  const monthMap = new Map<string, { amount: number; count: number }>();
  for (const order of orders ?? []) {
    const month = order.created_at.slice(0, 7);
    const existing = monthMap.get(month) ?? { amount: 0, count: 0 };
    existing.amount += order.total_amount ?? 0;
    existing.count += 1;
    monthMap.set(month, existing);
  }

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getSupplierTopProducts(companyId: string, limit = 5) {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("supplier_order_items")
    .select("product_id, product_name, quantity, total_price, supplier_orders!inner(supplier_company_id)")
    .eq("supplier_orders.supplier_company_id", companyId);

  const productMap = new Map<string, { name: string; revenue: number; units: number }>();
  for (const item of items ?? []) {
    const id = item.product_id;
    const existing = productMap.get(id) ?? { name: item.product_name, revenue: 0, units: 0 };
    existing.revenue += item.total_price ?? 0;
    existing.units += item.quantity ?? 0;
    productMap.set(id, existing);
  }

  return Array.from(productMap.entries())
    .map(([id, data]) => ({ productId: id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
