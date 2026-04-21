"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

const COMMODITY_CATEGORIES = [
  { slug: null, label: "All Commodities" },
  { slug: "coffee", label: "Coffee" },
  { slug: "cocoa", label: "Cocoa" },
  { slug: "tea", label: "Tea" },
  { slug: "spices", label: "Spices" },
  { slug: "minerals", label: "Minerals" },
  { slug: "specialty", label: "Specialty Crops" },
] as const;

type Commodity = {
  id: string;
  name: string;
  category: string;
  origin: string;
  cooperative: string;
  certified: boolean;
  price: string;
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
    price: "USD 4.85",
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
    price: "USD 3.20",
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
    price: "USD 5.50",
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
    price: "USD 7.20",
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
    price: "USD 24.00",
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
    price: "USD 32,000",
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
    price: "USD 340.00",
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
    price: "USD 6.80",
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
    price: "USD 4.90",
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
              Filters
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
              Commodity
            </h4>
            <div className="space-y-1">
              {COMMODITY_CATEGORIES.map((cat) => {
                const isActive = (cat.slug ?? null) === activeSlug;
                return (
                  <Link
                    key={cat.label}
                    href={buildHref(cat.slug)}
                    onClick={onClose}
                    scroll={false}
                    className={`block w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "bg-[var(--terracotta)]/10 text-[var(--terracotta)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {cat.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              Certification
            </h4>
            <div className="space-y-2">
              {[
                "Fair Trade",
                "Organic",
                "Specialty",
                "Single-Estate",
                "Traceable",
              ].map((label) => (
                <label
                  key={label}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-[var(--border-strong)]" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              Source Region
            </h4>
            <div className="space-y-2">
              {["East Africa", "West Africa", "Southern Africa", "North Africa"].map(
                (label) => (
                  <label
                    key={label}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
                  >
                    <div className="w-4 h-4 rounded border border-[var(--border-strong)]" />
                    {label}
                  </label>
                ),
              )}
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

  const categorySlug = searchParams.get("category");
  const subSlug = searchParams.get("sub");
  const activeCategory =
    COMMODITY_CATEGORIES.find((c) => c.slug === categorySlug) ?? null;

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
      <main className="pt-[68px] lg:pt-[148px] min-h-screen bg-[var(--surface-secondary)]">
        <div className="bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-3">
              <Link
                href="/commodities"
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                Commodities Portal
              </Link>
              <span>/</span>
              <span>Browse</span>
            </div>
            <h1
              className="text-2xl lg:text-3xl font-bold text-[var(--obsidian)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {activeCategory?.slug ? activeCategory.label : "Browse Commodities"}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {activeCategory?.slug
                ? `${displayCommodities.length} ${
                    displayCommodities.length === 1 ? "lot" : "lots"
                  } in ${activeCategory.label}`
                : "African coffee, cocoa, tea, spices, and minerals from verified cooperatives"}
            </p>

            {(activeCategory?.slug || subSlug) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mr-1">
                  Filters
                </span>
                {activeCategory?.slug && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--terracotta)]/12 border border-[var(--terracotta)]/25 text-[var(--terracotta)]">
                    {activeCategory.label}
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
                  Clear
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="mt-5 flex items-center h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] focus-within:border-[var(--terracotta)] transition-colors max-w-2xl">
              <Search className="w-4 h-4 ml-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search commodities, cooperatives, regions…"
                className="w-full bg-transparent px-3 text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <button className="h-full px-6 text-sm font-semibold bg-[var(--terracotta)] text-white rounded-xl hover:opacity-90 transition-opacity">
                Search
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
                  Filters
                </button>
                <p className="text-sm text-[var(--text-secondary)]">
                  Showing {displayCommodities.length} of {COMMODITIES.length} lots
                </p>
              </div>

              {displayCommodities.length === 0 ? (
                <div className="py-16 text-center text-[var(--text-secondary)]">
                  No commodities match this filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {displayCommodities.map((c) => (
                    <Link
                      key={c.id}
                      href={`/commodities/${c.id}`}
                      className="group bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] hover:shadow-lg overflow-hidden transition-shadow"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
                          src={c.image}
                          alt={c.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          {c.badges.slice(0, 2).map((b) => (
                            <span
                              key={b}
                              className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/95 text-[var(--obsidian)] tracking-wide"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex items-baseline gap-1">
                          <span
                            className="text-lg font-bold text-[var(--obsidian)]"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {c.price}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            / {c.unit}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">
                          {c.name}
                        </h3>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.origin}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          {c.certified && (
                            <CheckCircle2 className="w-3 h-3 text-[var(--success)] shrink-0" />
                          )}
                          <span className="truncate">{c.cooperative}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-[var(--amber)] text-[var(--amber)]" />
                            {c.rating} ({c.reviews})
                          </span>
                          <span>MOQ {c.moq}</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--terracotta)]">
                            View lot
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
