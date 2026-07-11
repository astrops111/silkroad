"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Tooltip } from "@/components/ui/tooltip";
import { imageForSlug } from "@/lib/category-images";
import { regionMeta, tradeMeta } from "@/lib/product-labels";
import { MARKETPLACE_COUNTRIES } from "@/lib/countries";
import {
  SlidersHorizontal,
  Grid3X3,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Shield,
  Clock,
  Heart,
  ArrowUpRight,
  X,
  Package,
  Truck,
} from "lucide-react";

export interface MarketplaceSubcategory {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
}

export interface MarketplaceTopCategory {
  slug: string;
  name: string;
  nameLocal: string | null;
  productCount: number;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  originCountry: string | null;
  tradeTerm: string | null;
  price: number;
  moq: number;
  unit: string;
  rating: number;
  reviews: number;
  responseTime: string;
  image: string;
  category: string;
  tags: string[];
  leadTimeDays?: number | null;
  minOrderAmount?: number | null;
  minOrderGroupedBy?: string | null;
  variantCount?: number;
}


const REGION_BAR_ORDER: readonly (typeof MARKETPLACE_COUNTRIES)[number][] = [
  "CN",
  "KR",
  "JP",
  "TW",
];

const CATEGORIES = [
  { slug: null, key: "categoryAll", matchLabel: null },
  { slug: "home", key: "categoryHome", matchLabel: "Home" },
  { slug: "hotels", key: "categoryHotels", matchLabel: "Hotels" },
  { slug: "consumer-electronics", key: "categoryConsumerElectronics", matchLabel: "Consumer Electronics" },
  { slug: "beauty", key: "categoryBeauty", matchLabel: "Beauty" },
  { slug: "baby-products", key: "categoryBabyProducts", matchLabel: "Baby & Kids" },
  { slug: "groceries", key: "categoryGroceries", matchLabel: "Groceries" },
] as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;
const DEFAULT_PAGE_SIZE = 50;

const PRODUCTS: MarketplaceProduct[] = [
  {
    id: "1",
    name: "Modular 3-Seat Fabric Sofa — Living Room OEM",
    originCountry: "CN",
    tradeTerm: "fob",
    price: 320,
    moq: 10,
    unit: "Sets",
    rating: 4.8,
    reviews: 142,
    responseTime: "< 24h",
    image: "from-slate-200 to-slate-300",
    category: "Furniture",
    tags: ["Hot Sale"],
  },
  {
    id: "2",
    name: "5G Android Smartphone 6.7\" AMOLED 256GB OEM Manufacturer",
    originCountry: "CN",
    tradeTerm: "ddp",
    price: 85,
    moq: 100,
    unit: "Pieces",
    rating: 4.6,
    reviews: 891,
    responseTime: "< 2h",
    image: "from-indigo-100 to-blue-200",
    category: "Consumer Electronics",
    tags: ["Best Seller"],
  },
  {
    id: "3",
    name: "Remy Human-Hair Wigs Lace Front — OEM Bulk Packaging",
    originCountry: "CN",
    tradeTerm: "cif",
    price: 18,
    moq: 50,
    unit: "Pieces",
    rating: 4.9,
    reviews: 2340,
    responseTime: "< 4h",
    image: "from-amber-50 to-orange-100",
    category: "Beauty",
    tags: ["Top Rated"],
  },
  {
    id: "4",
    name: "Crystal Pendant Chandelier 12-Arm — Hotel Lobby Grade",
    originCountry: "CN",
    tradeTerm: "cif",
    price: 240,
    moq: 5,
    unit: "Pieces",
    rating: 4.7,
    reviews: 567,
    responseTime: "< 6h",
    image: "from-sky-100 to-cyan-200",
    category: "Hotel Interiors",
    tags: ["Hot Sale"],
  },
  {
    id: "5",
    name: "4-Star Guestroom Bed Frame + Headboard Set",
    originCountry: "CN",
    tradeTerm: "fob",
    price: 180,
    moq: 20,
    unit: "Sets",
    rating: 4.5,
    reviews: 89,
    responseTime: "< 12h",
    image: "from-yellow-100 to-amber-200",
    category: "Hotel Interiors",
    tags: [],
  },
  {
    id: "6",
    name: "Private-Label Instant Noodles — Assorted Flavors 85g",
    originCountry: "CN",
    tradeTerm: "exw",
    price: 0.18,
    moq: 5000,
    unit: "Packs",
    rating: 4.3,
    reviews: 234,
    responseTime: "< 8h",
    image: "from-stone-100 to-neutral-200",
    category: "Groceries",
    tags: [],
  },
  {
    id: "7",
    name: "LED Smart Home Bulb A60 9W E27 RGBW Tuya WiFi",
    originCountry: "CN",
    tradeTerm: "ddp",
    price: 2.4,
    moq: 500,
    unit: "Pieces",
    rating: 4.8,
    reviews: 1205,
    responseTime: "< 3h",
    image: "from-emerald-50 to-green-100",
    category: "Consumer Electronics",
    tags: ["Best Seller"],
  },
  {
    id: "8",
    name: "OEM Ultra-Absorbent Baby Diapers Size M — Carton of 48",
    originCountry: "CN",
    tradeTerm: "cif",
    price: 4.2,
    moq: 100,
    unit: "Cartons",
    rating: 4.6,
    reviews: 178,
    responseTime: "< 6h",
    image: "from-lime-50 to-green-100",
    category: "Baby & Kids",
    tags: ["Hot Sale"],
  },
];

