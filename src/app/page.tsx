"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowUpRight,
  Factory,
  Package,
  Truck,
  Zap,
  Wrench,
  Shirt,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ProductRail, type RailProduct } from "@/components/landing/product-rail";
import { EditorialBand } from "@/components/landing/editorial-band";
import { TwoUpValue } from "@/components/landing/two-up-value";

/* ============================================================
   HERO — Products portal (China → Africa, single big tile)
   ============================================================ */
function HeroSection() {
  const t = useTranslations("marketing.products");
  const tTrust = useTranslations("marketing.trust");
  return (
    <section className="bg-[var(--surface-primary)] pt-[140px] pb-12 lg:pb-16">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 lg:gap-5">
          <div className="relative isolate flex flex-col justify-end overflow-hidden rounded-2xl min-h-[480px] lg:min-h-[600px] p-8 lg:p-14 border border-[var(--border-subtle)]">
            <Image
              src="https://images.pexels.com/photos/33626641/pexels-photo-33626641.jpeg?auto=compress&cs=tinysrgb&w=1800"
              alt="Manufacturing factory floor with assembly line"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 65vw"
              className="object-cover -z-10"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 mb-5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)]" />
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
                href="/marketplace"
                className="btn-primary !py-3.5 !px-7 !text-sm"
              >
                {t("hero.browseCta")}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/commodities"
                className="text-sm font-semibold text-white/85 hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                {t("hero.switchCta")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

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
            { value: "12,000+", label: tTrust("verifiedSuppliers") },
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
   FEATURED CATEGORIES (Products only)
   ============================================================ */
function FeaturedCategories() {
  const t = useTranslations("marketing.products.categories");
  const categories = [
    {
      name: t("consumerElectronics"),
      count: "3,400+",
      image:
        "https://images.pexels.com/photos/7864622/pexels-photo-7864622.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Zap,
    },
    {
      name: t("machineryParts"),
      count: "2,100+",
      image:
        "https://images.pexels.com/photos/33748032/pexels-photo-33748032.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Factory,
    },
    {
      name: t("textilesApparel"),
      count: "1,800+",
      image:
        "https://images.pexels.com/photos/34191411/pexels-photo-34191411.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Shirt,
    },
    {
      name: t("constructionHardware"),
      count: "1,200+",
      image:
        "https://images.pexels.com/photos/15378707/pexels-photo-15378707.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Wrench,
    },
    {
      name: t("autoTransport"),
      count: "1,500+",
      image:
        "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Truck,
    },
    {
      name: t("packagingPrint"),
      count: "640+",
      image:
        "https://images.pexels.com/photos/28487979/pexels-photo-28487979.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Package,
    },
  ];

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
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href="/marketplace"
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
                <p className="text-sm text-white/75">{t("products", { count: cat.count })}</p>
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
   MOCK PRODUCT DATA + RAIL
   ============================================================ */
const NEW_PRODUCTS: RailProduct[] = [
  {
    id: "p-cnc-lathe",
    name: "Industrial CNC Lathe 1000mm — Variable Speed",
    image:
      "https://images.pexels.com/photos/33748032/pexels-photo-33748032.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 8_500_00,
    currency: "USD",
    unit: "set",
    supplier: "Guangzhou Huahe Precision",
    country: "CN",
    moq: "1 set",
    badge: "New",
  },
  {
    id: "p-smartphone-5g",
    name: "5G Android Smartphone 6.7\" AMOLED — 256GB OEM",
    image:
      "https://images.pexels.com/photos/7864622/pexels-photo-7864622.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 85_00,
    currency: "USD",
    unit: "unit",
    supplier: "Shenzhen DigiTech Electronics",
    country: "CN",
    moq: "100 units",
  },
  {
    id: "p-cotton-tee",
    name: "Premium Cotton T-Shirt — Custom Bulk Logo Printing",
    image:
      "https://images.pexels.com/photos/34191411/pexels-photo-34191411.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 2_80,
    currency: "USD",
    unit: "piece",
    supplier: "Zhejiang Silk Valley Textiles",
    country: "CN",
    moq: "500 pieces",
    badge: "Hot",
  },
  {
    id: "p-excavator-21t",
    name: "Hydraulic Excavator 21-ton — Heavy Construction",
    image:
      "https://images.pexels.com/photos/15378707/pexels-photo-15378707.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 42_000_00,
    currency: "USD",
    unit: "unit",
    supplier: "Henan HeavyBuild Machinery",
    country: "CN",
    moq: "1 unit",
  },
  {
    id: "p-solar-550w",
    name: "Solar Panel 550W Monocrystalline PV Module Tier 1",
    image:
      "https://images.pexels.com/photos/4993793/pexels-photo-4993793.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 110_00,
    currency: "USD",
    unit: "panel",
    supplier: "Jiangsu Sunburst Energy",
    country: "CN",
    moq: "10 panels",
    badge: "New",
  },
  {
    id: "p-cement-425r",
    name: "Portland Cement 42.5R Grade — Bulk Supply 25kg Bags",
    image:
      "https://images.pexels.com/photos/33626641/pexels-photo-33626641.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 3_20,
    currency: "USD",
    unit: "bag",
    supplier: "Fujian RockMight Materials",
    country: "CN",
    moq: "1,000 bags",
  },
  {
    id: "p-led-streetlamp",
    name: "LED Street Light 200W IP66 Waterproof Solar Powered",
    image:
      "https://images.pexels.com/photos/7864622/pexels-photo-7864622.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 45_00,
    currency: "USD",
    unit: "unit",
    supplier: "Jiangsu BrightPath Lighting",
    country: "CN",
    moq: "50 units",
  },
  {
    id: "p-air-compressor",
    name: "Industrial Air Compressor 7.5kW Screw — Energy Efficient",
    image:
      "https://images.pexels.com/photos/33748032/pexels-photo-33748032.jpeg?auto=compress&cs=tinysrgb&w=600",
    amount: 1_850_00,
    currency: "USD",
    unit: "unit",
    supplier: "Shanghai AirPro Equipment",
    country: "CN",
    moq: "1 unit",
    badge: "Hot",
  },
];

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
                "radial-gradient(ellipse at top right, rgba(212,168,83,0.1), transparent 60%)",
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

export default function ProductsPortalHome() {
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
        <FeaturedCategories />
        <ProductRail
          eyebrow={tRail("eyebrow")}
          title={tRail("title")}
          subtitle={tRail("subtitle")}
          viewAllHref="/marketplace?sort=newest"
          products={NEW_PRODUCTS}
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
