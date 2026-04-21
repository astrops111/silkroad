"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  ChevronDown,
  Star,
  Shield,
  MapPin,
  Clock,
  Heart,
  ArrowUpRight,
  X,
  Package,
  CheckCircle2,
} from "lucide-react";

export interface MarketplaceProduct {
  id: string;
  name: string;
  supplier: string;
  supplierVerified: boolean;
  supplierCountry: string;
  supplierProvince: string;
  price: number;
  priceMax: number;
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
  { slug: null, label: "All Categories" },
  { slug: "electronics", label: "Electronics & Components" },
  { slug: "machinery", label: "Machinery & Equipment" },
  { slug: "textiles", label: "Textiles & Apparel" },
  { slug: "construction", label: "Construction Materials" },
  { slug: "auto", label: "Auto Parts & Accessories" },
  { slug: "home", label: "Home & Garden" },
  { slug: "beauty", label: "Health & Beauty" },
  { slug: "food", label: "Food & Agriculture" },
] as const;

const PRODUCTS = [
  {
    id: "1",
    name: "Industrial CNC Laser Cutting Machine 3000W Fiber Laser",
    supplier: "Guangzhou HuaNan Precision Machinery Co.",
    supplierVerified: true,
    supplierCountry: "CN",
    supplierProvince: "Guangdong",
    price: 8500,
    priceMax: 12000,
    moq: 1,
    unit: "Set",
    rating: 4.8,
    reviews: 142,
    responseTime: "< 24h",
    image: "from-slate-200 to-slate-300",
    tradeAssurance: true,
    category: "Machinery & Equipment",
    tags: ["Hot Sale", "Trade Assurance"],
  },
  {
    id: "2",
    name: "5G Android Smartphone 6.7\" AMOLED 256GB OEM Manufacturer",
    supplier: "Shenzhen DigiTech Electronics Ltd.",
    supplierVerified: true,
    supplierCountry: "CN",
    supplierProvince: "Guangdong",
    price: 85,
    priceMax: 120,
    moq: 100,
    unit: "Pieces",
    rating: 4.6,
    reviews: 891,
    responseTime: "< 2h",
    image: "from-indigo-100 to-blue-200",
    tradeAssurance: true,
    category: "Electronics & Components",
    tags: ["Best Seller"],
  },
  {
    id: "3",
    name: "Premium Organic Cotton T-Shirts Bulk Custom Logo Printing",
    supplier: "Zhejiang Silk Valley Textiles Inc.",
    supplierVerified: true,
    supplierCountry: "CN",
    supplierProvince: "Zhejiang",
    price: 2.8,
    priceMax: 5.5,
    moq: 500,
    unit: "Pieces",
    rating: 4.9,
    reviews: 2340,
    responseTime: "< 4h",
    image: "from-amber-50 to-orange-100",
    tradeAssurance: true,
    category: "Textiles & Apparel",
    tags: ["Top Rated"],
  },
  {
    id: "4",
    name: "Solar Panel 550W Monocrystalline PV Module Tier 1",
    supplier: "Jiangsu SunPower Energy Tech Co.",
    supplierVerified: true,
    supplierCountry: "CN",
    supplierProvince: "Jiangsu",
    price: 110,
    priceMax: 145,
    moq: 20,
    unit: "Pieces",
    rating: 4.7,
    reviews: 567,
    responseTime: "< 6h",
    image: "from-sky-100 to-cyan-200",
    tradeAssurance: true,
    category: "Electronics & Components",
    tags: ["Trade Assurance", "Hot Sale"],
  },
  {
    id: "5",
    name: "Hydraulic Excavator 21-Ton Crawler Heavy Equipment",
    supplier: "Shandong HeavyBuild Machinery Co.",
    supplierVerified: true,
    supplierCountry: "CN",
    supplierProvince: "Shandong",
    price: 42000,
    priceMax: 58000,
    moq: 1,
    unit: "Unit",
    rating: 4.5,
    reviews: 89,
    responseTime: "< 12h",
    image: "from-yellow-100 to-amber-200",
    tradeAssurance: true,
    category: "Machinery & Equipment",
    tags: ["Trade Assurance"],
  },
  {
    id: "6",
    name: "Portland Cement 42.5R Grade Bulk Supply 25kg Bags",
    supplier: "Fujian BuildRight Materials Corp.",
    supplierVerified: false,
    supplierCountry: "CN",
    supplierProvince: "Fujian",
    price: 3.2,
    priceMax: 4.8,
    moq: 1000,
    unit: "Bags",
    rating: 4.3,
    reviews: 234,
    responseTime: "< 8h",
    image: "from-stone-100 to-neutral-200",
    tradeAssurance: false,
    category: "Construction Materials",
    tags: [],
  },
  {
    id: "7",
    name: "LED Street Light 200W IP66 Waterproof Solar Powered",
    supplier: "Shenzhen BrightPath Lighting Co.",
    supplierVerified: true,
    supplierCountry: "CN",
    supplierProvince: "Guangdong",
    price: 45,
    priceMax: 68,
    moq: 50,
    unit: "Pieces",
    rating: 4.8,
    reviews: 1205,
    responseTime: "< 3h",
    image: "from-emerald-50 to-green-100",
    tradeAssurance: true,
    category: "Electronics & Components",
    tags: ["Best Seller", "Trade Assurance"],
  },
  {
    id: "8",
    name: "Commercial Rice Milling Machine 2TPH Complete Set",
    supplier: "Hunan AgroTech Equipment Co.",
    supplierVerified: true,
    supplierCountry: "CN",
    supplierProvince: "Hunan",
    price: 6800,
    priceMax: 9500,
    moq: 1,
    unit: "Set",
    rating: 4.6,
    reviews: 178,
    responseTime: "< 6h",
    image: "from-lime-50 to-green-100",
    tradeAssurance: true,
    category: "Machinery & Equipment",
    tags: ["Hot Sale"],
  },
];

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
              Filters
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
              Category
            </h4>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const isActive = (cat.slug ?? null) === activeCategorySlug;
                return (
                  <Link
                    key={cat.label}
                    href={buildHref(cat.slug)}
                    onClick={onClose}
                    scroll={false}
                    className={`block w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "bg-[var(--amber)]/8 text-[var(--amber-dark)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {cat.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Price range */}
          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              Price Range (USD)
            </h4>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Min"
                className="w-full px-3 py-2.5 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-secondary)] outline-none focus:border-[var(--amber)] transition-colors"
              />
              <span className="text-[var(--text-tertiary)]">&mdash;</span>
              <input
                type="text"
                placeholder="Max"
                className="w-full px-3 py-2.5 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-secondary)] outline-none focus:border-[var(--amber)] transition-colors"
              />
            </div>
          </div>

          {/* MOQ range */}
          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              Minimum Order
            </h4>
            <div className="space-y-2">
              {["Any", "1-10", "10-100", "100-500", "500+"].map((range) => (
                <label
                  key={range}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-[var(--border-strong)] flex items-center justify-center">
                    {range === "Any" && (
                      <div className="w-2.5 h-2.5 rounded-sm bg-[var(--amber)]" />
                    )}
                  </div>
                  {range} units
                </label>
              ))}
            </div>
          </div>

          {/* Supplier filters */}
          <div className="mb-8">
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-4">
              Supplier
            </h4>
            <div className="space-y-2">
              {[
                { label: "Verified Only", checked: false },
                { label: "Trade Assurance", checked: true },
                { label: "4+ Star Rating", checked: false },
              ].map((filter) => (
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
              Supplier Region
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
function ProductCard({ product }: { product: (typeof PRODUCTS)[0] }) {
  return (
    <Link
      href={`/marketplace/${product.id}`}
      className="group card-elevated block overflow-hidden"
    >
      {/* Image area */}
      <div
        className={`relative h-52 bg-gradient-to-br ${product.image} overflow-hidden`}
      >
        {/* Tags */}
        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
          {product.tags.map((tag) => (
            <span
              key={tag}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${
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

        {/* Wishlist */}
        <button
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>

        {/* Product icon placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Package className="w-16 h-16 text-[var(--text-primary)] opacity-[0.06]" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-2">
          <span
            className="text-xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatPrice(product.price)}
          </span>
          <span className="text-sm text-[var(--text-tertiary)]">
            - {formatPrice(product.priceMax)}
          </span>
          <span className="text-xs text-[var(--text-tertiary)] ml-1">
            / {product.unit}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-[var(--text-primary)] leading-snug line-clamp-2 mb-3 group-hover:text-[var(--amber-dark)] transition-colors">
          {product.name}
        </h3>

        {/* MOQ */}
        <div className="text-xs text-[var(--text-tertiary)] mb-4">
          MOQ: {product.moq} {product.unit}
        </div>

        {/* Supplier info */}
        <div className="pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-2">
            {product.supplierVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
            )}
            <span className="text-xs font-medium text-[var(--text-secondary)] truncate">
              {product.supplier}
            </span>
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
              <MapPin className="w-3 h-3" />
              {product.supplierProvince}
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
export function MarketplaceClient({ initialProducts }: { initialProducts?: MarketplaceProduct[] }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allProducts = initialProducts && initialProducts.length > 0 ? initialProducts : PRODUCTS;

  const categorySlug = searchParams.get("category");
  const subSlug = searchParams.get("sub");
  const activeCategory = CATEGORIES.find((c) => c.slug === categorySlug) ?? null;

  const displayProducts = useMemo(() => {
    if (!activeCategory || !activeCategory.label || activeCategory.slug === null) {
      return allProducts;
    }
    return allProducts.filter((p) => p.category === activeCategory.label);
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
      <main className="pt-[68px] lg:pt-[148px] min-h-screen bg-[var(--surface-secondary)]">
        {/* Hero bar */}
        <div className="bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
            <h1
              className="text-2xl lg:text-3xl font-bold text-[var(--obsidian)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {activeCategory && activeCategory.slug
                ? activeCategory.label
                : "Marketplace"}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {activeCategory && activeCategory.slug
                ? `${displayProducts.length} ${
                    displayProducts.length === 1 ? "product" : "products"
                  } in ${activeCategory.label}`
                : "Browse 12,000+ products from verified Chinese manufacturers"}
            </p>

            {(activeCategory?.slug || subSlug) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mr-1">
                  Filters
                </span>
                {activeCategory?.slug && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--amber)]/12 border border-[var(--amber)]/25 text-[var(--amber-dark)]">
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

            {/* Search */}
            <div className="mt-5 flex items-center h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] focus-within:border-[var(--amber)] transition-colors max-w-2xl">
              <Search className="w-4 h-4 ml-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search products, suppliers, or keywords..."
                className="w-full bg-transparent px-3 text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <button className="h-full px-6 text-sm font-semibold bg-[var(--amber)] text-[var(--obsidian)] rounded-xl hover:bg-[var(--amber-light)] transition-colors">
                Search
              </button>
            </div>
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
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFilterOpen(true)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                  </button>
                  <span className="text-sm text-[var(--text-tertiary)]">
                    <strong className="text-[var(--text-primary)]">
                      {displayProducts.length}
                    </strong>{" "}
                    products found
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-primary)]">
                    <span className="text-[var(--text-tertiary)] text-xs">
                      Sort:
                    </span>
                    <select className="bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer">
                      <option>Best Match</option>
                      <option>Price: Low to High</option>
                      <option>Price: High to Low</option>
                      <option>Newest</option>
                      <option>Most Popular</option>
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
