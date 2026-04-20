import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

interface LcRow {
  id: string;
  lc_reference: string;
  bank_lc_number: string | null;
  amount_usd: number;
  currency: string;
  lc_type: string;
  status: string;
  issue_date: string | null;
  expiry_date: string | null;
  created_at: string;
  applicant: { name: string; country_code: string | null } | null;
  beneficiary: { name: string; country_code: string | null } | null;
}

export default async function LcListPage() {
  const t = await getTranslations("resources.lcList");
  const supabase = await createClient();

  const { data } = await supabase
    .from("letters_of_credit")
    .select(
      `id, lc_reference, bank_lc_number, amount_usd, currency, lc_type,
       status, issue_date, expiry_date, created_at,
       applicant:applicant_company_id (name, country_code),
       beneficiary:beneficiary_company_id (name, country_code)`
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const lcs = (data ?? []) as unknown as LcRow[];

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">{t("heading")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("sub")}</p>
      </div>

      {lcs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 py-16 text-center text-slate-400">
          {t("empty")}
        </div>
      ) : (
        <ul className="divide-y divide-white/10 border border-white/10 rounded-xl">
          {lcs.map((lc) => (
            <li key={lc.id}>
              <Link
                href={`/resources/lc/${lc.id}`}
                className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-white/5 items-center"
              >
                <div className="col-span-4">
                  <div className="text-sm font-medium">
                    {lc.bank_lc_number ?? lc.lc_reference}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {lc.lc_type.replace(/_/g, " ").toUpperCase()} ·{" "}
                    {new Date(lc.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="col-span-3 text-sm">
                  <div className="text-xs text-slate-400">{t("parties")}</div>
                  <div className="truncate">
                    {lc.applicant?.name ?? "—"} → {lc.beneficiary?.name ?? "—"}
                  </div>
                </div>
                <div className="col-span-2 text-sm">
                  {lc.currency} {Number(lc.amount_usd).toLocaleString()}
                </div>
                <div className="col-span-2 text-xs text-slate-400">
                  {lc.expiry_date ?? "—"}
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/5">
                    {lc.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
