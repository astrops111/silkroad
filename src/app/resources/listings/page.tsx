import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listResourceListings, type ListResourceFilters } from "@/lib/queries/resources";

type SearchParams = Promise<{
  group?: string;
  category?: string;
  country?: string;
  incoterm?: string;
  q?: string;
  sort?: string;
  page?: string;
}>;

const GROUP_SLUGS = ["metals", "minerals", "energy", "timber", "food", "raw_materials"] as const;

function formatQty(qty: number | null, uom: string | null) {
  if (qty == null) return "—";
  return `${qty.toLocaleString()} ${uom ?? ""}`.trim();
}

function formatPrice(price: number | null, uom: string | null) {
  if (price == null) return "POA";
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}/${uom ?? "unit"}`;
}

export default async function ResourceListingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const t = await getTranslations("resources.listings");
  const tGroups = await getTranslations("resources.groups");

  const filters: ListResourceFilters = {
    group: params.group && (GROUP_SLUGS as readonly string[]).includes(params.group)
      ? params.group
      : undefined,
    categorySlug: params.category,
    originCountry: params.country,
    incoterm: params.incoterm,
    search: params.q,
    sort: (["newest", "price_asc", "price_desc"] as const).includes(
      params.sort as "newest" | "price_asc" | "price_desc"
    )
      ? (params.sort as "newest" | "price_asc" | "price_desc")
      : "newest",
    page: Number(params.page ?? 1),
  };

  let listings: Awaited<ReturnType<typeof listResourceListings>>["listings"] = [];
  let total = 0;
  try {
    const result = await listResourceListings(filters);
    listings = result.listings;
    total = result.total;
  } catch {
    // DB unavailable — render empty state
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold">{t("heading")}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {filters.group
              ? tGroups(`${filters.group}.title` as never)
              : t("allGroups")}{" "}
            · {total.toLocaleString()} {t("results")}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link
            href="/resources/listings"
            className={`text-xs px-3 py-1.5 rounded-full border ${
              !filters.group
                ? "border-[var(--amber)] text-[var(--amber)]"
                : "border-white/15 text-slate-300 hover:border-white/40"
            }`}
          >
            {t("allGroups")}
          </Link>
          {GROUP_SLUGS.map((g) => (
            <Link
              key={g}
              href={`/resources/listings?group=${g}`}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                filters.group === g
                  ? "border-[var(--amber)] text-[var(--amber)]"
                  : "border-white/15 text-slate-300 hover:border-white/40"
              }`}
            >
              {tGroups(`${g}.title` as never)}
            </Link>
          ))}
        </nav>
      </div>

      {listings.length === 0 ? (
        <div className="border border-dashed border-white/15 rounded-xl py-20 text-center text-slate-400">
          <p className="text-lg">{t("emptyTitle")}</p>
          <p className="text-sm mt-1">{t("emptyBody")}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((l) => {
            const uom = l.unit_of_measure ?? l.resource_categories?.unit_of_measure ?? null;
            return (
              <li key={l.id}>
                <Link
                  href={`/resources/listings/${l.id}`}
                  className="group block h-full rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/30 transition overflow-hidden"
                >
                  <div className="aspect-[16/10] bg-gradient-to-br from-white/5 to-white/0 flex items-center justify-center text-slate-500 text-xs">
                    {l.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.images[0]}
                        alt={l.name_en}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{l.resource_categories?.name_en ?? l.category}</span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <span className="uppercase tracking-wider">
                        {l.origin_country}
                      </span>
                      {l.incoterm && (
                        <span className="px-2 py-0.5 rounded bg-white/5">
                          {l.incoterm.toUpperCase()}
                        </span>
                      )}
                      {l.port_of_loading && <span>· {l.port_of_loading}</span>}
                    </div>
                    <h3 className="font-medium text-base leading-snug mb-1 group-hover:text-[var(--amber)]">
                      {l.name_en}
                    </h3>
                    {l.grade && (
                      <p className="text-xs text-slate-400 mb-3">
                        {t("grade")}: {l.grade}
                        {l.variety && ` · ${l.variety}`}
                      </p>
                    )}
                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <div className="text-xs text-slate-400">{t("price")}</div>
                        <div className="text-sm font-semibold">
                          {formatPrice(l.price_per_unit_usd, uom)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">{t("available")}</div>
                        <div className="text-sm">
                          {formatQty(l.available_quantity, uom)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
