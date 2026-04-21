"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Coffee,
  Gem,
  Leaf,
  Package,
  Sprout,
  Wheat,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ProductRail, type RailProduct } from "@/components/landing/product-rail";
import { EditorialBand } from "@/components/landing/editorial-band";
import { TwoUpValue } from "@/components/landing/two-up-value";

/* ============================================================
   HERO — Commodities portal (Africa → China)
   ============================================================ */
function HeroSection() {
  const t = useTranslations("marketing.commodities");
  const tTrust = useTranslations("marketing.trust");
  return (
    <section className="bg-[var(--surface-primary)] pt-[140px] pb-12 lg:pb-16">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 lg:gap-5">
          <div className="relative isolate flex flex-col justify-end overflow-hidden rounded-2xl min-h-[480px] lg:min-h-[600px] p-8 lg:p-14 border border-[var(--border-subtle)]">
            <Image
              src="https://images.pexels.com/photos/29892493/pexels-photo-29892493.jpeg?auto=compress&cs=tinysrgb&w=1800"
              alt="African coffee farmer holding freshly harvested cherries"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 65vw"
              className="object-cover -z-10"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 mb-5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--terracotta-light)]" />
              <span className="text-[11px] font-semibold text-white tracking-wide uppercase">
                {t("hero.badge")}
              </span>
            </span>
            <h1
              className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-white max-w-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("hero.headline")}
            </h1>
            <p className="mt-5 text-base lg:text-lg text-white/85 max-w-xl leading-relaxed">
              {t("hero.tagline")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/commodities/browse"
                className="btn-primary !py-3.5 !px-7 !text-sm"
              >
                {t("hero.browseCta")}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="text-sm font-semibold text-white/85 hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("hero.switchCta")}
              </Link>
            </div>
          </div>

          {/* Secondary stack */}
          <div className="flex flex-col gap-4 lg:gap-5">
            <div className="bg-[var(--surface-secondary)] rounded-2xl p-7 lg:p-8 border border-[var(--border-subtle)] flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--terracotta)] tracking-[0.12em] uppercase">
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
                href="/auth/register?role=supplier&type=cooperative"
                className="btn-primary !text-sm !py-3 !px-5 mt-5 w-fit"
              >
                {t("promo.cta")}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <Link
              href="/dashboard/rfq"
              className="group bg-[var(--obsidian)] rounded-2xl p-7 border border-transparent hover:border-[var(--terracotta-light)]/30 transition-colors"
            >
              <span className="text-[11px] font-semibold text-[var(--terracotta-light)] tracking-[0.12em] uppercase">
                {t("rfqBox.eyebrow")}
              </span>
              <h3
                className="mt-2 text-lg font-bold text-[var(--ivory)] leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("rfqBox.headline")}
              </h3>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--terracotta-light)] group-hover:gap-2.5 transition-all">
                {t("rfqBox.cta")}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-10 lg:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-10 py-6 lg:py-8 border-y border-[var(--border-subtle)]">
          {[
            { value: "2,400+", label: tTrust("cooperatives") },
            { value: "$680M", label: tTrust("annualExports") },
            { value: "27", label: tTrust("sourceCountries") },
            { value: "100%", label: tTrust("traceableLots") },
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
   FEATURED CATEGORIES (Commodities only)
   ============================================================ */
function FeaturedCategories() {
  const t = useTranslations("marketing.commodities.categories");
  const categories = [
    {
      name: t("premiumCoffee"),
      count: t("lots", { count: "800+" }),
      image:
        "https://images.pexels.com/photos/28487979/pexels-photo-28487979.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Coffee,
    },
    {
      name: t("organicCocoa"),
      count: t("lots", { count: "280+" }),
      image:
        "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Leaf,
    },
    {
      name: t("teaSpices"),
      count: t("lots", { count: "450+" }),
      image:
        "https://images.pexels.com/photos/29892493/pexels-photo-29892493.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Sprout,
    },
    {
      name: t("mineralsMetals"),
      count: t("lots", { count: "320+" }),
      image:
        "https://images.pexels.com/photos/33192/paddle-wheel-bucket-wheel-excavators-brown-coal-open-pit-mining.jpg?auto=compress&cs=tinysrgb&w=900",
      icon: Gem,
    },
    {
      name: t("cerealsGrains"),
      count: t("lots", { count: "190+" }),
      image:
        "https://images.pexels.com/photos/15378707/pexels-photo-15378707.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Wheat,
    },
    {
      name: t("specialtyCrops"),
      count: t("lots", { count: "240+" }),
      image:
        "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Package,
    },
  ];

  return (
    <section className="py-16 lg:py-20 bg-[var(--surface-secondary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-xs font-semibold text-[var(--terracotta)] tracking-[0.15em] uppercase">
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
            href="/commodities/browse"
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--terracotta)] transition-colors"
          >
            {t("viewAll")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href="/commodities/browse"
              className="group relative isolate flex flex-col justify-end p-6 h-48 lg:h-64 rounded-2xl overflow-hidden border border-[var(--border-subtle)] hover:shadow-lg transition-all duration-300"
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                sizes="(max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04] -z-10"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

              <cat.icon className="absolute top-5 right-5 w-7 h-7 text-white/85" />

              <div>
                <h3
                  className="text-lg font-bold text-white mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {cat.name}
                </h3>
                <p className="text-sm text-white/75">{cat.count}</p>
              </div>

              <ArrowUpRight className="absolute bottom-5 right-5 w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   MOCK COMMODITY DATA + GUIDES
   ============================================================ */
const NEW_COMMODITIES: RailProduct[] = [
  {
    id: "c-arabica-rwanda",
    name: "Premium Arabica Coffee — Bourbon, Washed Process",
    image:
      "https://images.pexels.com/photos/28487979/pexels-photo-28487979.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 4_85,
    currency: "USD",
    unit: "kg",
    supplier: "Gorilla Coffee Co-op",
    country: "Rwanda",
    moq: "60kg",
    badge: "New",
  },
  {
    id: "c-cocoa-ghana",
    name: "Organic Cocoa Beans — Fair Trade Certified, Sun-dried",
    image:
      "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 3_20,
    currency: "USD",
    unit: "kg",
    supplier: "Asante Farmers Union",
    country: "Ghana",
    moq: "100kg",
  },
  {
    id: "c-tea-kenya",
    name: "Specialty Black Tea CTC — Single-Estate Highland",
    image:
      "https://images.pexels.com/photos/29892493/pexels-photo-29892493.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 5_50,
    currency: "USD",
    unit: "kg",
    supplier: "Kericho Highlands Tea",
    country: "Kenya",
    moq: "50kg",
    badge: "Hot",
  },
  {
    id: "c-yirgacheffe",
    name: "Yirgacheffe Coffee Green Beans — Grade 1 Specialty",
    image:
      "https://images.pexels.com/photos/28487979/pexels-photo-28487979.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 7_20,
    currency: "USD",
    unit: "kg",
    supplier: "Sidama Coffee Union",
    country: "Ethiopia",
    moq: "60kg",
    badge: "New",
  },
  {
    id: "c-cardamom-tanzania",
    name: "Sun-Dried Green Cardamom Pods — Aromatic Premium",
    image:
      "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 24_00,
    currency: "USD",
    unit: "kg",
    supplier: "Spice Roads Cooperative",
    country: "Tanzania",
    moq: "25kg",
  },
  {
    id: "c-cobalt-drc",
    name: "Cobalt Ore Concentrate — Battery-Grade, Certified Origin",
    image:
      "https://images.pexels.com/photos/33192/paddle-wheel-bucket-wheel-excavators-brown-coal-open-pit-mining.jpg?auto=compress&cs=tinysrgb&w=600",
    amount: 32_000_00,
    currency: "USD",
    unit: "tonne",
    supplier: "Katanga Mining Resources",
    country: "DRC",
    moq: "1 tonne",
  },
  {
    id: "c-vanilla-madagascar",
    name: "Bourbon Vanilla Beans — Grade A Gourmet Cured",
    image:
      "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 340_00,
    currency: "USD",
    unit: "kg",
    supplier: "Sava Vanilla Growers",
    country: "Madagascar",
    moq: "5kg",
    badge: "Hot",
  },
  {
    id: "c-shea-butter",
    name: "Raw Shea Butter — Unrefined, Cosmetic Grade",
    image:
      "https://images.pexels.com/photos/29892493/pexels-photo-29892493.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 6_80,
    currency: "USD",
    unit: "kg",
    supplier: "Burkina Women's Collective",
    country: "Burkina Faso",
    moq: "200kg",
  },
];

const COMMODITY_GUIDE_IMAGES = {
  guide1:
    "https://images.pexels.com/photos/28487979/pexels-photo-28487979.jpeg?auto=compress&cs=tinysrgb&w=1200",
  guide2:
    "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=1200",
  guide3:
    "https://images.pexels.com/photos/5239818/pexels-photo-5239818.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

/* ============================================================
   CTA
   ============================================================ */
function CTASection() {
  const t = useTranslations("marketing.commodities.cta");
  return (
    <section className="py-20 bg-[var(--surface-primary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="relative rounded-3xl overflow-hidden bg-[var(--obsidian)] p-10 lg:p-16">
          <div className="absolute inset-0 grid-pattern opacity-15" />
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px]"
            style={{
              background:
                "radial-gradient(ellipse at top right, rgba(196,93,62,0.12), transparent 60%)",
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <h2
                className="text-3xl lg:text-4xl font-bold text-[var(--ivory)] tracking-tight leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("headline")}
                <span className="text-[var(--terracotta-light)]">.</span>
              </h2>
              <p className="mt-4 text-base lg:text-lg text-white/55 max-w-lg leading-relaxed">
                {t("body")}
              </p>
            </div>

            <div className="flex flex-col gap-3 min-w-[240px]">
              <Link
                href="/auth/register?role=supplier"
                className="btn-primary !py-3.5 !px-7 !text-base w-full justify-center"
              >
                {t("supplier")}
                <ArrowUpRight className="w-5 h-5" />
              </Link>
              <Link
                href="/auth/register?role=buyer"
                className="btn-secondary !py-3.5 !px-7 !text-base w-full justify-center"
              >
                {t("buyer")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CommoditiesPortal() {
  const tRail = useTranslations("marketing.commodities.rail");
  const tEditorial = useTranslations("marketing.commodities.editorial");

  const editorialItems = [
    {
      title: tEditorial("guide1Title"),
      description: tEditorial("guide1Desc"),
      tag: tEditorial("guide1Tag"),
      image: COMMODITY_GUIDE_IMAGES.guide1,
      href: "/resources",
    },
    {
      title: tEditorial("guide2Title"),
      description: tEditorial("guide2Desc"),
      tag: tEditorial("guide2Tag"),
      image: COMMODITY_GUIDE_IMAGES.guide2,
      href: "/resources",
    },
    {
      title: tEditorial("guide3Title"),
      description: tEditorial("guide3Desc"),
      tag: tEditorial("guide3Tag"),
      image: COMMODITY_GUIDE_IMAGES.guide3,
      href: "/resources",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturedCategories />
        <ProductRail
          eyebrow={tRail("eyebrow")}
          title={tRail("title")}
          subtitle={tRail("subtitle")}
          viewAllHref="/commodities/browse?sort=newest"
          products={NEW_COMMODITIES}
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
