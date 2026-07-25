"use server";

import { createClient } from "@/lib/supabase/server";

export interface StorefrontData {
  company: {
    id: string;
    name: string;
    name_local: string | null;
    slug: string;
    logo_url: string | null;
    country_code: string;
    city: string | null;
    state_province: string | null;
    description: string | null;
    website: string | null;
    established_year: number | null;
    employee_count_range: string | null;
    industry: string | null;
    verification_status: string;
  };
  profile: {
    tier: string;
    response_rate: number | null;
    on_time_delivery_rate: number | null;
    average_rating: number | null;
    total_orders: number;
    total_revenue: number;
    certifications: string[];
    factory_address: string | null;
    factory_city: string | null;
    factory_country: string;
  } | null;
  products: {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    currency: string;
    moq: number;
    is_featured: boolean;
    product_images: { url: string; is_primary: boolean }[];
  }[];
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    content: string | null;
    reviewer_name: string | null;
    reviewer_company: string | null;
    created_at: string;
    communicationRating: number | null;
    productQualityRating: number | null;
    shippingRating: number | null;
    images: string[];
    isVerifiedPurchase: boolean;
  }[];
  reviewSummary: {
    average: number;
    total: number;
    distribution: Record<number, number>;
    qualityAverage: number | null;
    communicationAverage: number | null;
    shippingAverage: number | null;
  };
}

export async function getStorefrontBySlug(slug: string): Promise<StorefrontData | null> {
  const supabase = await createClient();

  // Fetch company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, name_local, slug, logo_url, country_code, city, state_province, description, website, established_year, employee_count_range, industry, verification_status")
    .eq("slug", slug)
    .eq("type", "supplier")
    .eq("is_active", true)
    .single();

  if (!company) return null;

  // Fetch supplier profile
  const { data: profile } = await supabase
    .from("supplier_profiles")
    .select("tier, response_rate, on_time_delivery_rate, average_rating, total_orders, total_revenue, certifications, factory_address, factory_city, factory_country")
    .eq("company_id", company.id)
    .single();

  // Fetch approved products (limit 12)
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, base_price, currency, moq, is_featured, product_images (url, is_primary)")
    .eq("supplier_id", company.id)
    .eq("moderation_status", "approved")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(12);

  // Fetch reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, title, content, created_at, communication_rating, product_quality_rating, shipping_rating, images, is_verified_purchase, user_profiles:reviewer_user_id (full_name), companies:reviewer_company_id (name)")
    .eq("supplier_company_id", company.id)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(10);

  // Calculate review summary
  const { data: allRatings } = await supabase
    .from("reviews")
    .select("rating, communication_rating, product_quality_rating, shipping_rating")
    .eq("supplier_company_id", company.id)
    .eq("is_visible", true);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  let qualitySum = 0, qualityCount = 0;
  let communicationSum = 0, communicationCount = 0;
  let shippingSum = 0, shippingCount = 0;
  for (const r of allRatings ?? []) {
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
    ratingSum += r.rating;
    if (r.product_quality_rating != null) { qualitySum += r.product_quality_rating; qualityCount++; }
    if (r.communication_rating != null) { communicationSum += r.communication_rating; communicationCount++; }
    if (r.shipping_rating != null) { shippingSum += r.shipping_rating; shippingCount++; }
  }
  const totalReviews = allRatings?.length ?? 0;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    company,
    profile,
    products: (products ?? []).map((p) => ({
      ...p,
      product_images: (p.product_images ?? []) as { url: string; is_primary: boolean }[],
    })),
    reviews: (reviews ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      reviewer_name: (r.user_profiles as unknown as { full_name: string } | null)?.full_name ?? null,
      reviewer_company: (r.companies as unknown as { name: string } | null)?.name ?? null,
      created_at: r.created_at ?? new Date().toISOString(),
      communicationRating: r.communication_rating,
      productQualityRating: r.product_quality_rating,
      shippingRating: r.shipping_rating,
      images: r.images ?? [],
      isVerifiedPurchase: r.is_verified_purchase ?? false,
    })),
    reviewSummary: {
      average: totalReviews > 0 ? round1(ratingSum / totalReviews) : 0,
      total: totalReviews,
      distribution,
      qualityAverage: qualityCount > 0 ? round1(qualitySum / qualityCount) : null,
      communicationAverage: communicationCount > 0 ? round1(communicationSum / communicationCount) : null,
      shippingAverage: shippingCount > 0 ? round1(shippingSum / shippingCount) : null,
    },
  };
}
