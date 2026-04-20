import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCallerTierStatus } from "@/lib/auth/tier";
import { LcTransitionButtons } from "@/components/resources/lc-transition-buttons";

type LcStatus =
  | "draft"
  | "applied"
  | "issued"
  | "advised"
  | "confirmed"
  | "docs_presented"
  | "discrepancies"
  | "accepted"
  | "settled"
  | "expired"
  | "cancelled";

interface LcRow {
  id: string;
  lc_reference: string;
  bank_lc_number: string | null;
  rfq_id: string | null;
  quotation_id: string | null;
  applicant_company_id: string;
  beneficiary_company_id: string;
  issuing_bank_name: string | null;
  issuing_bank_swift: string | null;
  advising_bank_name: string | null;
  advising_bank_swift: string | null;
  confirming_bank_name: string | null;
  lc_type: string;
  amount_usd: number;
  tolerance_pct: number | null;
  currency: string;
  ucp_version: string;
  issue_date: string | null;
  expiry_date: string | null;
  latest_shipment_date: string | null;
  presentation_days: number | null;
  documents_required: string[];
  status: LcStatus;
  discrepancies: unknown[] | null;
  settled_amount_usd: number | null;
  settled_at: string | null;
  created_at: string;
}

interface LcDoc {
  id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  presented_at: string;
  review_status: "pending" | "accepted" | "discrepancy" | "waived";
  review_notes: string | null;
}

interface LcHistory {
  id: string;
  from_status: LcStatus | null;
  to_status: LcStatus;
  note: string | null;
  created_at: string;
}

type TransitionTarget = Exclude<LcStatus, "draft">;

function buildTransitions(
  status: LcStatus,
  isApplicant: boolean,
  isBeneficiary: boolean,
  t: (k: string) => string
) {
  type T = { to: TransitionTarget; label: string; tone?: "primary" | "danger" | "neutral" };
  const list: T[] = [];

  if (isApplicant) {
    if (status === "draft") list.push({ to: "applied", label: t("transitions.apply"), tone: "primary" });
    if (status === "applied") list.push({ to: "issued", label: t("transitions.issued"), tone: "primary" });
    if (status === "issued") list.push({ to: "advised", label: t("transitions.advised"), tone: "primary" });
    if (status === "advised") list.push({ to: "confirmed", label: t("transitions.confirmed") });
    if (status === "docs_presented")
      list.push(
        { to: "accepted", label: t("transitions.accept"), tone: "primary" },
        { to: "discrepancies", label: t("transitions.flagDiscrepancies"), tone: "danger" }
      );
    if (status === "discrepancies")
      list.push({ to: "accepted", label: t("transitions.waive"), tone: "primary" });
    if (status === "accepted")
      list.push({ to: "settled", label: t("transitions.settle"), tone: "primary" });
  }

  if (isBeneficiary && ["advised", "confirmed"].includes(status)) {
    list.push({ to: "docs_presented", label: t("transitions.presentDocs"), tone: "primary" });
  }

  // Cancel available from any non-terminal state for the applicant
  if (
    isApplicant &&
    !["settled", "expired", "cancelled", "docs_presented", "accepted"].includes(status)
  ) {
    list.push({ to: "cancelled", label: t("transitions.cancel"), tone: "danger" });
  }

  return list;
}

