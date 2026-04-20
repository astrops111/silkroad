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
        city: data.company.city ?? undefined,
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
      };
    }
  } catch {
    // DB not connected — fall back to mock data in client
  }

  return <StorefrontClient supplierData={supplierData} />;
}
