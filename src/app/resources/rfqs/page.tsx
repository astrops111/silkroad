import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

interface RfqRow {
  id: string;
  rfq_number: string;
  title: string;
  status: string;
  quantity_numeric: number | null;
  unit_of_measure: string | null;
  trade_term: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  created_at: string;
  quotation_count: number | null;
}

export default async function ResourceRfqsIndexPage() {
  const t = await getTranslations("resources.rfqsList");
  const supabase = await createClient();

  const { data } = await supabase
    .from("rfqs")
    .select(
      "id, rfq_number, title, status, quantity_numeric, unit_of_measure, trade_term, port_of_loading, port_of_discharge, created_at, quotation_count"
    )
    .not("resource_category_id", "is", null)
    .in("status", ["open", "quoted", "awarded"])
    .order("created_at", { ascending: false })
    .limit(50);

  const rfqs = (data ?? []) as RfqRow[];

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold">{t("heading")}</h1>
          <p className="text-slate-400 text-sm mt-1">{t("sub")}</p>
        </div>
        <Link
          href="/resources/rfqs/new"
          className="px-4 py-2 rounded-md bg-[var(--amber)] text-black text-sm font-medium hover:opacity-90"
        >
          {t("ctaNew")}
        </Link>
      </div>

      {rfqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 py-16 text-center text-slate-400">
          {t("empty")}
        </div>
      ) : (
        <ul className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {rfqs.map((r) => (
            <li key={r.id}>
              <Link
                href={`/resources/rfqs/${r.id}`}
                className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-white/5 items-center"
              >
                <div className="col-span-5">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {r.rfq_number}
                  </div>
                </div>
                <div className="col-span-2 text-sm">
                  {r.quantity_numeric != null
                    ? `${r.quantity_numeric.toLocaleString()} ${r.unit_of_measure ?? ""}`
                    : "—"}
                </div>
                <div className="col-span-2 text-sm">
                  {r.trade_term?.toUpperCase() ?? "—"}
                  {r.port_of_loading && (
                    <span className="text-slate-400"> · {r.port_of_loading}</span>
                  )}
                </div>
                <div className="col-span-2 text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/5">
                    {r.status}
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
