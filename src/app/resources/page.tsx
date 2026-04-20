import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listResourceCategories } from "@/lib/queries/resources";

const GROUPS: Array<{
  slug: string;
  tone: string;
}> = [
  { slug: "metals", tone: "from-amber-500/20 to-amber-500/5" },
  { slug: "minerals", tone: "from-slate-400/20 to-slate-400/5" },
  { slug: "energy", tone: "from-rose-500/20 to-rose-500/5" },
  { slug: "timber", tone: "from-emerald-500/20 to-emerald-500/5" },
  { slug: "food", tone: "from-lime-500/20 to-lime-500/5" },
  { slug: "raw_materials", tone: "from-indigo-500/20 to-indigo-500/5" },
];

export default async function ResourcesLandingPage() {
  const t = await getTranslations("resources.landing");
  const tGroups = await getTranslations("resources.groups");

  let categoryCount = 0;
  try {
    const cats = await listResourceCategories();
    categoryCount = cats.length;
  } catch {
    // DB not connected — render static hero
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-24 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-xs tracking-[0.2em] text-[var(--amber)] mb-5">
              {t("eyebrow")}
            </p>
            <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
              {t("headline")}
            </h1>
            <p className="text-lg text-slate-300 mb-10 max-w-2xl">
              {t("subhead")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/resources/listings"
                className="px-6 py-3 rounded-md bg-[var(--amber)] text-black font-medium hover:opacity-90"
              >
                {t("ctaBrowse")}
              </Link>
              <Link
                href="/auth/register?intent=resources_supplier"
                className="px-6 py-3 rounded-md border border-white/20 hover:bg-white/5"
              >
                {t("ctaSell")}
              </Link>
            </div>
            <dl className="mt-14 grid grid-cols-3 gap-10 max-w-xl">
              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wider">
                  {t("statCategories")}
                </dt>
                <dd className="text-2xl font-semibold mt-1">
                  {categoryCount || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wider">
                  {t("statPayment")}
                </dt>
                <dd className="text-2xl font-semibold mt-1">LC · T/T</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wider">
                  {t("statFx")}
                </dt>
                <dd className="text-2xl font-semibold mt-1">USD · CNY</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20">
        <h2 className="text-2xl font-semibold mb-10">{t("categoriesHeading")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {GROUPS.map((g) => (
            <Link
              key={g.slug}
              href={`/resources/listings?group=${g.slug}`}
              className={`group relative rounded-xl border border-white/10 bg-gradient-to-br ${g.tone} p-8 hover:border-white/30 transition`}
            >
              <div className="text-xs tracking-wider text-slate-400 uppercase mb-3">
                {tGroups(`${g.slug}.tag` as never)}
              </div>
              <div className="text-xl font-semibold mb-2">
                {tGroups(`${g.slug}.title` as never)}
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {tGroups(`${g.slug}.desc` as never)}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--amber)]">
                {t("explore")} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-3 gap-10">
          <div>
            <h3 className="text-lg font-semibold mb-3">{t("pillarTrade.title")}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t("pillarTrade.body")}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">{t("pillarFreight.title")}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t("pillarFreight.body")}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">{t("pillarFx.title")}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t("pillarFx.body")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