/* ============================================================
   SUBCATEGORY TICKER — auto-scrolling, seamless loop, pause on hover
   ============================================================ */
function SubcategoryGrid({
  subcategories,
  activeCategorySlug,
  activeSubSlug,
}: {
  subcategories: MarketplaceSubcategory[];
  activeCategorySlug: string;
  activeSubSlug: string | null;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hrefFor = (subSlug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", activeCategorySlug);
    if (subSlug) params.set("sub", subSlug);
    else params.delete("sub");
    return `${pathname}?${params.toString()}`;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let rafId: number;
    let last = performance.now();
    const pxPerSec = 70;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += (pxPerSec * dt) / 1000;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [subcategories.length]);

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };
  const scheduleResume = (delay = 1500) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, delay);
  };

  const scrollByDelta = (dx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    pause();
    el.scrollBy({ left: dx, behavior: "smooth" });
    scheduleResume(2500);
  };

  if (subcategories.length === 0) return null;

  const renderTile = (
    sub: MarketplaceSubcategory,
    keySuffix: string,
    duplicate: boolean,
  ) => {
    const active = sub.slug === activeSubSlug;
    const label = locale === "zh" && sub.nameLocal ? sub.nameLocal : sub.name;
    return (
      <Link
        key={`${sub.id}-${keySuffix}`}
        href={hrefFor(active ? null : sub.slug)}
        scroll={false}
        draggable={false}
        aria-pressed={active}
        aria-hidden={duplicate || undefined}
        tabIndex={duplicate ? -1 : undefined}
        className={`group relative shrink-0 block w-[120px] sm:w-[140px] aspect-square overflow-hidden rounded-xl border transition-all ${
          active
            ? "border-[var(--amber)] ring-2 ring-[var(--amber)]/30 shadow-sm"
            : "border-[var(--border-subtle)] hover:border-[var(--amber)]/50 hover:shadow-sm"
        }`}
      >
        <Image
          src={imageForSlug(sub.slug)}
          alt={duplicate ? "" : label}
          fill
          sizes="(max-width: 640px) 120px, 140px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04] pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-2">
          <p className="text-xs sm:text-[13px] font-semibold text-white leading-tight line-clamp-2">
            {label}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <div className="relative mb-8 group/ticker">
      {/* edge fades */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[var(--surface-secondary)] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[var(--surface-secondary)] to-transparent z-10" />

      {/* Carousel arrows — desktop only */}
      <button
        type="button"
        onClick={() => scrollByDelta(-360)}
        aria-label="Previous"
        className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-[var(--border-subtle)] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover/ticker:opacity-100 transition-opacity"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => scrollByDelta(360)}
        aria-label="Next"
        className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-[var(--border-subtle)] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover/ticker:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div
        ref={scrollRef}
        onMouseEnter={pause}
        onMouseLeave={() => scheduleResume(400)}
        onTouchStart={pause}
        onTouchEnd={() => scheduleResume(2500)}
        onWheel={() => {
          pause();
          scheduleResume(1500);
        }}
        className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide"
      >
        {subcategories.map((sub) => renderTile(sub, "a", false))}
        {subcategories.map((sub) => renderTile(sub, "b", true))}
      </div>
    </div>
  );
}

/* ============================================================
   TOP CATEGORY TICKER — auto-scrolling, seamless loop, pause on hover
   Shown when browsing "All" (no category selected yet); mirrors the
   SubcategoryGrid ticker that takes over once a category is picked.
   ============================================================ */
function TopCategoryTicker({
  topCategories,
}: {
  topCategories: MarketplaceTopCategory[];
}) {
  const locale = useLocale();
  const t = useTranslations("marketing.marketplace");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let rafId: number;
    let last = performance.now();
    const pxPerSec = 70;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += (pxPerSec * dt) / 1000;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [topCategories.length]);

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };
  const scheduleResume = (delay = 1500) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, delay);
  };

  const scrollByDelta = (dx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    pause();
    el.scrollBy({ left: dx, behavior: "smooth" });
    scheduleResume(2500);
  };

  if (topCategories.length === 0) return null;

  const renderTile = (
    cat: MarketplaceTopCategory,
    keySuffix: string,
    duplicate: boolean,
  ) => {
    const label = locale === "zh" && cat.nameLocal ? cat.nameLocal : cat.name;
    return (
      <Link
        key={`${cat.slug}-${keySuffix}`}
        href={`/marketplace?category=${cat.slug}`}
        scroll={false}
        draggable={false}
        aria-hidden={duplicate || undefined}
        tabIndex={duplicate ? -1 : undefined}
        className="group relative shrink-0 block w-[120px] sm:w-[140px] aspect-square overflow-hidden rounded-xl border border-[var(--border-subtle)] hover:border-[var(--amber)]/50 hover:shadow-sm transition-all"
      >
        <Image
          src={imageForSlug(cat.slug)}
          alt={duplicate ? "" : label}
          fill
          sizes="(max-width: 640px) 120px, 140px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04] pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-2">
          <p className="text-xs sm:text-[13px] font-semibold text-white leading-tight line-clamp-2">
            {label}
          </p>
          <p className="text-[10px] text-white/70 mt-0.5">
            {t("productsCount", { count: cat.productCount })}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <div className="relative mb-8 group/ticker">
      {/* edge fades */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[var(--surface-secondary)] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[var(--surface-secondary)] to-transparent z-10" />

      {/* Carousel arrows — desktop only */}
      <button
        type="button"
        onClick={() => scrollByDelta(-360)}
        aria-label="Previous"
        className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-[var(--border-subtle)] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover/ticker:opacity-100 transition-opacity"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => scrollByDelta(360)}
        aria-label="Next"
        className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-[var(--border-subtle)] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover/ticker:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div
        ref={scrollRef}
        onMouseEnter={pause}
        onMouseLeave={() => scheduleResume(400)}
        onTouchStart={pause}
        onTouchEnd={() => scheduleResume(2500)}
        onWheel={() => {
          pause();
          scheduleResume(1500);
        }}
        className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide"
      >
        {topCategories.map((cat) => renderTile(cat, "a", false))}
        {topCategories.map((cat) => renderTile(cat, "b", true))}
      </div>
    </div>
  );
}

function formatPrice(price: number) {
  if (price >= 1000) return `$${(price / 1000).toFixed(price >= 10000 ? 0 : 1)}K`;
  return `$${price.toFixed(price < 10 ? 2 : 0)}`;
}

/* ============================================================
   FILTER SIDEBAR
   ============================================================ */
function FilterSidebar({
  open,
  onClose,
  activeCategorySlug,
  activeSubSlug,
  topCategories,
  subcategoriesByParent,
  brandFacets,
  countryFacets,
  activeCountry,
  countryHrefFor,
}: {
  open: boolean;
  onClose: () => void;
  activeCategorySlug: string | null;
  activeSubSlug: string | null;
  topCategories: MarketplaceTopCategory[];
  subcategoriesByParent: Record<string, MarketplaceSubcategory[]>;
  brandFacets: Record<string, number>;
  countryFacets: Record<string, number>;
  activeCountry: (typeof MARKETPLACE_COUNTRIES)[number] | null;
  countryHrefFor: (code: string | null) => string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("marketing.marketplace");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(activeCategorySlug ? [activeCategorySlug] : [])
  );

  const toggleExpanded = (slug: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const buildSubHref = (parentSlug: string, subSlug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", parentSlug);
    if (subSlug) params.set("sub", subSlug);
    else params.delete("sub");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const categoryCountBySlug = new Map(
    topCategories.map((c) => [c.slug, c.productCount])
  );
  const totalCategoryCount = topCategories.reduce(
    (sum, c) => sum + c.productCount,
    0
  );

  const activeBrands = new Set(
    (searchParams.get("brand") ?? "").split(",").filter(Boolean)
  );
  const sortedBrands = Object.entries(brandFacets).sort((a, b) => b[1] - a[1]);

  const buildBrandHref = (brand: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const next = new Set(activeBrands);
    if (next.has(brand)) next.delete(brand);
    else next.add(brand);
    if (next.size > 0) params.set("brand", Array.from(next).join(","));
    else params.delete("brand");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const supplierFilters = [
    { label: t("filterVerified"), checked: false },
    { label: t("filter4Star"), checked: false },
  ];

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
      {/* Mobile overlay */}
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
          {/* Mobile header */}
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

          {/* Categories */}
          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              {t("categoryHeading")}
            </h4>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const isActive = (cat.slug ?? null) === activeCategorySlug;
                const count = cat.slug
                  ? categoryCountBySlug.get(cat.slug) ?? 0
                  : totalCategoryCount;
                const subs = cat.slug ? subcategoriesByParent[cat.slug] ?? [] : [];
                const isExpanded = !!cat.slug && expandedCategories.has(cat.slug);
                return (
                  <div key={cat.key}>
                    <div
                      className={`flex items-center rounded-lg transition-colors ${
                        isActive
                          ? "bg-[var(--amber)]/8 text-[var(--amber-dark)] font-semibold"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <Link
                        href={buildHref(cat.slug)}
                        onClick={onClose}
                        scroll={false}
                        className="flex-1 flex items-center justify-between px-3 py-2.5 text-sm min-w-0"
                      >
                        <span className="truncate">{t(cat.key)}</span>
                        <span className="text-xs text-[var(--text-tertiary)] ml-2 shrink-0">{count}</span>
                      </Link>
                      {subs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(cat.slug as string)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                          className="shrink-0 p-2.5 mr-1 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-tertiary)]"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}
                    </div>

                    {isExpanded && subs.length > 0 && (
                      <div className="ml-3 pl-3 border-l border-[var(--border-subtle)] space-y-0.5 mt-0.5 mb-1">
                        {subs.map((sub) => {
                          const subLabel =
                            locale === "zh" && sub.nameLocal ? sub.nameLocal : sub.name;
                          const subActive =
                            cat.slug === activeCategorySlug && sub.slug === activeSubSlug;
                          return (
                            <Link
                              key={sub.id}
                              href={buildSubHref(cat.slug as string, sub.slug)}
                              onClick={onClose}
                              scroll={false}
                              className={`block px-3 py-1.5 text-[13px] rounded-lg transition-colors truncate ${
                                subActive
                                  ? "text-[var(--amber-dark)] font-semibold"
                                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                              }`}
                            >
                              {subLabel}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Region */}
          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              {t("supplierRegionHeading")}
            </h4>
            <div className="space-y-1">
              <Link
                href={countryHrefFor(null)}
                onClick={onClose}
                scroll={false}
                className={`flex items-center justify-between w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  !activeCountry
                    ? "bg-[var(--amber)]/8 text-[var(--amber-dark)] font-semibold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{t("countryAll")}</span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {MARKETPLACE_COUNTRIES.reduce((sum, code) => sum + (countryFacets[code] ?? 0), 0)}
                </span>
              </Link>
              {MARKETPLACE_COUNTRIES.map((code) => {
                const meta = regionMeta(code);
                const isActive = code === activeCountry;
                return (
                  <Link
                    key={code}
                    href={countryHrefFor(code)}
                    onClick={onClose}
                    scroll={false}
                    className={`flex items-center justify-between w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "bg-[var(--amber)]/8 text-[var(--amber-dark)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="text-sm leading-none">{meta.flag}</span>
                      {meta.label}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">{countryFacets[code] ?? 0}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Price range */}
          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              {t("priceHeading")}
            </h4>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder={t("priceMin")}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-secondary)] outline-none focus:border-[var(--amber)] transition-colors"
              />
              <span className="text-[var(--text-tertiary)]">&mdash;</span>
              <input
                type="text"
                placeholder={t("priceMax")}
                className="w-full px-3 py-2.5 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-secondary)] outline-none focus:border-[var(--amber)] transition-colors"
              />
            </div>
          </div>

          {/* Brand */}
          {sortedBrands.length > 0 && (
            <div className="mb-8">
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
                {t("brandHeading")}
              </h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {sortedBrands.map(([brand, count]) => {
                  const checked = activeBrands.has(brand);
                  return (
                    <Link
                      key={brand}
                      href={buildBrandHref(brand)}
                      scroll={false}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          checked ? "border-[var(--amber)]" : "border-[var(--border-strong)]"
                        }`}
                      >
                        {checked && <div className="w-2.5 h-2.5 rounded-sm bg-[var(--amber)]" />}
                      </div>
                      <span className="flex-1 truncate">{brand}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">{count}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Supplier filters */}
          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              {t("supplierHeading")}
            </h4>
            <div className="space-y-2">
              {supplierFilters.map((filter) => (
                <label
                  key={filter.label}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-[var(--border-strong)] flex items-center justify-center">
                    {filter.checked && (
                      <div className="w-2.5 h-2.5 rounded-sm bg-[var(--amber)]" />
                    )}
                  </div>
                  {filter.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   PRODUCT CARD
   ============================================================ */
function ProductCard({ product }: { product: MarketplaceProduct }) {
  const region = regionMeta(product.originCountry);
  const trade = tradeMeta(product.tradeTerm);
  const isRealImage =
    product.image.startsWith("http://") ||
    product.image.startsWith("https://") ||
    product.image.startsWith("/");

  return (
    <Link
      href={`/marketplace/${product.id}`}
      className="group card-elevated flex sm:block overflow-hidden"
    >
      {/* Image area */}
      <div
        className={`relative w-32 shrink-0 self-stretch sm:self-auto sm:w-auto sm:h-52 overflow-hidden ${
          isRealImage
            ? "bg-[var(--surface-secondary)]"
            : `bg-gradient-to-br ${product.image}`
        }`}
      >
        {isRealImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        )}

        {/* Tags */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1 sm:gap-1.5 z-10">
          {product.tags.map((tag) => (
            <span
              key={tag}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold rounded-full ${
                tag === "Hot Sale"
                  ? "bg-[var(--terracotta)]/15 text-[var(--terracotta)] border border-[var(--terracotta)]/20"
                  : tag === "Best Seller"
                  ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border border-[var(--amber)]/20"
                  : "bg-[var(--indigo)]/15 text-[var(--indigo)] border border-[var(--indigo)]/20"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Wishlist — desktop only */}
        <button
          className="hidden sm:flex absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 z-10"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>

        {/* Placeholder only when there's no real image */}
        {!isRealImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-10 h-10 sm:w-16 sm:h-16 text-[var(--text-primary)] opacity-[0.06]" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 p-3 sm:p-5 flex flex-col">
        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-1 sm:mb-2">
          <span
            className="text-base sm:text-xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatPrice(product.price)}
          </span>
          <span className="text-[10px] sm:text-xs text-[var(--text-tertiary)]">
            / {product.unit}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[13px] sm:text-sm font-medium text-[var(--text-primary)] leading-snug line-clamp-2 mb-2 sm:mb-3 group-hover:text-[var(--amber-dark)] transition-colors">
          {product.name}
        </h3>

        {(product.variantCount ?? 0) > 1 && (
          <span className="inline-flex w-fit items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-[var(--text-secondary)] mb-2 sm:mb-3">
            {product.variantCount} sizes
          </span>
        )}

        {/* MOQ / minimum order amount */}
        <div className="text-[11px] sm:text-xs text-[var(--text-tertiary)] mb-2 sm:mb-4">
          {product.minOrderAmount ? (
            product.minOrderGroupedBy === "shipping_group" ? (
              <Tooltip content="This minimum is combined across every product you order from this region's suppliers — not per item.">
                <span tabIndex={0} className="cursor-help">
                  Min. order: USD {product.minOrderAmount.toLocaleString()} (region combined)
                </span>
              </Tooltip>
            ) : (
              <span>Min. order: USD {product.minOrderAmount.toLocaleString()}</span>
            )
          ) : (
            <span>MOQ: {product.moq.toLocaleString()} {product.unit}</span>
          )}
        </div>

        {/* Origin + shipping label */}
        <div className="mt-auto pt-2 sm:pt-4 border-t border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip content="Region of origin — where this product is manufactured or sourced.">
              <span
                tabIndex={0}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] cursor-help"
              >
                <span aria-hidden className="text-sm leading-none">{region.flag}</span>
                {region.label}
              </span>
            </Tooltip>

            {trade && (
              <Tooltip content={trade.tooltip}>
                <span
                  tabIndex={0}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold cursor-help ${trade.bg} ${trade.fg} ${trade.border}`}
                >
                  <Truck className="w-3 h-3" aria-hidden />
                  {trade.short}
                </span>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-[var(--amber)] fill-[var(--amber)]" />
              {product.rating}
              <span className="text-[var(--text-tertiary)]">
                ({product.reviews})
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {product.leadTimeDays ? `${product.leadTimeDays} days` : product.responseTime}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export function MarketplaceClient({
  initialProducts,
  subcategories = [],
  countryFacets = {},
  brandFacets = {},
  topCategories = [],
  subcategoriesByParent = {},
  totalProductCount,
}: {
  initialProducts?: MarketplaceProduct[];
  subcategories?: MarketplaceSubcategory[];
  countryFacets?: Record<string, number>;
  brandFacets?: Record<string, number>;
  topCategories?: MarketplaceTopCategory[];
  subcategoriesByParent?: Record<string, MarketplaceSubcategory[]>;
  totalProductCount?: number;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("marketing.marketplace");
  const allProducts = initialProducts && initialProducts.length > 0 ? initialProducts : PRODUCTS;

  const categorySlug = searchParams.get("category");
  const subSlug = searchParams.get("sub");
  const countryParam = searchParams.get("country");
  const activeCountry = MARKETPLACE_COUNTRIES.find((c) => c === countryParam) ?? null;
  const activeCategory = CATEGORIES.find((c) => c.slug === categorySlug) ?? null;
  const activeCategoryLabel = activeCategory ? t(activeCategory.key) : "";
  const totalCountryCount = MARKETPLACE_COUNTRIES.reduce(
    (sum, code) => sum + (countryFacets[code] ?? 0),
    0
  );

  const countryHrefFor = (code: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (code) params.set("country", code);
    else params.delete("country");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const requestedPageSize = Number(searchParams.get("limit"));
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(requestedPageSize)
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;

  const handlePageSizeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === String(DEFAULT_PAGE_SIZE)) params.delete("limit");
    else params.set("limit", e.target.value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const displayProducts = useMemo(() => {
    // Server already filtered by category/country for real DB products — only re-filter mock fallback
    const usingMock = !initialProducts || initialProducts.length === 0;
    if (!usingMock) return allProducts;
    return allProducts.filter((p) => {
      const matchesCategory =
        !activeCategory || !activeCategory.matchLabel || activeCategory.slug === null
          ? true
          : p.category === activeCategory.matchLabel;
      const matchesCountry = !activeCountry || p.originCountry === activeCountry;
      return matchesCategory && matchesCountry;
    });
  }, [allProducts, activeCategory, activeCountry, initialProducts]);

  // Real filtered total from the server when available (matches the sidebar's
  // category counts); falls back to the visible list length only when running
  // on mock data (totalProductCount is undefined in that case).
  const productCountForDisplay = totalProductCount ?? displayProducts.length;

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
        {/* Country bar */}
        <div className="bg-[var(--obsidian)] border-b border-[var(--border-subtle)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="shrink-0 text-xs font-semibold text-white/50 tracking-[0.1em] uppercase mr-1">
              {t("countryHeading")}
            </span>
            <Link
              href={countryHrefFor(null)}
              scroll={false}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                !activeCountry
                  ? "bg-[var(--amber)] text-[var(--obsidian)]"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {t("countryAll")}
              <span className="text-xs opacity-70">({totalCountryCount})</span>
            </Link>
            {REGION_BAR_ORDER.map((code) => {
              const meta = regionMeta(code);
              const active = code === activeCountry;
              return (
                <Link
                  key={code}
                  href={countryHrefFor(code)}
                  scroll={false}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--amber)] text-[var(--obsidian)]"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span aria-hidden className="text-sm leading-none">
                    {meta.flag}
                  </span>
                  {meta.label}
                  <span className="text-xs opacity-70">({countryFacets[code] ?? 0})</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Hero bar */}
        <div className="bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
            <h1
              className="text-2xl lg:text-3xl font-bold text-[var(--obsidian)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {activeCategory && activeCategory.slug
                ? activeCategoryLabel
                : t("title")}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {activeCategory && activeCategory.slug
                ? t("productCount", {
                    count: productCountForDisplay,
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--amber)]/12 border border-[var(--amber)]/25 text-[var(--amber-dark)]">
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
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <FilterSidebar
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              activeCategorySlug={categorySlug}
              activeSubSlug={subSlug}
              topCategories={topCategories}
              subcategoriesByParent={subcategoriesByParent}
              brandFacets={brandFacets}
              countryFacets={countryFacets}
              activeCountry={activeCountry}
              countryHrefFor={countryHrefFor}
            />

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {categorySlug && subcategories.length > 0 && (
                <SubcategoryGrid
                  subcategories={subcategories}
                  activeCategorySlug={categorySlug}
                  activeSubSlug={subSlug}
                />
              )}
              {!categorySlug && topCategories.length > 0 && (
                <TopCategoryTicker topCategories={topCategories} />
              )}
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFilterOpen(true)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {t("filtersHeading")}
                  </button>
                  <span className="text-sm text-[var(--text-tertiary)]">
                    {t("productsFound", { count: productCountForDisplay })}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-primary)]">
                    <span className="text-[var(--text-tertiary)] text-xs">
                      {t("sortLabel")}
                    </span>
                    <select className="bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer">
                      <option>{t("sortBestMatch")}</option>
                      <option>{t("sortPriceLowHigh")}</option>
                      <option>{t("sortPriceHighLow")}</option>
                      <option>{t("sortNewest")}</option>
                      <option>{t("sortMostPopular")}</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
                  </div>

                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-primary)]">
                    <span className="text-[var(--text-tertiary)] text-xs">
                      {t("perPageLabel")}
                    </span>
                    <select
                      value={pageSize}
                      onChange={handlePageSizeChange}
                      className="bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
                  </div>

                  <div className="flex items-center border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--surface-primary)]">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2.5 transition-colors ${
                        viewMode === "grid"
                          ? "bg-[var(--amber)]/10 text-[var(--amber-dark)]"
                          : "text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)]"
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2.5 transition-colors ${
                        viewMode === "list"
                          ? "bg-[var(--amber)]/10 text-[var(--amber-dark)]"
                          : "text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)]"
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Product grid */}
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                    : "flex flex-col gap-4"
                }
              >
                {displayProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-10 flex items-center justify-center gap-2">
                {[1, 2, 3, "...", 24].map((page, i) => (
                  <button
                    key={i}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      page === 1
                        ? "bg-[var(--amber)] text-[var(--obsidian)]"
                        : page === "..."
                        ? "text-[var(--text-tertiary)] cursor-default"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] border border-[var(--border-subtle)]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
