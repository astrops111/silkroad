"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Tooltip } from "@/components/ui/tooltip";
import { imageForSlug } from "@/lib/category-images";
import { useSavedStore } from "@/stores/saved";
import { useCartStore } from "@/stores/cart";
import { regionMeta, tradeMeta } from "@/lib/product-labels";
import { MARKETPLACE_COUNTRIES } from "@/lib/countries";
import { useRegion } from "@/lib/providers/region-provider";
import { convertSync } from "@/lib/currency/formatter";
import { getSupportedCurrencies } from "@/lib/currency/converter";
import { applyMarkup } from "@/lib/pricing";
import type { RegionPoolingRule, ShippingGroupFacet, UseCaseFacet } from "@/lib/queries/marketplace";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  SlidersHorizontal,
  Grid3X3,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Heart,
  X,
  Package,
  Truck,
  Info,
  ShoppingCart,
  Check,
  Sparkles,
  Loader2,
} from "lucide-react";

export interface MarketplaceSubcategory {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  productCount: number;
}

export interface MarketplaceTopCategory {
  slug: string;
  name: string;
  nameLocal: string | null;
  productCount: number;
}

export interface MarketplaceProduct {
  id: string;
  /** Canonical SEO URL for the product, built server-side. Falls back to the
   *  id URL (mock data), which 301-redirects to the canonical path. */
  href?: string;
  supplierId?: string;
  supplierName?: string;
  currency?: string;
  name: string;
  originCountry: string | null;
  tradeTerm: string | null;
  price: number;
  moq: number;
  unit: string;
  /** Pieces per box/carton — only set when the supplier sells by the box. */
  boxPackQty?: number;
  /** Marked-up price per individual piece, regardless of box packaging. */
  unitPrice?: number;
  /** Real review data only — omitted until the product has reviews. */
  rating?: number;
  reviews?: number;
  responseTime?: string;
  image: string;
  category: string;
  tags: string[];
  leadTimeDays?: number | null;
  minOrderAmount?: number | null;
  minOrderGroupedBy?: string | null;
  /** 'supplier'|'supplier_group' = one MOA across the supplier's listing;
   *  'country'|'custom' = groupage combined across suppliers. */
  poolingType?: string | null;
  /** Group-level combined minimum (USD dollars), when the group defines one. */
  groupMinOrderAmount?: number | null;
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
const SORT_OPTIONS = ["name", "price_asc", "price_desc", "newest", "popular"] as const;
const DEFAULT_SORT = "name";

/* ============================================================
   SUBCATEGORY TICKER — auto-scrolling, seamless loop, pause on hover
   ============================================================ */
function SubcategoryGrid({
  subcategories: allSubcategories,
  activeCategorySlug,
  activeSubSlug,
}: {
  subcategories: MarketplaceSubcategory[];
  activeCategorySlug: string;
  activeSubSlug: string | null;
}) {
  // Hide subcategories with no matching listings — unless it's the one
  // currently selected, so the active filter never silently disappears.
  const subcategories = allSubcategories.filter(
    (s) => s.productCount > 0 || s.slug === activeSubSlug
  );
  const locale = useLocale();
  const t = useTranslations("marketing.marketplace");
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
        scroll={false} prefetch={false}
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
          <p className="text-[10px] text-white/70 mt-0.5">
            {t("productsCount", { count: sub.productCount })}
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
        scroll={false} prefetch={false}
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

function formatCompactAmount(amount: number) {
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`;
  return amount.toFixed(amount < 10 ? 2 : 0);
}

function formatPrice(price: number) {
  return `$${formatCompactAmount(price)}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  getSupportedCurrencies().map((c) => [c.code, c.symbol])
);

/** Converted-currency label shown beside the USD price, e.g. "≈ ¥8,660 CNY". Null when the buyer's selected currency is USD. */
function formatPriceConversion(usdAmount: number, displayCurrency: string): string | null {
  if (displayCurrency === "USD") return null;
  const converted = convertSync(usdAmount, "USD", displayCurrency);
  const symbol = CURRENCY_SYMBOLS[displayCurrency] ?? "";
  return `≈ ${symbol}${formatCompactAmount(converted)} ${displayCurrency} (estimated conversion)`;
}

/* ============================================================
   FILTER SIDEBAR
   ============================================================ */
function FilterSidebar({
  open,
  onClose,
  activeCategorySlug,
  activeSubSlug,
  categoryFacetCounts = {},
  subcategoriesByParent,
  leavesByParent = {},
  brandFacets,
  useFacets = [],
  countryFacets,
  activeCountry,
  countryHrefFor,
  groupFacets = {},
  activeGroupId = null,
  groupHrefFor,
}: {
  open: boolean;
  onClose: () => void;
  activeCategorySlug: string | null;
  activeSubSlug: string | null;
  /** Per-slug counts scoped to the active region/brand/use filters — drives
   *  the Categories list here. Distinct from the ticker's `topCategories`,
   *  which stays unscoped (see marketplace/page.tsx). */
  categoryFacetCounts?: Record<string, number>;
  subcategoriesByParent: Record<string, MarketplaceSubcategory[]>;
  leavesByParent?: Record<string, MarketplaceSubcategory[]>;
  brandFacets: Record<string, number>;
  useFacets?: UseCaseFacet[];
  countryFacets: Record<string, number>;
  activeCountry: (typeof MARKETPLACE_COUNTRIES)[number] | null;
  countryHrefFor: (code: string | null) => string;
  groupFacets?: Record<string, ShippingGroupFacet[]>;
  activeGroupId?: string | null;
  groupHrefFor?: (country: string, groupId: string | null) => string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("marketing.marketplace");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(activeCategorySlug ? [activeCategorySlug] : [])
  );
  // Level-1 subcategories whose leaf children should render expanded —
  // seeded with whichever sub currently owns the active leaf, if any.
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(() => {
    if (!activeSubSlug) return new Set();
    const owner = Object.entries(leavesByParent).find(([, leaves]) =>
      leaves.some((leaf) => leaf.slug === activeSubSlug)
    );
    return new Set(owner ? [owner[0]] : []);
  });

  const toggleExpanded = (slug: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleSubExpanded = (slug: string) => {
    setExpandedSubs((prev) => {
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

  const categoryCountBySlug = new Map(Object.entries(categoryFacetCounts));
  const totalCategoryCount = Object.values(categoryFacetCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const activeBrands = new Set(
    (searchParams.get("brand") ?? "").split(",").filter(Boolean)
  );
  const sortedBrands = Object.entries(brandFacets).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

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

  const activeUses = new Set(
    (searchParams.get("use") ?? "").split(",").filter(Boolean)
  );

  const buildUseHref = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const next = new Set(activeUses);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    if (next.size > 0) params.set("use", Array.from(next).join(","));
    else params.delete("use");
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
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 md:top-[80px] left-0 z-50 md:z-auto
          h-screen md:h-auto w-80 md:w-64 shrink-0
          bg-[var(--surface-primary)] md:bg-transparent
          border-r md:border-r-0 border-[var(--border-subtle)]
          overflow-y-auto
          transition-transform duration-300 md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-6 md:p-0">
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-6 md:hidden">
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
              {CATEGORIES.filter((cat) => {
                if (!cat.slug) return true; // "All Categories" always shown
                if (cat.slug === activeCategorySlug) return true; // never hide the active filter
                return (categoryCountBySlug.get(cat.slug) ?? 0) > 0;
              }).map((cat) => {
                const isActive = (cat.slug ?? null) === activeCategorySlug;
                const count = cat.slug
                  ? categoryCountBySlug.get(cat.slug) ?? 0
                  : totalCategoryCount;
                const subs = (cat.slug ? subcategoriesByParent[cat.slug] ?? [] : []).filter(
                  (s) => s.productCount > 0 || s.slug === activeSubSlug
                );
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
                        scroll={false} prefetch={false}
                        className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm min-w-0"
                      >
                        <span className="w-4 shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{t(cat.key)}</span>
                        <span className="text-xs text-[var(--text-tertiary)] shrink-0">{count}</span>
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
                          const leaves = (leavesByParent[sub.slug] ?? []).filter(
                            (l) => l.productCount > 0 || l.slug === activeSubSlug
                          );
                          const subExpanded = leaves.length > 0 && expandedSubs.has(sub.slug);
                          return (
                            <div key={sub.id}>
                              <div className="flex items-center">
                                <Link
                                  href={buildSubHref(cat.slug as string, sub.slug)}
                                  onClick={onClose}
                                  scroll={false} prefetch={false}
                                  className={`flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] rounded-lg transition-colors ${
                                    subActive
                                      ? "text-[var(--amber-dark)] font-semibold"
                                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                                  }`}
                                >
                                  <span className="truncate">{subLabel}</span>
                                  <span className="text-[11px] text-[var(--text-tertiary)] shrink-0">{sub.productCount}</span>
                                </Link>
                                {leaves.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleSubExpanded(sub.slug)}
                                    aria-expanded={subExpanded}
                                    aria-label={subExpanded ? "Collapse subcategories" : "Expand subcategories"}
                                    className="shrink-0 p-1.5 mr-0.5 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-tertiary)]"
                                  >
                                    <ChevronDown
                                      className={`w-3 h-3 transition-transform ${subExpanded ? "rotate-180" : ""}`}
                                    />
                                  </button>
                                )}
                              </div>
                              {subExpanded && (
                                <div className="ml-3 pl-3 border-l border-[var(--border-subtle)] space-y-0.5 mt-0.5 mb-1">
                                  {leaves.map((leaf) => {
                                    const leafLabel =
                                      locale === "zh" && leaf.nameLocal ? leaf.nameLocal : leaf.name;
                                    const leafActive =
                                      cat.slug === activeCategorySlug && leaf.slug === activeSubSlug;
                                    return (
                                      <Link
                                        key={leaf.id}
                                        href={buildSubHref(cat.slug as string, leaf.slug)}
                                        onClick={onClose}
                                        scroll={false} prefetch={false}
                                        className={`flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] rounded-lg transition-colors ${
                                          leafActive
                                            ? "text-[var(--amber-dark)] font-semibold"
                                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                                        }`}
                                      >
                                        <span className="truncate">{leafLabel}</span>
                                        <span className="text-[11px] text-[var(--text-tertiary)] shrink-0">{leaf.productCount}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
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
                scroll={false} prefetch={false}
                className={`flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  !activeCountry
                    ? "bg-[var(--amber)]/8 text-[var(--amber-dark)] font-semibold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="w-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{t("countryAll")}</span>
                <span className="text-xs text-[var(--text-tertiary)] shrink-0">
                  {MARKETPLACE_COUNTRIES.reduce((sum, code) => sum + (countryFacets[code] ?? 0), 0)}
                </span>
              </Link>
              {MARKETPLACE_COUNTRIES.filter(
                (code) => (countryFacets[code] ?? 0) > 0 || code === activeCountry
              ).map((code) => {
                const meta = regionMeta(code);
                const isActive = code === activeCountry;
                const regionGroups = groupFacets[code] ?? [];
                return (
                  <div key={code}>
                    <Link
                      href={countryHrefFor(code)}
                      onClick={onClose}
                      scroll={false} prefetch={false}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                        isActive
                          ? "bg-[var(--amber)]/8 text-[var(--amber-dark)] font-semibold"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="w-4 shrink-0" aria-hidden />
                      <span className="flex-1 inline-flex items-center gap-1.5 truncate">
                        <span aria-hidden className="text-sm leading-none">{meta.flag}</span>
                        {meta.label}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] shrink-0">{countryFacets[code] ?? 0}</span>
                    </Link>
                    {/* Shipping groups (MOA pools / groupage batches) available in this region */}
                    {regionGroups.length > 0 && groupHrefFor && (
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l border-[var(--border-subtle)] pl-2">
                        {regionGroups.map((g) => {
                          const gActive = g.id === activeGroupId;
                          const isSupplierPool = g.poolingType === "supplier" || g.poolingType === "supplier_group";
                          return (
                            <Link
                              key={g.id}
                              href={groupHrefFor(code, gActive ? null : g.id)}
                              onClick={onClose}
                              scroll={false} prefetch={false}
                              title={
                                g.minAmount != null
                                  ? `${isSupplierPool ? t("moaChipSupplier") : t("moaChipGroupage")} · USD ${g.minAmount.toLocaleString()}`
                                  : isSupplierPool ? t("moaChipSupplier") : t("moaChipGroupage")
                              }
                              className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 text-[13px] rounded-lg transition-colors ${
                                gActive
                                  ? "bg-[var(--amber)]/8 text-[var(--amber-dark)] font-semibold"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                              <span className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                                <Package className="w-3 h-3 shrink-0" aria-hidden />
                                {/* Anonymous region ID, not g.name — long text wraps to a second line */}
                                <span className="line-clamp-2 break-words font-mono text-[12px]">
                                  {groupDisplayLabel(code, g.id)}
                                </span>
                                <span className="shrink-0 rounded-full bg-[var(--amber)]/10 px-1.5 py-px text-[10px] font-medium text-[var(--amber-dark)]">
                                  {isSupplierPool ? t("moaChipSupplier") : t("moaChipGroupage")}
                                </span>
                              </span>
                              <span className="text-xs text-[var(--text-tertiary)]">{g.products}</span>
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
                      scroll={false} prefetch={false}
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

          {/* Use */}
          {useFacets.length > 0 && (
            <div className="mb-8">
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
                {t("useHeading")}
              </h4>
              <div className="space-y-1">
                {useFacets.map(({ slug, name, count }) => {
                  const checked = activeUses.has(slug);
                  return (
                    <Link
                      key={slug}
                      href={buildUseHref(slug)}
                      onClick={onClose}
                      scroll={false} prefetch={false}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          checked ? "border-[var(--amber)]" : "border-[var(--border-strong)]"
                        }`}
                      >
                        {checked && <div className="w-2.5 h-2.5 rounded-sm bg-[var(--amber)]" />}
                      </div>
                      <span className="flex-1 truncate">{name}</span>
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
function ProductCard({
  product,
  viewMode = "grid",
}: {
  product: MarketplaceProduct;
  viewMode?: "grid" | "list";
}) {
  const region = regionMeta(product.originCountry);
  const trade = tradeMeta(product.tradeTerm);
  const isRealImage =
    product.image.startsWith("http://") ||
    product.image.startsWith("https://") ||
    product.image.startsWith("/");
  const isList = viewMode === "list";
  const displayCurrency = useRegion().currency;
  const priceConversion = formatPriceConversion(product.price, displayCurrency);
  const addSaved = useSavedStore((s) => s.addItem);
  const removeSaved = useSavedStore((s) => s.removeItem);
  const isSaved = useSavedStore((s) => s.isSaved(product.id));
  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const [justAdded, setJustAdded] = useState(false);
  const [similarOpen, setSimilarOpen] = useState(false);

  function handleToggleSaved(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isSaved) {
      removeSaved(product.id);
    } else {
      addSaved({
        productId: product.id,
        productName: product.name,
        supplierId: product.supplierId ?? "",
        supplierName: product.supplierName ?? "",
        imageUrl: isRealImage ? product.image : null,
        basePrice: product.price,
        currency: product.currency ?? "USD",
      });
    }
  }

  function handleAddToCart(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      productId: product.id,
      supplierId: product.supplierId ?? "",
      supplierName: product.supplierName ?? "",
      productName: product.name,
      unitPrice: Math.round((product.unitPrice ?? product.price) * 100),
      quantity: product.moq,
      currency: product.currency ?? "USD",
      moq: product.moq,
      boxPackQty: product.boxPackQty && product.boxPackQty > 1 ? product.boxPackQty : undefined,
      imageUrl: isRealImage ? product.image : undefined,
    });
    toast.success("Added to cart");
    openCart();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  function handleOpenSimilar(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSimilarOpen(true);
  }

  return (
    <>
    <Link
      href={product.href ?? `/marketplace/${product.id}`}
      className={`group card-elevated flex overflow-hidden ${isList ? "" : "sm:block"}`}
    >
      {/* Image area */}
      <div
        className={`relative w-32 shrink-0 self-stretch overflow-hidden ${
          isList ? "sm:w-40" : "sm:self-auto sm:w-auto sm:h-52"
        } ${
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
            className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
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
          type="button"
          aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={isSaved}
          className={`hidden sm:flex absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm items-center justify-center transition-all hover:bg-white hover:scale-110 z-10 ${
            isSaved ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={handleToggleSaved}
        >
          <Heart
            className={`w-4 h-4 ${
              isSaved ? "text-[var(--terracotta)] fill-[var(--terracotta)]" : "text-[var(--text-secondary)]"
            }`}
          />
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
        <div className="mb-1 sm:mb-2">
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-base sm:text-xl font-bold text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatPrice(product.price)}
            </span>
            <span className="text-[10px] sm:text-xs font-medium text-[var(--text-tertiary)]">
              USD
            </span>
            <span className="text-[10px] sm:text-xs text-[var(--text-tertiary)]">
              / {product.unit}
            </span>
          </div>
          {priceConversion && (
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-tertiary)]">
              {priceConversion}
            </p>
          )}
        </div>

        {/* Box pack breakdown — pieces per box + per-piece price, mirrors product page */}
        {product.boxPackQty && product.boxPackQty > 1 && product.unitPrice != null && (
          <p className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] mb-1 sm:mb-2">
            {formatPrice(product.unitPrice)} / pc · {product.boxPackQty} pcs per box
          </p>
        )}

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
          {(() => {
            const isSupplierPool =
              product.poolingType === "supplier" || product.poolingType === "supplier_group";
            const isGroupage =
              product.poolingType === "country" || product.poolingType === "custom";
            // The minimum shown: the product's own, else the group's combined one.
            const minAmount = product.minOrderAmount ?? product.groupMinOrderAmount;

            if (minAmount && (product.minOrderGroupedBy === "shipping_group" || isSupplierPool || isGroupage)) {
              const label = isSupplierPool ? "supplier combined" : "group combined";
              const tooltip = isSupplierPool
                ? "One combined minimum across this supplier's products — mix any of their items to reach it."
                : "This minimum is combined across every product you order from this region's suppliers — not per item.";
              return (
                <Tooltip content={tooltip}>
                  <span tabIndex={0} className="cursor-help">
                    Min. order: USD {minAmount.toLocaleString()} ({label})
                  </span>
                </Tooltip>
              );
            }
            if (product.minOrderAmount) {
              return <span>Min. order: USD {product.minOrderAmount.toLocaleString()}</span>;
            }
            return <span>MOQ: {product.moq.toLocaleString()} {product.unit}</span>;
          })()}
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
            {product.rating != null && (product.reviews ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-[var(--amber)] fill-[var(--amber)]" />
                {product.rating}
                <span className="text-[var(--text-tertiary)]">
                  ({product.reviews})
                </span>
              </span>
            )}
            {(product.leadTimeDays || product.responseTime) && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {product.leadTimeDays ? `${product.leadTimeDays} days` : product.responseTime}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] sm:text-[13px] font-semibold transition-colors ${
              justAdded
                ? "bg-[var(--forest,#2f6b4f)] text-white"
                : "bg-[var(--amber)] text-[var(--obsidian)] hover:bg-[var(--amber-dark)] hover:text-white"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Added
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                Add to Cart
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleOpenSimilar}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-[11px] sm:text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--amber)]/50 hover:text-[var(--text-primary)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Similar
          </button>
        </div>
      </div>
    </Link>
    <SimilarItemsDialog
      open={similarOpen}
      onOpenChange={setSimilarOpen}
      productId={product.id}
      productName={product.name}
    />
    </>
  );
}

/* ============================================================
   SIMILAR ITEMS DIALOG — lazy-loads AI-powered "similar products"
   for a single card only when opened, via the existing
   /api/ai/recommendations endpoint. Not fetched eagerly per-card
   so a grid of 50-200 listings never fires a burst of requests.
   ============================================================ */
interface SimilarProduct {
  product_id: string;
  reason: string;
  name: string;
  base_price: number;
  currency: string | null;
  moq: number | null;
}

function SimilarItemsDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}) {
  const [items, setItems] = useState<SimilarProduct[] | null>(null);
  const [errored, setErrored] = useState(false);
  const fetchingRef = useRef(false);
  const loading = open && items === null && !errored;

  useEffect(() => {
    if (!open || items !== null || fetchingRef.current) return;
    fetchingRef.current = true;
    let cancelled = false;
    fetch(`/api/ai/recommendations?productId=${encodeURIComponent(productId)}&limit=6`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!cancelled) setItems(data?.recommendations ?? []);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      })
      .finally(() => {
        fetchingRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [open, productId, items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Similar items</DialogTitle>
          <DialogDescription className="line-clamp-1">
            Buyers who viewed &ldquo;{productName}&rdquo; also considered
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-tertiary)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding similar items…
          </div>
        )}

        {!loading && (errored || items?.length === 0) && (
          <p className="py-6 text-center text-sm text-[var(--text-tertiary)]">
            No similar items found right now.
          </p>
        )}

        {!loading && items && items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {items.map((item) => (
              <Link
                key={item.product_id}
                href={`/marketplace/${item.product_id}`}
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-[var(--border-subtle)] p-3 transition-colors hover:border-[var(--amber)]/50 hover:bg-[var(--surface-secondary)]"
              >
                <div className="w-full h-16 rounded-md mb-2 flex items-center justify-center bg-[var(--surface-secondary)]">
                  <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <p className="text-xs font-medium leading-snug line-clamp-2 text-[var(--text-primary)]">
                  {item.name}
                </p>
                <p className="text-xs font-bold mt-1 text-[var(--text-primary)]">
                  {formatPrice(applyMarkup(item.base_price / 100))}
                  {item.moq ? (
                    <span className="font-normal text-[10px] text-[var(--text-tertiary)]"> · MOQ {item.moq}</span>
                  ) : null}
                </p>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   SHIPPING GROUP DISPLAY LABEL — buyers see an anonymous region-based
   ID (e.g. "SK-FB96"), never the admin-chosen group name, which could
   hint at the supplier. Prefix is the colloquial region abbreviation;
   suffix is a stable fragment of the group uuid.
   ============================================================ */
const REGION_GROUP_PREFIX: Record<string, string> = {
  KR: "SK", // South Korea
  CN: "CN",
  JP: "JP",
  TW: "TW",
};

function groupDisplayLabel(country: string, groupId: string): string {
  const prefix = REGION_GROUP_PREFIX[country] ?? country;
  return `${prefix}-${groupId.slice(0, 4).toUpperCase()}`;
}

/* ============================================================
   MOA RULES BANNER — always visible; copy adapts to the active region.
   Data-driven from products_pooling_info so it never contradicts the DB.
   ============================================================ */
function MoaBanner({
  rules,
  activeCountry,
}: {
  rules: Record<string, RegionPoolingRule[]>;
  activeCountry: string | null;
}) {
  const t = useTranslations("marketing.marketplace");
  const fmtAmount = (n: number | null) =>
    n != null ? `USD ${n.toLocaleString()}` : t("moaAmountFallback");
  const isSupplierPool = (type: string) => type === "supplier" || type === "supplier_group";
  const regionRules = activeCountry ? rules[activeCountry] ?? [] : [];

  return (
    <div
      role="note"
      className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/8 px-4 py-3"
    >
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-[var(--amber-dark)]" aria-hidden />
      <div className="text-xs sm:text-[13px] leading-relaxed text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">{t("moaBannerTitle")}</span>{" "}
        {activeCountry ? (
          regionRules.length > 0 ? (
            regionRules.map((r) => (
              <span key={r.poolingType}>
                {isSupplierPool(r.poolingType)
                  ? t("moaBannerSupplier", {
                      region: regionMeta(activeCountry).label,
                      amount: fmtAmount(r.minAmount),
                    })
                  : t("moaBannerGroupage", {
                      region: regionMeta(activeCountry).label,
                      amount: fmtAmount(r.minAmount),
                    })}{" "}
              </span>
            ))
          ) : (
            t("moaBannerPerItem", { region: regionMeta(activeCountry).label })
          )
        ) : (
          <>
            {t("moaBannerAll")}
            {Object.keys(rules).length > 0 && (
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {Object.entries(rules).map(([code, rs]) =>
                  rs.map((r) => {
                    const meta = regionMeta(code);
                    return (
                      <span
                        key={`${code}-${r.poolingType}`}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--amber)]/25 bg-[var(--surface-primary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
                      >
                        <span aria-hidden>{meta.flag}</span>
                        {meta.label} · {fmtAmount(r.minAmount)}{" "}
                        {isSupplierPool(r.poolingType) ? t("moaChipSupplier") : t("moaChipGroupage")}
                      </span>
                    );
                  })
                )}
              </span>
            )}
          </>
        )}
      </div>
    </div>
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
  useFacets = [],
  topCategories = [],
  categoryFacetCounts = {},
  subcategoriesByParent = {},
  leavesByParent = {},
  totalProductCount,
  currentPage = 1,
  poolingRules = {},
  groupFacets = {},
  loadFailed = false,
}: {
  initialProducts?: MarketplaceProduct[];
  subcategories?: MarketplaceSubcategory[];
  countryFacets?: Record<string, number>;
  brandFacets?: Record<string, number>;
  useFacets?: UseCaseFacet[];
  /** Ticker's category tiles — deliberately unscoped by filters. */
  topCategories?: MarketplaceTopCategory[];
  /** Sidebar's Categories list counts — scoped to the active filters. */
  categoryFacetCounts?: Record<string, number>;
  subcategoriesByParent?: Record<string, MarketplaceSubcategory[]>;
  leavesByParent?: Record<string, MarketplaceSubcategory[]>;
  totalProductCount?: number;
  currentPage?: number;
  poolingRules?: Record<string, RegionPoolingRule[]>;
  groupFacets?: Record<string, ShippingGroupFacet[]>;
  /** True when the server-side product query threw (DB unreachable). */
  loadFailed?: boolean;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("marketing.marketplace");

  const activeSearch = searchParams.get("q")?.trim() || null;
  const categorySlug = searchParams.get("category");
  const subSlug = searchParams.get("sub");
  const countryParam = searchParams.get("country");
  const activeCountry = MARKETPLACE_COUNTRIES.find((c) => c === countryParam) ?? null;
  const activeGroupId = searchParams.get("group");
  const activeBrandList = (searchParams.get("brand") ?? "").split(",").filter(Boolean);
  const activeUseList = (searchParams.get("use") ?? "").split(",").filter(Boolean);
  const useNameBySlug = new Map(useFacets.map((f) => [f.slug, f.name]));
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
    // A shipping group belongs to one region — switching region clears it.
    params.delete("group");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const groupHrefFor = (country: string, groupId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("country", country);
    if (groupId) params.set("group", groupId);
    else params.delete("group");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const pageHrefFor = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
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

  const requestedSort = searchParams.get("sort");
  const sort = (SORT_OPTIONS as readonly string[]).includes(requestedSort ?? "")
    ? (requestedSort as (typeof SORT_OPTIONS)[number])
    : DEFAULT_SORT;

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === DEFAULT_SORT) params.delete("sort");
    else params.set("sort", e.target.value);
    // A different sort order invalidates the current page position.
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Server already filtered by search/category/country — render as-is.
  const displayProducts = initialProducts ?? [];

  const productCountForDisplay = totalProductCount ?? displayProducts.length;

  const totalPages = Math.max(1, Math.ceil(productCountForDisplay / pageSize));
  // Windowed page list: first, last, current ± 1, with "…" filling gaps —
  // keeps the control usable even when totalPages is in the hundreds.
  const paginationItems = useMemo(() => {
    const items: (number | "...")[] = [];
    const windowStart = Math.max(2, currentPage - 1);
    const windowEnd = Math.min(totalPages - 1, currentPage + 1);
    items.push(1);
    if (windowStart > 2) items.push("...");
    for (let p = windowStart; p <= windowEnd; p++) {
      if (p > 1 && p < totalPages) items.push(p);
    }
    if (windowEnd < totalPages - 1) items.push("...");
    if (totalPages > 1) items.push(totalPages);
    return items;
  }, [currentPage, totalPages]);

  const pushParams = (params: URLSearchParams) => {
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Every remover drops "page" — a changed filter set invalidates the
  // current page position.
  const removeCategoryFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("sub");
    params.delete("page");
    pushParams(params);
  };

  const removeSubFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sub");
    params.delete("page");
    pushParams(params);
  };

  const removeCountryFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("country");
    params.delete("group");
    params.delete("page");
    pushParams(params);
  };

  const removeGroupFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("group");
    params.delete("page");
    pushParams(params);
  };

  const removeBrandFilter = (brand: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const next = activeBrandList.filter((b) => b !== brand);
    if (next.length > 0) params.set("brand", next.join(","));
    else params.delete("brand");
    params.delete("page");
    pushParams(params);
  };

  const removeUseFilter = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const next = activeUseList.filter((u) => u !== slug);
    if (next.length > 0) params.set("use", next.join(","));
    else params.delete("use");
    params.delete("page");
    pushParams(params);
  };

  const removeSearchFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    pushParams(params);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["q", "category", "sub", "country", "group", "brand", "use", "page"]) {
      params.delete(key);
    }
    pushParams(params);
  };

  const hasActiveFilters = Boolean(
    activeSearch ||
      activeCategory?.slug ||
      subSlug ||
      activeCountry ||
      activeGroupId ||
      activeBrandList.length > 0 ||
      activeUseList.length > 0
  );

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
              scroll={false} prefetch={false}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                !activeCountry
                  ? "bg-[var(--amber)] text-[var(--obsidian)]"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {t("countryAll")}
              <span className="text-xs opacity-70">({totalCountryCount})</span>
            </Link>
            {REGION_BAR_ORDER.filter(
              (code) => (countryFacets[code] ?? 0) > 0 || code === activeCountry
            ).map((code) => {
              const meta = regionMeta(code);
              const active = code === activeCountry;
              return (
                <Link
                  key={code}
                  href={countryHrefFor(code)}
                  scroll={false} prefetch={false}
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

            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mr-1">
                  {t("filterChipLabel")}
                </span>
                {activeSearch && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--amber)]/12 border border-[var(--amber)]/25 text-[var(--amber-dark)]">
                    {t("searchChip", { query: activeSearch })}
                    <button
                      type="button"
                      onClick={removeSearchFilter}
                      aria-label={t("searchChipRemove")}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeCategory?.slug && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--amber)]/12 border border-[var(--amber)]/25 text-[var(--amber-dark)]">
                    {activeCategoryLabel}
                    <button
                      type="button"
                      onClick={removeCategoryFilter}
                      aria-label={`Remove ${activeCategoryLabel} filter`}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {subSlug && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    {subSlug.replace(/-/g, " ")}
                    <button
                      type="button"
                      onClick={removeSubFilter}
                      aria-label={`Remove ${subSlug.replace(/-/g, " ")} filter`}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeCountry && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <span aria-hidden className="text-sm leading-none">
                      {regionMeta(activeCountry).flag}
                    </span>
                    {regionMeta(activeCountry).label}
                    <button
                      type="button"
                      onClick={removeCountryFilter}
                      aria-label={`Remove ${regionMeta(activeCountry).label} filter`}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeGroupId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    {t(
                      (activeCountry &&
                        (groupFacets[activeCountry] ?? [])
                          .find((g) => g.id === activeGroupId)
                          ?.poolingType?.startsWith("supplier")) ?
                        "moaChipSupplier"
                      : "moaChipGroupage"
                    )}
                    <button
                      type="button"
                      onClick={removeGroupFilter}
                      aria-label="Remove shipping group filter"
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeBrandList.map((brand) => (
                  <span
                    key={brand}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  >
                    {brand}
                    <button
                      type="button"
                      onClick={() => removeBrandFilter(brand)}
                      aria-label={`Remove ${brand} filter`}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {activeUseList.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  >
                    {useNameBySlug.get(slug) ?? slug.replace(/-/g, " ")}
                    <button
                      type="button"
                      onClick={() => removeUseFilter(slug)}
                      aria-label={`Remove ${useNameBySlug.get(slug) ?? slug} filter`}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
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
          <MoaBanner rules={poolingRules} activeCountry={activeCountry} />
          <div className="flex gap-8">
            {/* Sidebar */}
            <FilterSidebar
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              activeCategorySlug={categorySlug}
              activeSubSlug={subSlug}
              categoryFacetCounts={categoryFacetCounts}
              subcategoriesByParent={subcategoriesByParent}
              leavesByParent={leavesByParent}
              brandFacets={brandFacets}
              useFacets={useFacets}
              countryFacets={countryFacets}
              activeCountry={activeCountry}
              countryHrefFor={countryHrefFor}
              groupFacets={groupFacets}
              activeGroupId={activeGroupId}
              groupHrefFor={groupHrefFor}
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
                    className="md:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
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
                    <select
                      value={sort}
                      onChange={handleSortChange}
                      className="bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer"
                    >
                      <option value="name">{t("sortAlphabetical")}</option>
                      <option value="price_asc">{t("sortPriceLowHigh")}</option>
                      <option value="price_desc">{t("sortPriceHighLow")}</option>
                      <option value="newest">{t("sortNewest")}</option>
                      <option value="popular">{t("sortMostPopular")}</option>
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

              {/* Product grid / empty state. A zero-row page while the server
                  reports matches means ?page= is past the end — offer the way
                  back instead of a misleading "nothing matches". */}
              {displayProducts.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] py-20 px-6 text-center">
                  <p className="text-base font-semibold text-[var(--text-primary)]">
                    {loadFailed ? t("loadErrorTitle") : t("emptyTitle")}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {loadFailed
                      ? t("loadErrorHint")
                      : (totalProductCount ?? 0) > 0
                        ? t("emptyPageHint")
                        : activeSearch
                          ? t("emptySearchHint", { query: activeSearch })
                          : hasActiveFilters
                            ? t("emptyFilteredHint")
                            : t("emptyCatalogHint")}
                  </p>
                  {!loadFailed && (totalProductCount ?? 0) > 0 ? (
                    <Link
                      href={pageHrefFor(1)}
                      className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[var(--amber)] px-4 py-2.5 text-sm font-semibold text-[var(--obsidian)] hover:bg-[var(--amber-dark)] hover:text-white transition-colors"
                    >
                      {t("emptyPageReset")}
                    </Link>
                  ) : !loadFailed && hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[var(--amber)] px-4 py-2.5 text-sm font-semibold text-[var(--obsidian)] hover:bg-[var(--amber-dark)] hover:text-white transition-colors"
                    >
                      {t("emptyClear")}
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                      : "flex flex-col gap-2"
                  }
                >
                  {displayProducts.map((product) => (
                    <ProductCard key={product.id} product={product} viewMode={viewMode} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <Link
                    href={pageHrefFor(currentPage - 1)}
                    aria-disabled={currentPage <= 1}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors border border-[var(--border-subtle)] ${
                      currentPage <= 1
                        ? "pointer-events-none opacity-40 text-[var(--text-tertiary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)]"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                  {paginationItems.map((page, i) => (
                    page === "..." ? (
                      <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-sm text-[var(--text-tertiary)]">
                        …
                      </span>
                    ) : (
                      <Link
                        key={page}
                        href={pageHrefFor(page)}
                        scroll={false}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                          page === currentPage
                            ? "bg-[var(--amber)] text-[var(--obsidian)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] border border-[var(--border-subtle)]"
                        }`}
                      >
                        {page}
                      </Link>
                    )
                  ))}
                  <Link
                    href={pageHrefFor(currentPage + 1)}
                    aria-disabled={currentPage >= totalPages}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors border border-[var(--border-subtle)] ${
                      currentPage >= totalPages
                        ? "pointer-events-none opacity-40 text-[var(--text-tertiary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)]"
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
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
