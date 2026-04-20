import Link from "next/link";
import { getTranslations } from "next-intl/server";

const PLANS = [
  {
    slug: "standard",
    priceUsd: 49,
    featureKeys: ["f1", "f2", "f3", "f4"] as const,
    highlight: false,
  },
  {
    slug: "gold",
    priceUsd: 149,
    featureKeys: ["f1", "f2", "f3", "f4", "f5", "f6"] as const,
    highlight: true,
  },
];

export default async function ResourcesUpgradePage() {
  const t = await getTranslations("resources.upgrade");
  const tPlan = await getTranslations("resources.upgrade.plans");

  return (
    <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-20">
      <div className="text-center mb-14">
        <p className="text-xs tracking-[0.2em] text-[var(--amber)] mb-4">
          {t("eyebrow")}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight mb-4">
          {t("heading")}
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">{t("sub")}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {PLANS.map((p) => (
          <div
            key={p.slug}
            className={`rounded-2xl border p-8 ${
              p.highlight
                ? "border-[var(--amber)]/50 bg-gradient-to-b from-[var(--amber)]/10 to-transparent"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="text-xl font-semibold">
                {tPlan(`${p.slug}.name` as never)}
              </h2>
              {p.highlight && (
                <span className="text-xs text-[var(--amber)] uppercase tracking-wider">
                  {t("popular")}
                </span>
              )}
            </div>
            <div className="text-3xl font-semibold mb-1">${p.priceUsd}</div>
            <div className="text-sm text-slate-400 mb-6">{t("perMonth")}</div>
            <ul className="space-y-3 mb-8 text-sm">
              {p.featureKeys.map((k) => (
                <li key={k} className="flex items-start gap-2 text-slate-200">
                  <span className="text-[var(--amber)] mt-0.5">✓</span>
                  {tPlan(`${p.slug}.${k}` as never)}
                </li>
              ))}
            </ul>
            <Link
              href={`/dashboard/billing?plan=${p.slug}`}
              className={`block w-full text-center py-3 rounded-md font-medium ${
                p.highlight
                  ? "bg-[var(--amber)] text-black hover:opacity-90"
                  : "border border-white/20 hover:bg-white/5"
              }`}
            >
              {t("ctaSelect")}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-slate-500">{t("footnote")}</p>
    </div>
  );
}
