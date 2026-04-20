"use server";

import { createClient } from "@/lib/supabase/server";

export async function getBuyerOrders(
  companyId: string,
  options?: { status?: string; page?: number; limit?: number }
) {
  const supabase = await createClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("purchase_orders")
    .select("*", { count: "exact" })
    .eq("buyer_company_id", companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, count, error } = await query;

  return {
    orders: data ?? [],
    total: count ?? 0,
    error: error?.message,
  };
}

export async function getSupplierOrders(
  companyId: string,
  options?: { status?: string; page?: number; limit?: number }
) {
  const supabase = await createClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("supplier_orders")
    .select("*, supplier_order_items (*)", { count: "exact" })
    .eq("supplier_company_id", companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, count, error } = await query;

  return {
    orders: data ?? [],
    total: count ?? 0,
    error: error?.message,
  };
}

export async function getOrderDetail(orderId: string) {
  const supabase = await createClient();

  const { data: purchaseOrder, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) {
    return { order: null, supplierOrders: [], error: error.message };
  }

  const { data: supplierOrders } = await supabase
    .from("supplier_orders")
    .select("*, supplier_order_items (*)")
    .eq("purchase_order_id", orderId);

  return {
    order: purchaseOrder,
    supplierOrders: supplierOrders ?? [],
    error: null,
  };
}

export async function getOrderStatusHistory(supplierOrderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("supplier_order_id", supplierOrderId)
    .order("created_at", { ascending: true });
  return data ?? [];
}
