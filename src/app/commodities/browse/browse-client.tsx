"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  CheckCircle2,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { useRegion } from "@/lib/providers/region-provider";
import { formatConvertedPriceWithCode } from "@/lib/currency/formatter";

const COMMODITY_CATEGORIES = [
  { slug: null, key: "categoryAll" },
  { slug: "coffee", key: "categoryCoffee" },
  { slug: "cocoa", key: "categoryCocoa" },
  { slug: "tea", key: "categoryTea" },
  { slug: "spices", key: "categorySpices" },
  { slug: "minerals", key: "categoryMinerals" },
  { slug: "specialty", key: "categorySpecialty" },
] as const;

const CERTIFICATIONS = [
  { key: "certFairTrade" },
  { key: "certOrganic" },
  { key: "certSpecialty" },
  { key: "certSingleEstate" },
  { key: "certTraceable" },
] as const;

const REGIONS = [
  { key: "regionEastAfrica" },
  { key: "regionWestAfrica" },
  { key: "regionSouthernAfrica" },
  { key: "regionNorthAfrica" },
] as const;

type Commodity = {
  id: string;
  name: string;
  category: string;
  origin: string;
  cooperative: string;
  certified: boolean;
  amount: number;
  currency: string;
  unit: string;
  moq: string;
  rating: number;
  reviews: number;
  image: string;
  badges: string[];
};

const COMMODITIES: Commodity[] = [
  {
    id: "c-arabica-rwanda",
    name: "Premium Arabica Coffee — Bourbon, Washed Process",
    category: "coffee",
    origin: "Rwanda · Western Province",
    cooperative: "Gorilla Coffee Co-op",
    certified: true,
    amount: 4_85,
    currency: "USD",
    unit: "kg",
    moq: "60kg",
    rating: 4.9,
    reviews: 84,
    image:
      "https://images.pexels.com/photos/28487979/pexels-photo-28487979.jpeg?auto=compress&cs=tinysrgb&w=900",
    badges: ["Specialty", "Fair Trade"],
  },
  {
    id: "c-cocoa-ghana",
    name: "Organic Cocoa Beans — Sun-Dried, Bulk Lots",
    category: "cocoa",
    origin: "Ghana · Ashanti",
    cooperative: "Asante Farmers Union",
    certified: true,
    amount: 3_20,
    currency: "USD",
    unit: "kg",
    moq: "100kg",
    rating: 4.7,
    reviews: 56,
    image:
      "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=900",
    badges: ["Organic", "Fair Trade"],
  },
  {
    id: "c-tea-kenya",
    name: "Specialty Black Tea CTC — Single-Estate Highland",
    category: "tea",
    origin: "Kenya · Kericho",
    cooperative: "Kericho Highlands Tea",
    certified: true,
    amount: 5_50,
    currency: "USD",
    unit: "kg",
    moq: "50kg",
    rating: 4.8,
    reviews: 42,
    image:
      "https://images.pexels.com/photos/29892493/pexels-photo-29892493.jpeg?auto=compress&cs=tinysrgb&w=900",
    badges: ["Single-Estate"],
  },
  {
    id: "c-yirgacheffe",
    name: "Yirgacheffe Coffee Green Beans — Grade 1",
    category: "coffee",
    origin: "Ethiopia · Sidama",
    cooperative: "Sidama Coffee Union",
    certified: true,
    amount: 7_20,
    currency: "USD",
    unit: "kg",
    moq: "60kg",
    rating: 5.0,
    reviews: 38,
    image:
      "https://images.pexels.com/photos/28487979/pexels-photo-28487979.jpeg?auto=compress&cs=tinysrgb&w=900",
    badges: ["Specialty", "New"],
  },
  {
    id: "c-cardamom-tanzania",
    name: "Sun-Dried Green Cardamom Pods — Aromatic",
    category: "spices",
    origin: "Tanzania · Kilimanjaro",
    cooperative: "Spice Roads Cooperative",
    certified: true,
    amount: 24_00,
    currency: "USD",
    unit: "kg",
    moq: "25kg",
    rating: 4.6,
    reviews: 21,
    image:
      "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=900",
    badges: ["Aromatic"],
  },
  {
    id: "c-cobalt-drc",
    name: "Cobalt Ore Concentrate — Battery-Grade, Certified Origin",
    category: "minerals",
    origin: "DRC · Katanga",
    cooperative: "Katanga Mining Resources",
    certified: true,
    amount: 32_000_00,
    currency: "USD",
    unit: "tonne",
    moq: "1 tonne",
    rating: 4.5,
    reviews: 12,
    image:
      "https://images.pexels.com/photos/33192/paddle-wheel-bucket-wheel-excavators-brown-coal-open-pit-mining.jpg?auto=compress&cs=tinysrgb&w=900",
    badges: ["Certified", "Traceable"],
  },
  {
    id: "c-vanilla-madagascar",
    name: "Bourbon Vanilla Beans — Grade A Gourmet Cured",
    category: "spices",
    origin: "Madagascar · Sava",
    cooperative: "Sava Vanilla Growers",
    certified: true,
    amount: 340_00,
    currency: "USD",
    unit: "kg",
    moq: "5kg",
    rating: 4.9,
    reviews: 67,
    image:
      "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=900",
    badges: ["Premium", "Hot"],
  },
  {
    id: "c-shea-burkina",
    name: "Raw Shea Butter — Unrefined, Cosmetic Grade",
    category: "specialty",
    origin: "Burkina Faso · Bobo-Dioulasso",
    cooperative: "Burkina Women's Collective",
    certified: true,
    amount: 6_80,
    currency: "USD",
    unit: "kg",
    moq: "200kg",
    rating: 4.8,
    reviews: 45,
    image:
      "https://images.pexels.com/photos/29892493/pexels-photo-29892493.jpeg?auto=compress&cs=tinysrgb&w=900",
    badges: ["Women-Led", "Fair Trade"],
  },
  {
    id: "c-cocoa-powder",
    name: "Natural Cocoa Powder — 22-24% Fat, Bulk",
    category: "cocoa",
    origin: "Côte d'Ivoire · San-Pédro",
    cooperative: "Ivory Cocoa Processors",
    certified: true,
    amount: 4_90,
    currency: "USD",
    unit: "kg",
    moq: "500kg",
    rating: 4.4,
    reviews: 29,
    image:
      "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=900",
    badges: ["Bulk"],
  },
];