export default async function LcDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("resources.lcDetail");
  const supabase = await createClient();
  const tier = await getCallerTierStatus();

  const { data: lcData } = await supabase
    .from("letters_of_credit")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!lcData) notFound();
  const lc = lcData as unknown as LcRow;

  const isApplicant = tier.companyIds.includes(lc.applicant_company_id);
  const isBeneficiary = tier.companyIds.includes(lc.beneficiary_company_id);

  const [docsRes, histRes, partiesRes] = await Promise.all([
    supabase
      .from("lc_documents")
      .select("id, document_type, file_url, file_name, presented_at, review_status, review_notes")
      .eq("lc_id", id)
      .order("presented_at", { ascending: false }),
    supabase
      .from("lc_state_history")
      .select("id, from_status, to_status, note, created_at")
      .eq("lc_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("companies")
      .select("id, name, country_code")
      .in("id", [lc.applicant_company_id, lc.beneficiary_company_id]),
  ]);

  const docs = (docsRes.data ?? []) as LcDoc[];
  const history = (histRes.data ?? []) as LcHistory[];
  const parties = partiesRes.data ?? [];
  const applicant = parties.find((p) => p.id === lc.applicant_company_id);
  const beneficiary = parties.find((p) => p.id === lc.beneficiary_company_id);

  const docsByType = new Map<string, LcDoc[]>();
  for (const d of docs) {
    const arr = docsByType.get(d.document_type) ?? [];
    arr.push(d);
    docsByType.set(d.document_type, arr);
  }

  const transitions = buildTransitions(lc.status, isApplicant, isBeneficiary, (k) =>
    t(k as never)
  );

  return (
    <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12">
      <nav className="text-xs text-slate-400 mb-6">
        <Link href="/resources/lc" className="hover:text-white">
          {t("breadcrumb")}
        </Link>
        <span className="mx-2">/</span>
        <span>{lc.bank_lc_number ?? lc.lc_reference}</span>
      </nav>

      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-semibold">
            {lc.bank_lc_number ?? lc.lc_reference}
          </h1>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-3">
            <span>{lc.ucp_version}</span>
            <span>·</span>
            <span>{lc.lc_type.replace(/_/g, " ").toUpperCase()}</span>
            <span>·</span>
            <span>
              {lc.currency} {Number(lc.amount_usd).toLocaleString()}
            </span>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
          {lc.status}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <Stat label={t("applicant")} value={`${applicant?.name ?? "—"} (${applicant?.country_code ?? ""})`} />
        <Stat label={t("beneficiary")} value={`${beneficiary?.name ?? "—"} (${beneficiary?.country_code ?? ""})`} />
        <Stat label={t("tolerance")} value={lc.tolerance_pct != null ? `${lc.tolerance_pct}%` : "—"} />
        <Stat label={t("issueDate")} value={lc.issue_date ?? "—"} />
        <Stat label={t("expiry")} value={lc.expiry_date ?? "—"} />
        <Stat label={t("latestShip")} value={lc.latest_shipment_date ?? "—"} />
        <Stat label={t("issuingBank")} value={lc.issuing_bank_name ?? "—"} />
        <Stat label={t("advisingBank")} value={lc.advising_bank_name ?? "—"} />
        <Stat label={t("confirmingBank")} value={lc.confirming_bank_name ?? "—"} />
      </div>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">{t("actions")}</h2>
        {transitions.length > 0 ? (
          <LcTransitionButtons lcId={lc.id} transitions={transitions} />
        ) : (
          <p className="text-sm text-slate-400">{t("noActions")}</p>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">
          {t("documents")} ({docs.length}/{lc.documents_required.length})
        </h2>
        <ul className="divide-y divide-white/10 border border-white/10 rounded-xl">
          {lc.documents_required.map((docType) => {
            const presented = docsByType.get(docType) ?? [];
            const latest = presented[0];
            return (
              <li
                key={docType}
                className="px-5 py-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-medium">
                    {docType.replace(/_/g, " ")}
                  </div>
                  {latest && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {latest.file_name ?? latest.file_url.split("/").pop()} ·{" "}
                      {new Date(latest.presented_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {latest ? (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        latest.review_status === "accepted"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : latest.review_status === "discrepancy"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {latest.review_status}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {t("notPresented")}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">{t("history")}</h2>
        <ol className="space-y-3 border-l border-white/10 pl-4">
          {history.map((h) => (
            <li key={h.id} className="text-sm">
              <div className="text-xs text-slate-400">
                {new Date(h.created_at).toLocaleString()}
              </div>
              <div>
                {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
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
