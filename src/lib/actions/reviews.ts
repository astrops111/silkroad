"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

type ActionResult = {
  success: boolean;
  error?: string;
};

export async function submitReview(
  supplierOrderId: string,
  reviewerUserId: string,
  reviewerCompanyId: string,
  supplierCompanyId: string,
  data: {
    rating: number;
    title?: string;
    content?: string;
    productQualityRating?: number;
    communicationRating?: number;
    shippingRating?: number;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  // Verify the order is delivered
  const { data: order } = await supabase
    .from("supplier_orders")
    .select("status")
    .eq("id", supplierOrderId)
    .single();

  if (!order || !["delivered", "completed"].includes(order.status)) {
    return { success: false, error: "Can only review delivered orders" };
  }

  const { error } = await supabase.from("reviews").insert({
    supplier_order_id: supplierOrderId,
    reviewer_user_id: reviewerUserId,
    reviewer_company_id: reviewerCompanyId,
    supplier_company_id: supplierCompanyId,
    rating: data.rating,
    title: data.title ?? null,
    content: data.content ?? null,
    product_quality_rating: data.productQualityRating ?? null,
    communication_rating: data.communicationRating ?? null,
    shipping_rating: data.shippingRating ?? null,
    is_verified_purchase: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "You have already reviewed this order" };
    }
    return { success: false, error: error.message };
  }

  // Update supplier average rating
  const serviceClient = createServiceClient();
  const { data: stats } = await serviceClient
    .from("reviews")
    .select("rating")
    .eq("supplier_company_id", supplierCompanyId)
    .eq("is_visible", true);

  if (stats && stats.length > 0) {
    const avgRating = stats.reduce((sum, r) => sum + r.rating, 0) / stats.length;
    await serviceClient
      .from("supplier_profiles")
      .update({ average_rating: Math.round(avgRating * 100) / 100 })
      .eq("company_id", supplierCompanyId);
  }

  return { success: true };
}

export async function getSupplierReviews(
  supplierCompanyId: string,
  page = 1,
  limit = 10
) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from("reviews")
    .select("*, user_profiles:reviewer_user_id (full_name, avatar_url), companies:reviewer_company_id (name, country_code)", { count: "exact" })
    .eq("supplier_company_id", supplierCompanyId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { reviews: data ?? [], total: count ?? 0 };
}

export async function getSupplierRatingSummary(supplierCompanyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("rating")
    .eq("supplier_company_id", supplierCompanyId)
    .eq("is_visible", true);

  if (!data || data.length === 0) {
    return { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of data) {
    sum += r.rating;
    distribution[r.rating as keyof typeof distribution]++;
  }

  return {
    average: Math.round((sum / data.length) * 10) / 10,
    total: data.length,
    distribution,
  };
}
