import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Coffee,
  Factory,
  Leaf,
  Package,
  Globe,
  Shield,
  Star,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "About — Silk Road Africa",
  description:
    "How Silk Road Africa connects Chinese manufacturers with African businesses, and African producers with Chinese importers.",
};

function PageHeader() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--border-subtle)] pt-[148px] pb-24 lg:pb-32">
      <Image
        src="https://images.pexels.com/photos/18609057/pexels-photo-18609057.jpeg?auto=compress&cs=tinysrgb&w=1800"
        alt="Container ship at port"
        fill
        priority
        sizes="100vw"
        className="object-cover -z-10"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--obsidian)]/85 via-[var(--obsidian)]/70 to-[var(--obsidian)]/40" />

      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <span className="text-xs font-semibold text-[var(--amber)] tracking-[0.15em] uppercase">
          About Silk Road Africa
        </span>
        <h1
          className="mt-4 text-4xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.05]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Trade infrastructure for two continents.
        </h1>
        <p className="mt-6 text-lg text-white/80 max-w-2xl leading-relaxed">
          We connect Chinese manufacturers with African businesses — and African
          producers with Chinese importers — on a single B2B platform built for
          how this trade actually works: mobile-money payments, bonded
          logistics, multi-language support, and trade assurance on every order.
        </p>
      </div>
    </section>
  );
}

