import Image from "next/image";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Smartphone,
  ShoppingBasket,
  Baby,
  BedDouble,
  Sofa,
  House,
  Hotel,
  Cpu,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ProductRail, type RailProduct } from "@/components/landing/product-rail";
import { EditorialBand } from "@/components/landing/editorial-band";
import { TwoUpValue } from "@/components/landing/two-up-value";
import { HeroCarousel } from "@/components/landing/hero-carousel";
import {
  getTopLevelCategoriesWithCount,
  type TopCategoryWithCount,
} from "@/lib/queries/categories";
import { imageForSlug } from "@/lib/category-images";
import { getCountryFacets, searchProducts } from "@/lib/queries/marketplace";
import { regionMeta } from "@/lib/product-labels";
import { applyMarkup } from "@/lib/pricing";

// Renders live catalog data (categories, facets, featured products) through the
// cookieless cached queries. Force dynamic so this page is never prerendered at
// build time — the Docker build image has no SUPABASE_SERVICE_ROLE_KEY, and the
// page was already request-time only before those queries were cached.
export const dynamic = "force-dynamic";

/* ============================================================
   HERO — Products portal (China → Africa, rotating carousel)
   ============================================================ */
function HeroSection() {
  const t = useTranslations("marketing.products");
  const tTrust = useTranslations("marketing.trust");
  return (
    <section className="bg-[var(--surface-primary)] pt-[176px] pb-12 lg:pb-16">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 lg:gap-5">
          <HeroCarousel />

          {/* Secondary stack: trust badge + featured pitch */}
          <div className="flex flex-col gap-4 lg:gap-5">
            <div className="bg-[var(--surface-secondary)] rounded-2xl p-7 lg:p-8 border border-[var(--border-subtle)] flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--amber-dark)] tracking-[0.12em] uppercase">
                  {t("promo.eyebrow")}
                </span>
                <h3
                  className="mt-2 text-xl lg:text-2xl font-bold text-[var(--obsidian)] leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("promo.headline")}
                </h3>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  {t("promo.body")}
                </p>
              </div>
              <Link
                href="/auth/register?role=buyer"
                className="btn-primary !text-sm !py-3 !px-5 mt-5 w-fit"
              >
                {t("promo.cta")}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <Link
              href="/dashboard/rfq"
              className="group bg-[var(--obsidian)] rounded-2xl p-7 border border-transparent hover:border-[var(--amber)]/30 transition-colors"
            >
              <span className="text-[11px] font-semibold text-[var(--amber)] tracking-[0.12em] uppercase">
                {t("rfqBox.eyebrow")}
              </span>
              <h3
                className="mt-2 text-lg font-bold text-[var(--ivory)] leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("rfqBox.headline")}
              </h3>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--amber)] group-hover:gap-2.5 transition-all">
                {t("rfqBox.cta")}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-10 lg:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-10 py-6 lg:py-8 border-y border-[var(--border-subtle)]">
          {[
            { value: "15,000+", label: tTrust("products") },
            { value: "$2.4B", label: tTrust("annualGmv") },
            { value: "54", label: tTrust("africanCountries") },
            { value: "98.2%", label: tTrust("satisfactionRate") },
          ].map((stat) => (
            <div key={stat.label}>
              <div
                className="text-2xl lg:text-3xl font-bold text-[var(--obsidian)] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {stat.value}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1.5 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   IMPORT FROM REGION (DB-driven country facets)
   ============================================================ */
const IMPORT_REGIONS = ["CN", "KR", "JP", "TW"] as const;

const REGION_SKYLINE: Record<(typeof IMPORT_REGIONS)[number], { city: string; image: string }> = {
  CN: {
    city: "China",
    image: "/regions/china.webp",
  },
  JP: {
    city: "Japan",
    image: "/regions/japan.webp",
  },
  KR: {
    city: "Korea",
    image: "/regions/korea.webp",
  },
  TW: {
    city: "Taiwan",
    image: "/regions/taiwan.webp",
  },
};

function ImportFromRegion({
  countryFacets,
}: {
  countryFacets: Record<string, number>;
}) {
  const t = useTranslations("marketing.products.importRegion");

  return (
    <section className="py-14 lg:py-16 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="mb-8">
          <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
            {t("eyebrow")}
          </span>
          <h2
            className="mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("title")}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {IMPORT_REGIONS.map((code) => {
            const meta = regionMeta(code);
            const { city, image } = REGION_SKYLINE[code];
            const count = countryFacets[code] ?? 0;
            return (
              <Link
                key={code}
                href={`/marketplace?country=${code}`}
                className="group relative isolate flex flex-col justify-end p-5 h-48 lg:h-56 rounded-2xl overflow-hidden border border-[var(--border-subtle)] hover:shadow-lg transition-all duration-300"
              >
                <Image
                  src={image}
                  alt={`${city} skyline, ${meta.label}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04] -z-10"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                <span className="absolute top-4 right-4 text-2xl leading-none" aria-hidden>
                  {meta.flag}
                </span>

                <div>
                  <h3
                    className="text-base lg:text-lg font-bold text-white leading-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {city}
                  </h3>
                  <p className="text-xs text-white/75 mt-0.5">{meta.label}</p>
                  <p className="text-xs text-white/60 mt-1.5">
                    {t("products", { count: formatCount(count) })}
                  </p>
                </div>

                <ArrowUpRight className="absolute bottom-4 right-4 w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FEATURED CATEGORIES (DB-driven)
   ============================================================ */
const ICON_MAP: Record<string, LucideIcon> = {
  House,
  Hotel,
  Cpu,
  Sparkles,
  ShoppingBag,
  ShoppingBasket,
  Baby,
  BedDouble,
  Sofa,
  Smartphone,
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  return String(n);
}

function FeaturedCategories({
  categories,
  locale,
}: {
  categories: TopCategoryWithCount[];
  locale: string;
}) {
  const t = useTranslations("marketing.products.categories");

  return (
    <section className="py-16 lg:py-20 bg-[var(--surface-secondary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              {t("eyebrow")}
            </span>
            <h2
              className="mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("title")}
            </h2>
          </div>
          <Link
            href="/marketplace"
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--amber-dark)] transition-colors"
          >
            {t("viewAll")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const displayName =
              locale === "zh" && cat.name_local ? cat.name_local : cat.name;
            const Icon: LucideIcon =
              (cat.icon ? ICON_MAP[cat.icon] : undefined) ?? ShoppingBag;
            const image = imageForSlug(cat.slug);
            return (
              <Link
                key={cat.id}
                href={`/marketplace?category=${cat.slug}`}
                className="group relative isolate flex flex-col justify-end p-6 h-48 lg:h-64 rounded-2xl overflow-hidden border border-[var(--border-subtle)] hover:shadow-lg transition-all duration-300"
              >
                <Image
                  src={image}
                  alt={displayName}
                  fill
                  sizes="(max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04] -z-10"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

                <Icon className="absolute top-5 right-5 w-7 h-7 text-white/85" />

                <div>
                  <h3
                    className="text-lg font-bold text-white mb-1"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {displayName}
                  </h3>
                  <p className="text-sm text-white/75">
                    {t("products", { count: formatCount(cat.productCount) })}
                  </p>
                </div>

                <ArrowUpRight className="absolute bottom-5 right-5 w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PRODUCT RAIL — mapped from live marketplace listings
   ============================================================ */
const FALLBACK_PRODUCT_IMAGE =
  "https://images.pexels.com/photos/33748032/pexels-photo-33748032.jpeg?auto=compress&cs=tinysrgb&w=600";

function toRailProducts(
  products: Awaited<ReturnType<typeof searchProducts>>["products"]
): RailProduct[] {
  return products.map((p) => {
    const boxPackQty = p.box_pack_qty ?? 1;
    const unitAmount = applyMarkup(p.base_price);
    const company = p.companies as { name: string; country_code: string } | null;
    return {
      id: p.id,
      name: p.name,
      image: p.product_images?.[0]?.url ?? FALLBACK_PRODUCT_IMAGE,
      amount: Math.round(boxPackQty > 1 ? unitAmount * boxPackQty : unitAmount),
      currency: p.currency ?? "USD",
      unit: boxPackQty > 1 ? "box" : "unit",
      supplier: company?.name ?? "Verified Supplier",
      country: p.origin_country ?? company?.country_code ?? "CN",
      moq: `${boxPackQty > 1 ? Math.max(1, Math.round((p.moq ?? 1) / boxPackQty)) : (p.moq ?? 1)} ${boxPackQty > 1 ? "boxes" : "units"}`,
      badge: p.is_featured ? "Hot" : "New",
    };
  });
}

const EDITORIAL_IMAGES = {
  guide1:
    "https://images.pexels.com/photos/36882975/pexels-photo-36882975.jpeg?auto=compress&cs=tinysrgb&w=1200",
  guide2:
    "https://images.pexels.com/photos/5239818/pexels-photo-5239818.jpeg?auto=compress&cs=tinysrgb&w=1200",
  guide3:
    "https://images.pexels.com/photos/18609057/pexels-photo-18609057.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

/* ============================================================
   CTA
   ============================================================ */
function CTASection() {
  const t = useTranslations("marketing.products.cta");
  return (
    <section className="py-20 bg-[var(--surface-primary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="relative rounded-3xl overflow-hidden bg-[var(--obsidian)] p-10 lg:p-16">
          <div className="absolute inset-0 grid-pattern opacity-15" />
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px]"
            style={{
              background:
                "radial-gradient(ellipse at top right, rgba(216,159,46,0.1), transparent 60%)",
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <h2
                className="text-3xl lg:text-4xl font-bold text-[var(--ivory)] tracking-tight leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("headline")}
                <span className="text-[var(--amber)]">.</span>
              </h2>
              <p className="mt-4 text-base lg:text-lg text-white/55 max-w-lg leading-relaxed">
                {t("body")}
              </p>
            </div>

            <div className="flex flex-col gap-3 min-w-[240px]">
              <Link
                href="/auth/register?role=buyer"
                className="btn-primary !py-3.5 !px-7 !text-base w-full justify-center"
              >
                {t("buyer")}
                <ArrowUpRight className="w-5 h-5" />
              </Link>
              <Link
                href="/auth/register?role=supplier"
                className="btn-secondary !py-3.5 !px-7 !text-base w-full justify-center"
              >
                {t("supplier")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function ProductsPortalHome() {
  const [categories, countryFacets, locale, newestResult] = await Promise.all([
    getTopLevelCategoriesWithCount(),
    getCountryFacets(),
    getLocale(),
    searchProducts({ sort: "newest", limit: 12 }),
  ]);

  return (
    <ProductsPortalHomeInner
      categories={categories}
      countryFacets={countryFacets}
      locale={locale}
      newProducts={toRailProducts(newestResult.products)}
    />
  );
}

function ProductsPortalHomeInner({
  categories,
  countryFacets,
  locale,
  newProducts,
}: {
  categories: TopCategoryWithCount[];
  countryFacets: Record<string, number>;
  locale: string;
  newProducts: RailProduct[];
}) {
  const tRail = useTranslations("marketing.products.rail");
  const tEditorial = useTranslations("marketing.products.editorial");

  const editorialItems = [
    {
      title: tEditorial("guide1Title"),
      description: tEditorial("guide1Desc"),
      tag: tEditorial("guide1Tag"),
      image: EDITORIAL_IMAGES.guide1,
      href: "/resources",
    },
    {
      title: tEditorial("guide2Title"),
      description: tEditorial("guide2Desc"),
      tag: tEditorial("guide2Tag"),
      image: EDITORIAL_IMAGES.guide2,
      href: "/resources",
    },
    {
      title: tEditorial("guide3Title"),
      description: tEditorial("guide3Desc"),
      tag: tEditorial("guide3Tag"),
      image: EDITORIAL_IMAGES.guide3,
      href: "/resources",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <ImportFromRegion countryFacets={countryFacets} />
        <FeaturedCategories categories={categories} locale={locale} />
        <ProductRail
          eyebrow={tRail("eyebrow")}
          title={tRail("title")}
          subtitle={tRail("subtitle")}
          viewAllHref="/marketplace?sort=newest"
          products={newProducts}
        />
        <EditorialBand
          eyebrow={tEditorial("eyebrow")}
          title={tEditorial("title")}
          items={editorialItems}
        />
        <TwoUpValue />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
