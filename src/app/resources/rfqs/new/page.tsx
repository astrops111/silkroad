import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCallerTierStatus } from "@/lib/auth/tier";
import { listResourceCategories } from "@/lib/queries/resources";
import { PaidGate } from "@/components/resources/paid-gate";
import { ResourceRfqForm } from "@/components/resources/rfq-form";

type SearchParams = Promise<{ commodity?: string }>;

export default async function NewResourceRfqPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const t = await getTranslations("resources.rfqNew");

  const tier = await getCallerTierStatus();
  if (!tier.authenticated) {
    redirect(`/auth/login?redirect=/resources/rfqs/new${params.commodity ? `?commodity=${params.commodity}` : ""}`);
  }

  const supabase = await createClient();

  // Resolve buyer companies the caller belongs to, with tier info
  const { data: memberRows } = await supabase
    .from("company_members")
    .select("companies:company_id(id, name, tier, tier_expires_at, type)")
    .limit(10);

  const now = new Date();
  const buyerCompanies = (memberRows ?? [])
    .map((row) => row.companies as unknown as {
      id: string;
      name: string;
      tier: string;
      tier_expires_at: string | null;
      type: string;
    } | null)
    .filter((c): c is NonNullable<typeof c> => !!c)
    .filter((c) => c.type === "buyer_org" || c.type === "supplier")
    .map((c) => ({
      id: c.id,
      name: c.name,
      tier: c.tier,
      isPaid:
        ["standard", "gold"].includes(c.tier) &&
        (!c.tier_expires_at || new Date(c.tier_expires_at) > now),
    }));

  const cats = await listResourceCategories();
  const categories = cats
    .filter((c) => c.parent_id !== null) // leaves only
    .map((c) => ({ id: c.id, name: c.name_en, uom: c.unit_of_measure }));

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-12">
      <h1 className="text-3xl font-semibold mb-2">{t("heading")}</h1>
      <p className="text-slate-400 mb-10">{t("sub")}</p>

      <PaidGate action="request_quote">
        <ResourceRfqForm
          buyerCompanies={buyerCompanies}
          categories={categories}
          prefillCommodityId={params.commodity}
          labels={{
            title: t("title"),
            description: t("description"),
            category: t("category"),
            quantity: t("quantity"),
            uom: t("uom"),
            targetPrice: t("targetPrice"),
            incoterm: t("incoterm"),
            loadPort: t("loadPort"),
            dischargePort: t("dischargePort"),
            windowStart: t("windowStart"),
            windowEnd: t("windowEnd"),
            payment: t("payment"),
            buyer: t("buyer"),
            submit: t("submit"),
            submitting: t("submitting"),
            success: t("success"),
          }}
        />
      </PaidGate>
    </div>
  );
}