function FilterSidebar({
  open,
  onClose,
  activeSlug,
}: {
  open: boolean;
  onClose: () => void;
  activeSlug: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("marketing.browse");

  const buildHref = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }
    params.delete("sub");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed lg:sticky top-0 lg:top-[80px] left-0 z-50 lg:z-auto
          h-screen lg:h-auto w-80 lg:w-64 shrink-0
          bg-[var(--surface-primary)] lg:bg-transparent
          border-r lg:border-r-0 border-[var(--border-subtle)]
          overflow-y-auto
          transition-transform duration-300 lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-6 lg:p-0">
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h3
              className="text-lg font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("filtersHeading")}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--surface-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              {t("commodityHeading")}
            </h4>
            <div className="space-y-1">
              {COMMODITY_CATEGORIES.map((cat) => {
                const isActive = (cat.slug ?? null) === activeSlug;
                return (
                  <Link
                    key={cat.key}
                    href={buildHref(cat.slug)}
                    onClick={onClose}
                    scroll={false}
                    className={`block w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "bg-[var(--terracotta)]/10 text-[var(--terracotta)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {t(cat.key)}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              {t("certificationHeading")}
            </h4>
            <div className="space-y-2">
              {CERTIFICATIONS.map((cert) => (
                <label
                  key={cert.key}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-[var(--border-strong)]" />
                  {t(cert.key)}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              {t("regionHeading")}
            </h4>
            <div className="space-y-2">
              {REGIONS.map((region) => (
                <label
                  key={region.key}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-[var(--border-strong)]" />
                  {t(region.key)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function CommoditiesBrowseClient() {
  const [filterOpen, setFilterOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const region = useRegion();
  const locale = useLocale();
  const t = useTranslations("marketing.browse");

  const categorySlug = searchParams.get("category");
  const subSlug = searchParams.get("sub");
  const activeCategory =
    COMMODITY_CATEGORIES.find((c) => c.slug === categorySlug) ?? null;
  const activeCategoryLabel = activeCategory ? t(activeCategory.key) : "";

  const displayCommodities = useMemo(() => {
    if (!activeCategory?.slug) return COMMODITIES;
    return COMMODITIES.filter((c) => c.category === activeCategory.slug);
  }, [activeCategory]);

  const clearFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("sub");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <>
      <Navbar />
      <main className="pt-[104px] lg:pt-[184px] min-h-screen bg-[var(--surface-secondary)]">
        <div className="bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-3">
              <Link
                href="/commodities"
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                {t("breadcrumbHome")}
              </Link>
              <span>/</span>
              <span>{t("breadcrumbBrowse")}</span>
            </div>
            <h1
              className="text-2xl lg:text-3xl font-bold text-[var(--obsidian)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {activeCategory?.slug ? activeCategoryLabel : t("title")}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {activeCategory?.slug
                ? t("lotCount", {
                    count: displayCommodities.length,
                    category: activeCategoryLabel,
                  })
                : t("subtitle")}
            </p>

            {(activeCategory?.slug || subSlug) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mr-1">
                  {t("filterChipLabel")}
                </span>
                {activeCategory?.slug && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--terracotta)]/12 border border-[var(--terracotta)]/25 text-[var(--terracotta)]">
                    {activeCategoryLabel}
                  </span>
                )}
                {subSlug && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    {subSlug.replace(/-/g, " ")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearFilter}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {t("clear")}
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="mt-5 flex items-center h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] focus-within:border-[var(--terracotta)] transition-colors max-w-2xl">
              <Search className="w-4 h-4 ml-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                className="w-full bg-transparent px-3 text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <button className="h-full px-6 text-sm font-semibold bg-[var(--terracotta)] text-white rounded-xl hover:opacity-90 transition-opacity">
                {t("searchButton")}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          <div className="flex gap-8">
            <FilterSidebar
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              activeSlug={categorySlug}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setFilterOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {t("filtersHeading")}
                </button>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t("showing", {
                    shown: displayCommodities.length,
                    total: COMMODITIES.length,
                  })}
                </p>
              </div>

              {displayCommodities.length === 0 ? (
                <div className="py-16 text-center text-[var(--text-secondary)]">
                  {t("noResults")}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {displayCommodities.map((c) => (
                    <Link
                      key={c.id}
                      href={`/commodities/${c.id}`}
                      className="group bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] hover:shadow-lg overflow-hidden transition-shadow flex sm:block"
                    >
                      <div className="relative w-32 shrink-0 self-stretch sm:self-auto sm:w-auto sm:aspect-[4/3] overflow-hidden">
                        <Image
                          src={c.image}
                          alt={c.name}
                          fill
                          sizes="(max-width: 640px) 128px, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1 sm:gap-1.5">
                          {c.badges.slice(0, 2).map((b) => (
                            <span
                              key={b}
                              className="px-1.5 py-0.5 sm:px-2 text-[9px] sm:text-[10px] font-bold rounded-md bg-white/95 text-[var(--obsidian)] tracking-wide"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 p-3 sm:p-5 flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span
                            className="text-base sm:text-lg font-bold text-[var(--obsidian)]"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {formatConvertedPriceWithCode(
                              c.amount,
                              c.currency,
                              region.currency,
                              locale,
                            )}
                          </span>
                          <span className="text-[10px] sm:text-xs text-[var(--text-tertiary)]">
                            / {c.unit}
                          </span>
                        </div>
                        <h3 className="mt-1 text-[13px] sm:text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">
                          {c.name}
                        </h3>
                        <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-[11px] sm:text-xs text-[var(--text-tertiary)]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.origin}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] sm:text-xs text-[var(--text-secondary)]">
                          {c.certified && (
                            <CheckCircle2 className="w-3 h-3 text-[var(--success)] shrink-0" />
                          )}
                          <span className="truncate">{c.cooperative}</span>
                        </div>
                        <div className="mt-2 sm:mt-3 flex items-center justify-between text-[11px] sm:text-xs text-[var(--text-tertiary)]">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-[var(--amber)] text-[var(--amber)]" />
                            {c.rating} ({c.reviews})
                          </span>
                          <span>MOQ {c.moq}</span>
                        </div>
                        <div className="mt-auto pt-2 sm:pt-4 flex items-center justify-between">
                          <span className="text-[11px] sm:text-xs font-semibold text-[var(--terracotta)]">
                            {t("viewLot")}
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--terracotta)] transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
