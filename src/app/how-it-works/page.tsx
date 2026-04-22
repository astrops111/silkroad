"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  FileText,
  Package,
  Search,
  Truck,
  Zap,
  Factory,
  Coffee,
  Leaf,
  Gem,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

function PageHeader() {
  const t = useTranslations("marketing.howItWorks");
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--border-subtle)] pt-[184px] pb-20 lg:pb-28">
      <Image
        src="https://images.pexels.com/photos/15378707/pexels-photo-15378707.jpeg?auto=compress&cs=tinysrgb&w=1800"
        alt={t("title")}
        fill
        priority
        sizes="100vw"
        className="object-cover -z-10"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--obsidian)]/85 via-[var(--obsidian)]/65 to-[var(--obsidian)]/30" />

      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <span className="text-xs font-semibold text-[var(--amber)] tracking-[0.15em] uppercase">
          {t("eyebrow")}
        </span>
        <h1
          className="mt-4 text-4xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.05]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h1>
        <p className="mt-5 text-lg text-white/80 max-w-2xl leading-relaxed">
          {t("subtitle")}
        </p>
      </div>
    </section>
  );
}

function TradeDirections() {
  const t = useTranslations("marketing.howItWorks");
  const tRegions = useTranslations("marketing.regions");
  const flows = [
    {
      direction: tRegions("chinaToAfrica"),
      tag: t("flowChinaTag"),
      tagColor:
        "bg-[var(--indigo)]/10 text-[var(--indigo)] border-[var(--indigo)]/20",
      title: t("flowChinaTitle"),
      desc: t("flowChinaDesc"),
      categories: [
        { icon: Zap, name: t("subElectronics"), count: "3,400+" },
        { icon: Factory, name: t("subMachinery"), count: "2,100+" },
        { icon: Package, name: t("subTextiles"), count: "1,800+" },
        { icon: Truck, name: t("subConstruction"), count: "1,200+" },
      ],
      accent: "var(--indigo)",
      accentLight: "var(--indigo-light)",
      cta: t("flowChinaCta"),
      href: "/marketplace",
    },
    {
      direction: tRegions("africaToChina"),
      tag: t("flowAfricaTag"),
      tagColor:
        "bg-[var(--terracotta)]/10 text-[var(--terracotta)] border-[var(--terracotta)]/20",
      title: t("flowAfricaTitle"),
      desc: t("flowAfricaDesc"),
      categories: [
        { icon: Coffee, name: t("subCoffee"), count: "800+" },
        { icon: Leaf, name: t("subTeaSpices"), count: "450+" },
        { icon: Gem, name: t("subMinerals"), count: "320+" },
        { icon: Package, name: t("subCocoa"), count: "280+" },
      ],
      accent: "var(--terracotta)",
      accentLight: "var(--terracotta-light)",
      cta: t("flowAfricaCta"),
      href: "/commodities",
    },
  ];

  return (
    <section className="py-24 bg-[var(--surface-primary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
            {t("directionsEyebrow")}
          </span>
          <h2
            className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("directionsTitle")}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {flows.map((flow) => (
            <div
              key={flow.direction}
              className="p-8 lg:p-10 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            >
              <div className="flex items-center gap-3 mb-5">
                <span
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${flow.tagColor}`}
                >
                  {flow.direction}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {flow.tag}
                </span>
              </div>

              <h3
                className="text-2xl font-bold text-[var(--obsidian)] tracking-tight leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {flow.title}
              </h3>

              <p className="mt-3 text-[var(--text-secondary)] leading-relaxed max-w-md">
                {flow.desc}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {flow.categories.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{
                        background: `color-mix(in srgb, ${flow.accent} 12%, transparent)`,
                      }}
                    >
                      <cat.icon
                        className="w-4 h-4"
                        style={{ color: flow.accentLight }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {cat.name}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {t("listings", { count: cat.count })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href={flow.href}
                className="inline-flex items-center gap-2 mt-7 text-sm font-semibold transition-colors"
                style={{ color: flow.accentLight }}
              >
                {flow.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations("marketing.howItWorks");
  const steps = [
    { number: "01", icon: Search, title: t("step1Title"), desc: t("step1Desc") },
    { number: "02", icon: FileText, title: t("step2Title"), desc: t("step2Desc") },
    { number: "03", icon: CreditCard, title: t("step3Title"), desc: t("step3Desc") },
    { number: "04", icon: Truck, title: t("step4Title"), desc: t("step4Desc") },
  ];

  return (
    <section className="py-24 bg-[var(--surface-secondary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
          <div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              {t("stepsEyebrow")}
            </span>
            <h2
              className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("stepsTitle")}
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] max-w-sm leading-relaxed lg:text-right">
            {t("stepsSubtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative p-7 rounded-2xl bg-white border border-[var(--border-subtle)]"
            >
              <span
                className="absolute top-4 right-5 text-[3.5rem] font-black text-[var(--obsidian)]/[0.04] leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {step.number}
              </span>

              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/15 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-[var(--amber-dark)]" />
                </div>
                <h3
                  className="text-lg font-bold text-[var(--obsidian)] mb-1.5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] items-center justify-center">
                  <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const t = useTranslations("marketing.howItWorks");
  return (
    <section className="py-20 bg-[var(--surface-primary)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="rounded-3xl bg-[var(--obsidian)] p-10 lg:p-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <h2
              className="text-2xl lg:text-3xl font-bold text-[var(--ivory)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("ctaTitle")}
            </h2>
            <p className="mt-3 text-white/55 max-w-lg">
              {t("ctaBody")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
            <Link
              href="/auth/register?role=buyer"
              className="btn-primary !py-3.5 !px-7"
            >
              {t("ctaBuyer")}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register?role=supplier"
              className="btn-secondary !py-3.5 !px-7"
            >
              {t("ctaSupplier")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <PageHeader />
        <TradeDirections />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
