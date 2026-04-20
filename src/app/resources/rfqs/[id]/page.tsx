import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCallerTierStatus } from "@/lib/auth/tier";
import { PaidGate } from "@/components/resources/paid-gate";
import { AcceptQuoteButton } from "@/components/resources/accept-quote-button";

interface RfqDetail {
  id: string;
  rfq_number: string;
  title: string;
  description: string | null;
  status: string;
  quantity_numeric: number | null;
  unit_of_measure: string | null;
  trade_term: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  shipment_window_start: string | null;
  shipment_window_end: string | null;
  payment_instrument: string | null;
  target_price: number | null;
  target_currency: string;
  buyer_company_id: string | null;
  buyer_company_name: string | null;
  buyer_country: string | null;
  awarded_quotation_id: string | null;
  created_at: string;
  quotation_count: number | null;
  resource_categories: { slug: string; name_en: string } | null;
  quotations: Array<{
    id: string;
    quotation_number: string;
    supplier_name: string | null;
    unit_price_usd: number | null;
    quantity_numeric: number | null;
    unit_of_measure: string | null;
    trade_term: string | null;
    lead_time_days: number | null;
    status: string;
    submitted_at: string | null;
  }>;
}

export default async function ResourceRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("resources.rfqDetail");
  const supabase = await createClient();

  const { data } = await supabase
    .from("rfqs")
    .select(
      `
      id, rfq_number, title, description, status,
      quantity_numeric, unit_of_measure, trade_term,
      port_of_loading, port_of_discharge,
      shipment_window_start, shipment_window_end,
      payment_instrument, target_price, target_currency,
      buyer_company_id, buyer_company_name, buyer_country,
      awarded_quotation_id, created_at, quotation_count,
      resource_categories:resource_category_id (slug, name_en),
      quotations (
        id, quotation_number, supplier_name, unit_price_usd,
        quantity_numeric, unit_of_measure, trade_term,
        lead_time_days, status, submitted_at
      )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const rfq = data as unknown as RfqDetail;

  const tier = await getCallerTierStatus();
  const isBuyerPaid =
    rfq.buyer_company_id != null &&
    tier.paidCompanyIds.includes(rfq.buyer_company_id);
  const rfqOpenForAward = ["open", "quoted"].includes(rfq.status);

  return (
    <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12">
      <nav className="text-xs text-slate-400 mb-6">
        <Link href="/resources/rfqs" className="hover:text-white">
          {t("breadcrumb")}
        </Link>
        <span className="mx-2">/</span>
        <span>{rfq.rfq_number}</span>
      </nav>

      <h1 className="text-3xl font-semibold mb-2">{rfq.title}</h1>
      <div className="text-xs text-slate-400 flex items-center gap-3 mb-8">
        <span>{rfq.rfq_number}</span>
        <span>·</span>
        <span className="px-2 py-0.5 rounded-full bg-white/5">{rfq.status}</span>
        {rfq.resource_categories && (
          <>
            <span>·</span>
            <span>{rfq.resource_categories.name_en}</span>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 border border-white/10 rounded-xl p-6 mb-10">
        <Stat label={t("quantity")} value={
          rfq.quantity_numeric != null
            ? `${rfq.quantity_numeric.toLocaleString()} ${rfq.unit_of_measure ?? ""}`
            : "—"
        } />
        <Stat label={t("incoterm")} value={rfq.trade_term?.toUpperCase() ?? "—"} />
        <Stat label={t("loadPort")} value={rfq.port_of_loading ?? "—"} />
        <Stat label={t("dischargePort")} value={rfq.port_of_discharge ?? "—"} />
        <Stat
          label={t("window")}
          value={
            rfq.shipment_window_start
              ? `${rfq.shipment_window_start} → ${rfq.shipment_window_end ?? "—"}`
              : "—"
          }
        />
        <Stat
          label={t("payment")}
          value={rfq.payment_instrument?.replace(/_/g, " ").toUpperCase() ?? "—"}
        />
        <Stat
          label={t("target")}
          value={
            rfq.target_price != null
              ? `$${(rfq.target_price / 100).toLocaleString()}/unit`
              : "—"
          }
        />
        <Stat
          label={t("buyer")}
          value={`${rfq.buyer_company_name ?? "—"} (${rfq.buyer_country ?? ""})`}
        />
      </div>

      {rfq.description && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-2">{t("description")}</h2>
          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
            {rfq.description}
          </p>
        </section>
      )}

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {t("quotations")} ({rfq.quotations?.length ?? 0})
          </h2>
        </div>

        {rfq.quotations && rfq.quotations.length > 0 ? (
          <ul className="divide-y divide-white/10 border border-white/10 rounded-xl">
            {rfq.quotations.map((q) => {
              const canAccept =
                isBuyerPaid &&
                rfqOpenForAward &&
                ["submitted", "revised"].includes(q.status);
              return (
                <li key={q.id} className="px-5 py-4 grid grid-cols-12 gap-4 text-sm items-center">
                  <div className="col-span-3">
                    <div className="font-medium">{q.supplier_name ?? "—"}</div>
                    <div className="text-xs text-slate-400">{q.quotation_number}</div>
                  </div>
                  <div className="col-span-2">
                    {q.unit_price_usd != null
                      ? `$${q.unit_price_usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}/${q.unit_of_measure ?? "unit"}`
                      : "—"}
                  </div>
                  <div className="col-span-2">
                    {q.trade_term?.toUpperCase() ?? "—"}
                  </div>
                  <div className="col-span-2">
                    {q.lead_time_days ? `${q.lead_time_days} ${t("days")}` : "—"}
                  </div>
                  <div className="col-span-1 text-right text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-white/5">
                      {q.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    {canAccept ? (
                      <AcceptQuoteButton
                        quotationId={q.id}
                        label={t("ctaAccept")}
                        pendingLabel={t("ctaAccepting")}
                      />
                    ) : q.status === "accepted" ? (
                      <span className="text-xs text-emerald-300">
                        {t("acceptedBadge")}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-400 border border-dashed border-white/15 rounded-xl p-6">
            {t("noQuotes")}
          </p>
        )}

        <div className="mt-6">
          <PaidGate action="send_quote">
            <Link
              href={`/resources/rfqs/${rfq.id}/quote`}
              className="inline-flex items-center px-5 py-2.5 rounded-md bg-[var(--amber)] text-black font-medium hover:opacity-90"
            >
              {t("ctaQuote")}
            </Link>
          </PaidGate>
        </div>
      </section>

      <LcStatusBlock rfqId={rfq.id} />
    </div>
  );
}

async function LcStatusBlock({ rfqId }: { rfqId: string }) {
  const t = await getTranslations("resources.lc");
  const supabase = await createClient();

  const { data: lcRows } = await supabase
    .from("letters_of_credit")
    .select(
      "id, lc_reference, bank_lc_number, amount_usd, currency, lc_type, status, issue_date, expiry_date, latest_shipment_date"
    )
    .eq("rfq_id", rfqId)
    .order("created_at", { ascending: false })
    .limit(5);

  const lcs = lcRows ?? [];

  const STAGES: Array<{ key: string; statuses: string[] }> = [
    { key: "draft", statuses: ["draft", "applied"] },
    { key: "issued", statuses: ["issued", "advised", "confirmed"] },
    { key: "docs", statuses: ["docs_presented", "discrepancies", "accepted"] },
    { key: "settled", statuses: ["settled"] },
  ];

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("heading")}</h2>
      </div>

      {lcs.length === 0 ? (
        <p className="text-sm text-slate-400 border border-dashed border-white/15 rounded-xl p-6">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-4">
          {lcs.map((lc) => {
            const currentStageIdx = STAGES.findIndex((s) =>
              s.statuses.includes(lc.status as string)
            );
            return (
              <li
                key={lc.id}
                className="border border-white/10 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-medium">
                      {lc.bank_lc_number ?? lc.lc_reference}
                    </div>
                    <div className="text-xs text-slate-400">
                      {lc.lc_type.replace("_", " ").toUpperCase()} ·{" "}
                      {lc.currency} {Number(lc.amount_usd).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/5">
                    {lc.status}
                  </span>
                </div>
                <ol className="grid grid-cols-4 gap-2">
                  {STAGES.map((s, i) => {
                    const active = i <= currentStageIdx;
                    return (
                      <li
                        key={s.key}
                        className={`relative text-xs rounded-md px-3 py-2 border ${
                          active
                            ? "border-[var(--amber)]/50 bg-[var(--amber)]/10 text-white"
                            : "border-white/10 text-slate-400"
                        }`}
                      >
                        {t(`stage.${s.key}` as never)}
                      </li>
                    );
                  })}
                </ol>
                {(lc.issue_date ||
                  lc.expiry_date ||
                  lc.latest_shipment_date) && (
                  <dl className="mt-4 grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <dt className="text-slate-400">{t("issueDate")}</dt>
                      <dd>{lc.issue_date ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">{t("expiry")}</dt>
                      <dd>{lc.expiry_date ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">{t("latestShip")}</dt>
                      <dd>{lc.latest_shipment_date ?? "—"}</dd>
                    </div>
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm mt-1">{value}</div>
    </div>
  );
}
