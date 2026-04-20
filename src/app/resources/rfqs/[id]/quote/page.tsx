import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCallerTierStatus } from "@/lib/auth/tier";
import { PaidGate } from "@/components/resources/paid-gate";
import { ResourceQuoteForm } from "@/components/resources/quote-form";

export default async function NewResourceQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("resources.quoteNew");

  const tier = await getCallerTierStatus();
  if (!tier.authenticated) {
    redirect(`/auth/login?redirect=/resources/rfqs/${id}/quote`);
  }

  const supabase = await createClient();

  const { data: rfq } = await supabase
    .from("rfqs")
    .select(
      `id, title, quantity_numeric, unit_of_measure, trade_term,
       port_of_loading, port_of_discharge, payment_instrument,
       status, buyer_company_id`
    )
    .eq("id", id)
    .maybeSingle();

  if (!rfq) notFound();
  if (!["open", "quoted"].includes(rfq.status)) {
    // RFQ not accepting quotes anymore
    redirect(`/resources/rfqs/${id}`);
  }

  const { data: memberRows } = await supabase
    .from("company_members")
    .select("companies:company_id(id, name, tier, tier_expires_at, type)")
    .limit(10);

  const now = new Date();
  const supplierCompanies = (memberRows ?? [])
    .map(
      (row) =>
        row.companies as unknown as {
          id: string;
          name: string;
          tier: string;
          tier_expires_at: string | null;
          type: string;
        } | null
    )
    .filter((c): c is NonNullable<typeof c> => !!c)
    .filter((c) => c.type === "supplier")
    .filter((c) => c.id !== rfq.buyer_company_id) // can't quote your own RFQ
    .map((c) => ({
      id: c.id,
      name: c.name,
      tier: c.tier,
      isPaid:
        ["standard", "gold"].includes(c.tier) &&
        (!c.tier_expires_at || new Date(c.tier_expires_at) > now),
    }));

  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-10 py-12">
      <h1 className="text-3xl font-semibold mb-2">{t("heading")}</h1>
      <p className="text-slate-400 mb-2">{t("sub")}</p>
      <p className="text-sm text-slate-500 mb-10">
        {t("forRfq")}: <span className="text-white">{rfq.title}</span>
      </p>

      <PaidGate action="send_quote">
        <ResourceQuoteForm
          rfqId={id}
          rfqDefaults={{
            quantity: rfq.quantity_numeric,
            unitOfMeasure: rfq.unit_of_measure,
            incoterm: rfq.trade_term,
            portOfLoading: rfq.port_of_loading,
            portOfDischarge: rfq.port_of_discharge,
            paymentInstrument: rfq.payment_instrument,
          }}
          supplierCompanies={supplierCompanies}
          labels={{
            supplier: t("supplier"),
            unitPrice: t("unitPrice"),
            quantity: t("quantity"),
            uom: t("uom"),
            incoterm: t("incoterm"),
            loadPort: t("loadPort"),
            dischargePort: t("dischargePort"),
            leadTime: t("leadTime"),
            validity: t("validity"),
            payment: t("payment"),
            inspection: t("inspection"),
            notes: t("notes"),
            submit: t("submit"),
            submitting: t("submitting"),
            total: t("total"),
            freeTierBlock: t("freeTierBlock"),
          }}
        />
      </PaidGate>
    </div>
  );
}
