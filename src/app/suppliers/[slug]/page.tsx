import { getStorefrontBySlug } from "@/lib/queries/storefront";
import { StorefrontClient } from "./storefront-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SupplierStorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  let supplierData = null;

  try {
    const data = await getStorefrontBySlug(slug);
    if (data) {
      supplierData = {
        name: data.company.name,
        nameLocal: data.company.name_local ?? undefined,
        slug: data.company.slug,
        logoUrl: data.company.logo_url ?? undefined,
        website: data.company.website ?? undefined,
        city: data.company.city ?? undefined,
        province: data.company.state_province ?? undefined,
        country: data.company.country_code,
        description: data.company.description ?? undefined,
        verified: data.company.verification_status === "verified",
        tier: data.profile?.tier ?? "free",
        rating: data.reviewSummary.average,
        totalReviews: data.reviewSummary.total,
        totalOrders: data.profile?.total_orders ?? 0,
        responseRate: data.profile?.response_rate ?? 0,
        onTimeDelivery: data.profile?.on_time_delivery_rate ?? 0,
        certifications: data.profile?.certifications ?? [],
        established: data.company.established_year ?? undefined,
        employees: data.company.employee_count_range ?? undefined,
        qualityScore: data.reviewSummary.qualityAverage ?? undefined,
        communicationScore: data.reviewSummary.communicationAverage ?? undefined,
        shippingScore: data.reviewSummary.shippingAverage ?? undefined,
        products: data.products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.base_price / 100,
          currency: p.currency,
          moq: p.moq,
          isFeatured: p.is_featured,
          image:
            p.product_images.find((img) => img.is_primary)?.url ??
            p.product_images[0]?.url ??
            null,
        })),
        reviews: data.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          content: r.content,
          reviewerName: r.reviewer_name,
          reviewerCompany: r.reviewer_company,
          createdAt: r.created_at,
          communicationRating: r.communicationRating,
          productQualityRating: r.productQualityRating,
          shippingRating: r.shippingRating,
          images: r.images,
          isVerifiedPurchase: r.isVerifiedPurchase,
        })),
      };
    }
  } catch {
    // DB not connected — fall back to mock data in client
  }

  return <StorefrontClient supplierData={supplierData} />;
}
