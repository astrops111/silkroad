import { createServiceClient } from "@/lib/supabase/server";
import {
  ResourcesModerationClient,
  type ModerationListing,
  type ModerationCounts,
} from "./resources-moderation-client";

export const dynamic = "force-dynamic";

type ListingRow = {
  id: string;
  name_en: string;
  tenant_id: string | null;
  origin_country: string | null;
  origin_region: string | null;
  grade: string | null;
  unit_of_measure: string | null;
  price_per_unit_usd: number | null;
  currency: string | null;
  available_quantity: number | null;
  incoterm: string | null;
  images: unknown[] | null;
  created_at: string | null;
  kimberley_cert_ref: string | null;
  oecd_3tg_due_diligence_ref: string | null;
  cites_permit_ref: string | null;
  gacc_registration_ref: string | null;
  mine_license_ref: string | null;
  export_permit_ref: string | null;
};

export default async function AdminResourcesPage() {
  // Service client: the admin layout already gates access to this route, and
  // pending commodities are not publicly readable under RLS.
  const service = createServiceClient();

  const countBy = async (status: string) => {
    const { count } = await service
      .from("commodities")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    return count ?? 0;
  };

  const [{ data: pendingData }, pending, approved, rejected, suspended] =
    await Promise.all([
      service
        .from("commodities")
        .select(
          `
          id, name_en, tenant_id, origin_country, origin_region, grade,
          unit_of_measure, price_per_unit_usd, currency, available_quantity,
          incoterm, images, created_at,
          kimberley_cert_ref, oecd_3tg_due_diligence_ref, cites_permit_ref,
          gacc_registration_ref, mine_license_ref, export_permit_ref
        `
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(100),
      countBy("pending"),
      countBy("approved"),
      countBy("rejected"),
      countBy("suspended"),
    ]);

  const rows = (pendingData ?? []) as ListingRow[];

  const suppliers = new Map<string, { name: string; verification: string | null }>();
  const tenantIds = Array.from(
    new Set(rows.map((r) => r.tenant_id).filter((v): v is string => !!v))
  );
  if (tenantIds.length > 0) {
    const { data: companies } = await service
      .from("companies")
      .select("id, name, verification_status")
      .in("id", tenantIds);
    for (const c of companies ?? []) {
      suppliers.set(c.id, { name: c.name, verification: c.verification_status });
    }
  }

  const listings: ModerationListing[] = rows.map((r) => ({
    id: r.id,
    name: r.name_en,
    supplierName: r.tenant_id ? suppliers.get(r.tenant_id)?.name ?? null : null,
    supplierVerification: r.tenant_id
      ? suppliers.get(r.tenant_id)?.verification ?? null
      : null,
    originCountry: r.origin_country,
    originRegion: r.origin_region,
    grade: r.grade,
    unitOfMeasure: r.unit_of_measure,
    pricePerUnitUsd: r.price_per_unit_usd,
    currency: r.currency,
    availableQuantity: r.available_quantity,
    incoterm: r.incoterm,
    imageCount: Array.isArray(r.images) ? r.images.length : 0,
    createdAt: r.created_at,
    complianceRefs: [
      { label: "Kimberley cert", value: r.kimberley_cert_ref },
      { label: "OECD 3TG", value: r.oecd_3tg_due_diligence_ref },
      { label: "CITES permit", value: r.cites_permit_ref },
      { label: "GACC reg", value: r.gacc_registration_ref },
      { label: "Mine license", value: r.mine_license_ref },
      { label: "Export permit", value: r.export_permit_ref },
    ],
  }));

  const counts: ModerationCounts = { pending, approved, rejected, suspended };

  return <ResourcesModerationClient listings={listings} counts={counts} />;
}