function TradeFlowDiagram() {
  return (
    <section className="py-24 lg:py-32 bg-[var(--surface-secondary)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
            Bidirectional Commerce
          </span>
          <h2
            className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How trade flows on Silk Road
          </h2>
          <p className="mt-5 text-[var(--text-secondary)] max-w-xl mx-auto">
            Two source markets. One platform. Verified suppliers and importers
            on both sides of every transaction.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-12 items-center">
          <div className="p-8 rounded-3xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[var(--indigo)]/10 flex items-center justify-center">
                <Factory className="w-6 h-6 text-[var(--indigo)]" />
              </div>
              <div>
                <div className="text-base font-bold text-[var(--obsidian)]">
                  Chinese Manufacturers
                </div>
                <div className="text-sm text-[var(--text-tertiary)]">
                  Guangdong · Zhejiang · Fujian
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                "Electronics & Components",
                "Machinery & Equipment",
                "Textiles & Apparel",
                "Construction & Hardware",
              ].map((cat) => (
                <div
                  key={cat}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--surface-secondary)] text-sm text-[var(--text-secondary)]"
                >
                  <Package className="w-4 h-4 text-[var(--indigo)]" />
                  {cat}
                </div>
              ))}
            </div>
          </div>

          <div className="flex lg:flex-col items-center gap-3 justify-center">
            <div className="w-14 h-14 rounded-full bg-[var(--amber)]/15 border border-[var(--amber)]/30 flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-[var(--amber-dark)] lg:rotate-90" />
            </div>
            <div className="silk-line w-16 h-0.5 lg:w-0.5 lg:h-16 silk-line-vertical" />
            <div className="w-14 h-14 rounded-full bg-[var(--amber)]/15 border border-[var(--amber)]/30 flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-[var(--amber-dark)] -rotate-180 lg:-rotate-90" />
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[var(--terracotta)]/10 flex items-center justify-center">
                <Leaf className="w-6 h-6 text-[var(--terracotta)]" />
              </div>
              <div>
                <div className="text-base font-bold text-[var(--obsidian)]">
                  African Producers
                </div>
                <div className="text-sm text-[var(--text-tertiary)]">
                  Kenya · Ethiopia · Rwanda · Ghana
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                "Premium Arabica Coffee",
                "Organic Cocoa Beans",
                "Specialty Tea & Spices",
                "Minerals & Metals",
              ].map((cat) => (
                <div
                  key={cat}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--surface-secondary)] text-sm text-[var(--text-secondary)]"
                >
                  <Coffee className="w-4 h-4 text-[var(--terracotta)]" />
                  {cat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  const pillars = [
    {
      icon: Shield,
      title: "Trade Assurance",
      desc: "Every transaction is held in escrow until you confirm delivery and quality. Disputes are mediated by Silk Road operations.",
    },
    {
      icon: Truck,
      title: "Owned Logistics",
      desc: "Our own fleet, drivers, and bonded warehouses move goods door-to-door across 27+ African countries — not third-party carriers.",
    },
    {
      icon: Globe,
      title: "Local-First Payments",
      desc: "MTN MoMo, Airtel Money, M-Pesa, Alipay, WeChat Pay, bank transfer. Pay the way your business already pays.",
    },
    {
      icon: Users,
      title: "Verified On Both Sides",
      desc: "KYC verification, factory inspections, and business license validation for every supplier and importer on the platform.",
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-[var(--surface-primary)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="mb-14 max-w-2xl">
          <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
            What We Do
          </span>
          <h2
            className="mt-4 text-3xl lg:text-4xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Four pillars of cross-continental B2B
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="p-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/15 flex items-center justify-center mb-5">
                <p.icon className="w-5 h-5 text-[var(--amber-dark)]" />
              </div>
              <h3
                className="text-lg font-bold text-[var(--obsidian)] mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {p.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  const testimonials = [
    {
      quote:
        "We reduced our sourcing costs by 35% by going direct through Silk Road. The escrow system gives us confidence we never had with wire transfers.",
      name: "Amara Diallo",
      role: "Procurement Manager",
      company: "TechHub Ghana",
      avatar: "AD",
    },
    {
      quote:
        "Finally a platform that understands African commodity trade. We now export our specialty coffee directly to Guangzhou buyers.",
      name: "Jean-Pierre Habimana",
      role: "Export Director",
      company: "Gorilla Coffee Co-op, Rwanda",
      avatar: "JH",
    },
    {
      quote:
        "通过Silk Road平台，我们成功开拓了非洲市场。平台的中文界面和支付宝集成让交易变得简单。",
      name: "张海明",
      role: "总经理",
      company: "广州华南电子有限公司",
      avatar: "张",
    },
  ];

  return (
    <section className="py-24 bg-[var(--obsidian)] relative overflow-hidden">
      <div
        className="absolute top-0 left-1/3 w-[500px] h-[500px] opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(212,168,83,0.06), transparent 70%)",
        }}
      />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16 pb-16 border-b border-white/[0.06]">
          {[
            { value: "$2.4B+", label: "Trade Volume", icon: TrendingUp },
            { value: "12,000+", label: "Verified Suppliers", icon: Users },
            { value: "54", label: "African Countries", icon: Globe },
            { value: "98.2%", label: "Satisfaction Rate", icon: Star },
          ].map((stat) => (
            <div key={stat.label} className="text-center lg:text-left">
              <stat.icon className="w-5 h-5 text-[var(--amber)] mx-auto lg:mx-0 mb-3 opacity-70" />
              <div
                className="text-3xl lg:text-4xl font-bold text-[var(--ivory)] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {stat.value}
              </div>
              <div className="text-sm text-white/35 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div>
          <span className="text-xs font-semibold text-[var(--amber)] tracking-[0.15em] uppercase">
            Trusted by Businesses Across Two Continents
          </span>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-[var(--amber)] fill-[var(--amber)]"
                    />
                  ))}
                </div>
                <p className="text-sm text-white/65 leading-relaxed mb-5">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--amber)]/15 border border-[var(--amber)]/25 flex items-center justify-center text-sm font-bold text-[var(--amber)]">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--ivory)]">
                      {t.name}
                    </div>
                    <div className="text-xs text-white/30">
                      {t.role}, {t.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 bg-[var(--surface-secondary)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="rounded-3xl bg-[var(--obsidian)] p-12 lg:p-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <h2
              className="text-3xl lg:text-4xl font-bold text-[var(--ivory)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Start trading across continents
              <span className="text-[var(--amber)]">.</span>
            </h2>
            <p className="mt-4 text-white/55 max-w-lg">
              Free to join. No listing fees for the first 50 products.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
            <Link
              href="/auth/register?role=buyer"
              className="btn-primary !py-3.5 !px-7"
            >
              I Want to Buy
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register?role=supplier"
              className="btn-secondary !py-3.5 !px-7"
            >
              I Want to Sell
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <PageHeader />
        <TradeFlowDiagram />
        <Pillars />
        <SocialProof />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
