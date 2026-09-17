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

  // Everything below depends only on company.id — run in parallel.
  const [{ data: profile }, { data: products }, { data: reviews }, { data: statsRows }] =
    await Promise.all([
      // Supplier profile
      supabase
        .from("supplier_profiles")
        .select("tier, response_rate, on_time_delivery_rate, average_rating, total_orders, total_revenue, certifications, factory_address, factory_city, factory_country")
        .eq("company_id", company.id)
        .single(),
      // Approved products (limit 12)
      supabase
        .from("products")
        .select("id, name, slug, base_price, currency, moq, is_featured, product_images (url, is_primary)")
        .eq("supplier_id", company.id)
        .eq("moderation_status", "approved")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(12),
      // Latest visible reviews
      supabase
        .from("reviews")
        .select("id, rating, title, content, created_at, communication_rating, product_quality_rating, shipping_rating, images, is_verified_purchase, user_profiles:reviewer_user_id (full_name), companies:reviewer_company_id (name)")
        .eq("supplier_company_id", company.id)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(10),
      // Review summary (aggregated in SQL instead of pulling every review row)
      supabase.rpc("supplier_review_stats", { p_company_id: company.id }),
    ]);

  const stats = statsRows?.[0];
  const num = (v: unknown) => (v == null ? 0 : Number(v));
  const distribution: Record<number, number> = {
    1: num(stats?.star_1),
    2: num(stats?.star_2),
    3: num(stats?.star_3),
    4: num(stats?.star_4),
    5: num(stats?.star_5),
  };
  const totalReviews = num(stats?.total_reviews);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const avgOrNull = (v: unknown) => (v == null ? null : round1(Number(v)));

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
      average: totalReviews > 0 ? round1(Number(stats?.avg_rating ?? 0)) : 0,
      total: totalReviews,
      distribution,
      qualityAverage: avgOrNull(stats?.avg_product_quality),
      communicationAverage: avgOrNull(stats?.avg_communication),
      shippingAverage: avgOrNull(stats?.avg_shipping),
    },
  };
}
