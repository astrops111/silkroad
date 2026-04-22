"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Tooltip } from "@/components/ui/tooltip";
import { imageForSlug } from "@/lib/category-images";
import { regionMeta, tradeMeta } from "@/lib/product-labels";
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
  tradeAssurance: boolean;
  category: string;
  tags: string[];
}


const CATEGORIES = [
  { slug: null, key: "categoryAll", matchLabel: null },
  { slug: "home", key: "categoryHome", matchLabel: "Home" },
  { slug: "hotels", key: "categoryHotels", matchLabel: "Hotels" },
  { slug: "consumer-electronics", key: "categoryConsumerElectronics", matchLabel: "Consumer Electronics" },
  { slug: "beauty", key: "categoryBeauty", matchLabel: "Beauty" },
  { slug: "groceries", key: "categoryGroceries", matchLabel: "Groceries" },
  { slug: "baby-products", key: "categoryBabyProducts", matchLabel: "Baby Products" },
] as const;

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
    tradeAssurance: true,
    category: "Furniture",
    tags: ["Hot Sale", "Trade Assurance"],
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
    tradeAssurance: true,
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
    tradeAssurance: true,
    category: "Cosmetics",
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
    tradeAssurance: true,
    category: "Hotel Interiors",
    tags: ["Trade Assurance", "Hot Sale"],
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
    tradeAssurance: true,
    category: "Hotel Interiors",
    tags: ["Trade Assurance"],
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
    tradeAssurance: false,
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
    tradeAssurance: true,
    category: "Consumer Electronics",
    tags: ["Best Seller", "Trade Assurance"],
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
    tradeAssurance: true,
    category: "Baby Products",
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
}: {
  open: boolean;
  onClose: () => void;
  activeCategorySlug: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("marketing.marketplace");

  const moqRanges = [
    { key: "any", label: t("moqAny") },
    { key: "1-10", label: t("moqUnits", { range: "1-10" }) },
    { key: "10-100", label: t("moqUnits", { range: "10-100" }) },
    { key: "100-500", label: t("moqUnits", { range: "100-500" }) },
    { key: "500+", label: t("moqUnits", { range: "500+" }) },
  ];

  const supplierFilters = [
    { label: t("filterVerified"), checked: false },
    { label: t("filterTradeAssurance"), checked: true },
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
                return (
                  <Link
                    key={cat.key}
                    href={buildHref(cat.slug)}
                    onClick={onClose}
                    scroll={false}
                    className={`block w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "bg-[var(--amber)]/8 text-[var(--amber-dark)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {t(cat.key)}
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

          {/* MOQ range */}
          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              {t("moqHeading")}
            </h4>
            <div className="space-y-2">
              {moqRanges.map((range) => (
                <label
                  key={range.key}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-[var(--border-strong)] flex items-center justify-center">
                    {range.key === "any" && (
                      <div className="w-2.5 h-2.5 rounded-sm bg-[var(--amber)]" />
                    )}
                  </div>
                  {range.label}
                </label>
              ))}
            </div>
          </div>

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

          {/* Supplier location */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              {t("supplierRegionHeading")}
            </h4>
            <div className="space-y-2">
              {[
                "Guangdong",
                "Zhejiang",
                "Fujian",
                "Jiangsu",
                "Shandong",
              ].map((region) => (
                <label
                  key={region}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-[var(--border-strong)]" />
                  {region}
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
                tag === "Trade Assurance"
                  ? "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/20"
                  : tag === "Hot Sale"
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

        {/* MOQ */}
        <div className="text-[11px] sm:text-xs text-[var(--text-tertiary)] mb-2 sm:mb-4">
          MOQ: {product.moq} {product.unit}
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
              {product.responseTime}
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
}: {
  initialProducts?: MarketplaceProduct[];
  subcategories?: MarketplaceSubcategory[];
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
  const activeCategory = CATEGORIES.find((c) => c.slug === categorySlug) ?? null;
  const activeCategoryLabel = activeCategory ? t(activeCategory.key) : "";

  const displayProducts = useMemo(() => {
    if (!activeCategory || !activeCategory.matchLabel || activeCategory.slug === null) {
      return allProducts;
    }
    return allProducts.filter((p) => p.category === activeCategory.matchLabel);
  }, [allProducts, activeCategory]);

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
                    count: displayProducts.length,
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
                    {t("productsFound", { count: displayProducts.length })}
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
