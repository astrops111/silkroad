import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  VerificationQueueClient,
  type KycCase,
  type KycCounts,
} from "./verification-client";

export const dynamic = "force-dynamic";

type PendingRow = {
  id: string;
  name: string;
  country_code: string | null;
  city: string | null;
  tax_id: string | null;
  tax_id_type: string | null;
  updated_at: string | null;
  created_at: string | null;
  supplier_profiles: { business_license_url: string | null }[] | {
    business_license_url: string | null;
  } | null;
};

function licenseUrl(row: PendingRow): string | null {
  const p = row.supplier_profiles;
  if (!p) return null;
  if (Array.isArray(p)) return p[0]?.business_license_url ?? null;
  return p.business_license_url ?? null;
}

async function countByStatus(status: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .eq("type", "supplier")
    .eq("verification_status", status);
  return count ?? 0;
}

export default async function AdminVerificationPage() {
  const supabase = await createClient();

  const [{ data: pendingData }, pending, verified, rejected, unverified] =
    await Promise.all([
      supabase
        .from("companies")
        .select(
          `
          id, name, country_code, city, tax_id, tax_id_type,
          updated_at, created_at,
          supplier_profiles ( business_license_url )
        `
        )
        .eq("type", "supplier")
        .eq("verification_status", "pending")
        .order("updated_at", { ascending: true })
        .limit(100),
      countByStatus("pending"),
      countByStatus("verified"),
      countByStatus("rejected"),
      countByStatus("unverified"),
    ]);

  const rows = (pendingData ?? []) as PendingRow[];

  // Owner contact per pending company (service client: company_members has
  // two FKs to user_profiles, disambiguate via !user_id).
  const contacts = new Map<string, { email: string | null; name: string | null }>();
  if (rows.length > 0) {
    const service = createServiceClient();
    const { data: owners } = await service
      .from("company_members")
      .select("company_id, user_profiles!user_id ( email, full_name )")
      .in("company_id", rows.map((r) => r.id))
      .eq("role", "supplier_owner");
    type OwnerRow = {
      company_id: string;
      user_profiles: { email: string | null; full_name: string | null }[] | null;
    };
    for (const o of (owners ?? []) as OwnerRow[]) {
      const profile = o.user_profiles?.[0];
      if (!contacts.has(o.company_id) && profile) {
        contacts.set(o.company_id, {
          email: profile.email,
          name: profile.full_name,
        });
      }
    }
  }

  const cases: KycCase[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    countryCode: r.country_code,
    city: r.city,
    taxId: r.tax_id,
    taxIdType: r.tax_id_type,
    submittedAt: r.updated_at ?? r.created_at,
    licenseUrl: licenseUrl(r),
    contactEmail: contacts.get(r.id)?.email ?? null,
    contactName: contacts.get(r.id)?.name ?? null,
  }));

  const counts: KycCounts = { pending, verified, rejected, unverified };

  return <VerificationQueueClient cases={cases} counts={counts} />;
}
