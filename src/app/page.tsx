"use client";

import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import {
  ArrowUpRight,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  MessageSquare,
  CreditCard,
  Truck,
  CheckCircle2,
  Star,
  Users,
  Coffee,
  Gem,
  Leaf,
  Factory,
  Package,
  ChevronRight,
  Search,
  FileText,
} from "lucide-react";

/* ============================================================
   HERO SECTION (light, IKEA-style — single big tile)
   ============================================================ */
function HeroSection() {
  return (
    <section className="bg-[var(--surface-primary)] pt-[140px] pb-12 lg:pb-16">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4 lg:gap-5">
          {/* Primary lifestyle tile */}
          <Link
            href="/marketplace"
            className="group relative flex flex-col justify-end overflow-hidden rounded-2xl min-h-[480px] lg:min-h-[560px] p-8 lg:p-12 border border-[var(--border-subtle)] isolate"
          >
            <Image
              src="https://images.pexels.com/photos/33626641/pexels-photo-33626641.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt="Manufacturing factory floor"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03] -z-10"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 mb-5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)]" />
              <span className="text-[11px] font-semibold text-white tracking-wide uppercase">
                Zero-Tariff China–Africa Trade
              </span>
            </span>
            <h1
              className="text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-tight text-white max-w-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Source from 12,000 verified factories.
            </h1>
            <p className="mt-5 text-base lg:text-lg text-white/85 max-w-lg leading-relaxed">
              Electronics, machinery, textiles, construction — direct from
              Chinese manufacturers with MOQ as low as 10 units.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="btn-primary !py-3.5 !px-7 !text-sm">
                Browse products
                <ArrowUpRight className="w-4 h-4" />
              </span>
              <span className="text-sm text-white/70">
                Free to join · Trade assurance on every order
              </span>
            </div>
          </Link>

          {/* Secondary tile */}
          <Link
            href="/commodities"
            className="group relative flex flex-col justify-end overflow-hidden rounded-2xl min-h-[280px] lg:min-h-[560px] p-8 lg:p-10 border border-[var(--border-subtle)] isolate"
          >
            <Image
              src="https://images.pexels.com/photos/29892493/pexels-photo-29892493.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Coffee farmer with freshly harvested coffee cherries"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03] -z-10"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 mb-5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--terracotta-light)]" />
              <span className="text-[11px] font-semibold text-white tracking-wide uppercase">
                Africa → China
              </span>
            </span>
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.1] tracking-tight text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Export Africa&rsquo;s finest commodities.
            </h2>
            <p className="mt-4 text-sm lg:text-base text-white/85 max-w-md">
              Coffee, cocoa, tea, minerals, spices — connect directly with
              Chinese importers.
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white group-hover:gap-2.5 transition-all">
              Browse commodities
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        {/* Trust strip */}
        <div className="mt-10 lg:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-10 py-6 lg:py-8 border-y border-[var(--border-subtle)]">
          {[
            { value: "12,000+", label: "Verified suppliers" },
            { value: "$2.4B", label: "Annual GMV" },
            { value: "54", label: "African countries" },
            { value: "98.2%", label: "Satisfaction rate" },
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
   TRADE DIRECTIONS SECTION
   ============================================================ */
function TradeDirections() {
  const flows = [
    {
      direction: "China → Africa",
      tag: "Manufactured Goods",
      tagColor: "bg-[var(--indigo)]/10 text-[var(--indigo-light)] border-[var(--indigo)]/20",
      title: "Source from 12,000+ verified Chinese factories",
      desc: "Electronics, machinery, textiles, construction materials, auto parts, and more — direct from manufacturers with MOQ as low as 10 units.",
      categories: [
        { icon: Zap, name: "Electronics", count: "3,400+" },
        { icon: Factory, name: "Machinery", count: "2,100+" },
        { icon: Package, name: "Textiles", count: "1,800+" },
        { icon: Truck, name: "Construction", count: "1,200+" },
      ],
      accent: "var(--indigo)",
      accentLight: "var(--indigo-light)",
      glowClass: "bg-[var(--indigo)]/5",
      cta: "Browse Products",
      href: "/marketplace",
    },
    {
      direction: "Africa → China",
      tag: "Natural Resources & Commodities",
      tagColor: "bg-[var(--terracotta)]/10 text-[var(--terracotta-light)] border-[var(--terracotta)]/20",
      title: "Export Africa's finest to the world's largest market",
      desc: "Coffee, cocoa, tea, minerals, spices, and specialty crops — connecting cooperatives and producers directly with Chinese importers.",
      categories: [
        { icon: Coffee, name: "Coffee", count: "800+" },
        { icon: Leaf, name: "Tea & Spices", count: "450+" },
        { icon: Gem, name: "Minerals", count: "320+" },
        { icon: Package, name: "Cocoa", count: "280+" },
      ],
      accent: "var(--terracotta)",
      accentLight: "var(--terracotta-light)",
      glowClass: "bg-[var(--terracotta)]/5",
      cta: "Browse Commodities",
      href: "/commodities",
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-[var(--surface-primary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
            Bidirectional Commerce
          </span>
          <h2
            className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Two continents.
            <br />
            <span className="gradient-text-brand">One platform.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {flows.map((flow) => (
            <div
              key={flow.direction}
              className="group relative p-8 lg:p-10 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:shadow-xl transition-all duration-500 overflow-hidden"
            >
              {/* Glow */}
              <div
                className={`absolute -top-20 -right-20 w-64 h-64 rounded-full ${flow.glowClass} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
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
                  className="text-2xl lg:text-3xl font-bold text-[var(--obsidian)] tracking-tight leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {flow.title}
                </h3>

                <p className="mt-4 text-[var(--text-secondary)] leading-relaxed max-w-md">
                  {flow.desc}
                </p>

                {/* Category chips */}
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {flow.categories.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: `color-mix(in srgb, ${flow.accent} 12%, transparent)` }}
                      >
                        <cat.icon
                          className="w-4.5 h-4.5"
                          style={{ color: flow.accentLight }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {cat.name}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          {cat.count} listings
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href={flow.href}
                  className="inline-flex items-center gap-2 mt-8 text-sm font-semibold transition-colors"
                  style={{ color: flow.accentLight }}
                >
                  {flow.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   HOW IT WORKS SECTION
   ============================================================ */
function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Search,
      title: "Discover & Source",
      desc: "Browse verified suppliers, compare products, and find the best deals across categories.",
    },
    {
      number: "02",
      icon: FileText,
      title: "Request Quotation",
      desc: "Submit your requirements. Receive competitive quotes from multiple verified suppliers.",
    },
    {
      number: "03",
      icon: CreditCard,
      title: "Secure Payment",
      desc: "Pay via escrow. Funds are held safely until you confirm delivery and quality.",
    },
    {
      number: "04",
      icon: Truck,
      title: "Ship & Track",
      desc: "Door-to-door logistics with real-time tracking, customs documentation, and insurance.",
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-[var(--surface-secondary)] relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-6">
          <div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              Simple Process
            </span>
            <h2
              className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Four steps to
              <br />
              global trade
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] max-w-sm leading-relaxed lg:text-right">
            From discovery to delivery, we handle the complexity so you can
            focus on growing your business.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="group relative p-7 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] hover:border-[var(--amber)]/30 hover:shadow-lg transition-all duration-500"
            >
              {/* Step number watermark */}
              <span
                className="absolute top-4 right-5 text-[4rem] font-black text-[var(--obsidian)]/[0.03] leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {step.number}
              </span>

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/15 flex items-center justify-center mb-5 group-hover:bg-[var(--amber)]/15 transition-colors">
                  <step.icon className="w-5 h-5 text-[var(--amber-dark)]" />
                </div>
                <h3
                  className="text-lg font-bold text-[var(--obsidian)] mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {/* Arrow connector */}
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

/* ============================================================
   TRUST & FEATURES SECTION
   ============================================================ */
function TrustFeatures() {
  const features = [
    {
      icon: Shield,
      title: "Trade Assurance",
      desc: "Every transaction protected by platform escrow. Your payment is held securely until goods are received and verified.",
      tag: "Protection",
    },
    {
      icon: CheckCircle2,
      title: "Verified Suppliers",
      desc: "Rigorous KYC verification, factory inspections, and business license validation for every supplier on the platform.",
      tag: "Trust",
    },
    {
      icon: Globe,
      title: "6 Languages",
      desc: "Full platform support in English, 中文, Fran\u00e7ais, Kiswahili, Portugu\u00eas, and \u0627\u0644\u0639\u0631\u0628\u064a\u0629 with RTL support.",
      tag: "Global",
    },
    {
      icon: CreditCard,
      title: "Local Payments",
      desc: "MTN Mobile Money, Airtel Money, M-Pesa, Alipay, WeChat Pay, bank transfer — pay the way your business already pays.",
      tag: "Finance",
    },
    {
      icon: MessageSquare,
      title: "Real-Time Messaging",
      desc: "Built-in buyer-supplier chat with auto-translation, file sharing, and inquiry management.",
      tag: "Communication",
    },
    {
      icon: TrendingUp,
      title: "Smart Matching",
      desc: "AI-powered supplier matching based on your RFQ requirements, budget, and past trade patterns.",
      tag: "Intelligence",
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-[var(--surface-primary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
            Built for B2B Trade
          </span>
          <h2
            className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Trade infrastructure
            <br />
            you can trust
          </h2>
          <p className="mt-5 text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
            Purpose-built tools for international B2B commerce, designed for the
            unique needs of China-Africa trade.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-7 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--surface-primary)] hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-[var(--amber)]/8 border border-[var(--amber)]/12 flex items-center justify-center group-hover:bg-[var(--amber)]/12 transition-colors">
                  <feature.icon className="w-5 h-5 text-[var(--amber-dark)]" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.12em] uppercase">
                  {feature.tag}
                </span>
              </div>
              <h3
                className="text-lg font-bold text-[var(--obsidian)] mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {feature.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   SOCIAL PROOF / STATS SECTION
   ============================================================ */
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
        "\u901a\u8fc7Silk Road\u5e73\u53f0\uff0c\u6211\u4eec\u6210\u529f\u5f00\u62d3\u4e86\u975e\u6d32\u5e02\u573a\u3002\u5e73\u53f0\u7684\u4e2d\u6587\u754c\u9762\u548c\u652f\u4ed8\u5b9d\u96c6\u6210\u8ba9\u4ea4\u6613\u53d8\u5f97\u7b80\u5355\u3002",
      name: "\u5f20\u6d77\u660e",
      role: "\u603b\u7ecf\u7406",
      company: "\u5e7f\u5dde\u534e\u5357\u7535\u5b50\u6709\u9650\u516c\u53f8",
      avatar: "\u5f20",
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-[var(--obsidian)] relative overflow-hidden noise-overlay">
      <div className="absolute inset-0">
        <div
          className="absolute top-0 left-1/3 w-[500px] h-[500px] opacity-50"
          style={{
            background:
              "radial-gradient(ellipse, rgba(212,168,83,0.06), transparent 70%)",
          }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative z-10">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20 pb-20 border-b border-white/[0.06]">
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

        {/* Testimonials */}
        <div>
          <span className="text-xs font-semibold text-[var(--amber)] tracking-[0.15em] uppercase">
            Trusted by Businesses Across Two Continents
          </span>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-7 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-[var(--amber)] fill-[var(--amber)]"
                    />
                  ))}
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
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

/* ============================================================
   FEATURED CATEGORIES
   ============================================================ */
function FeaturedCategories() {
  const categories = [
    {
      name: "Consumer Electronics",
      count: "3,400+",
      image:
        "https://images.pexels.com/photos/7864622/pexels-photo-7864622.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Zap,
    },
    {
      name: "Premium Coffee",
      count: "800+",
      image:
        "https://images.pexels.com/photos/28487979/pexels-photo-28487979.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Coffee,
    },
    {
      name: "Minerals & Metals",
      count: "320+",
      image:
        "https://images.pexels.com/photos/33192/paddle-wheel-bucket-wheel-excavators-brown-coal-open-pit-mining.jpg?auto=compress&cs=tinysrgb&w=900",
      icon: Gem,
    },
    {
      name: "Machinery & Parts",
      count: "2,100+",
      image:
        "https://images.pexels.com/photos/33748032/pexels-photo-33748032.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Factory,
    },
    {
      name: "Organic Cocoa",
      count: "280+",
      image:
        "https://images.pexels.com/photos/3635147/pexels-photo-3635147.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Leaf,
    },
    {
      name: "Auto & Transport",
      count: "1,500+",
      image:
        "https://images.pexels.com/photos/15378707/pexels-photo-15378707.jpeg?auto=compress&cs=tinysrgb&w=900",
      icon: Truck,
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-[var(--surface-secondary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              Top Categories
            </span>
            <h2
              className="mt-4 text-3xl lg:text-4xl font-bold tracking-tight text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Browse by category
            </h2>
          </div>
          <Link
            href="/marketplace"
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-[var(--amber-dark)] hover:text-[var(--amber)] transition-colors"
          >
            View all categories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href="/marketplace"
              className="group relative flex flex-col justify-end p-6 h-48 lg:h-64 rounded-2xl overflow-hidden border border-[var(--border-subtle)] hover:shadow-lg transition-all duration-300 isolate"
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

              <div className="relative z-10">
                <h3
                  className="text-lg font-bold text-white mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {cat.name}
                </h3>
                <p className="text-sm text-white/75">{cat.count} products</p>
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
   CTA SECTION
   ============================================================ */
function CTASection() {
  return (
    <section className="py-24 lg:py-32 bg-[var(--surface-primary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="relative rounded-3xl overflow-hidden bg-[var(--obsidian)] p-12 lg:p-20">
          {/* Background effects */}
          <div className="absolute inset-0 grid-pattern opacity-15" />
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px]"
            style={{
              background:
                "radial-gradient(ellipse at top right, rgba(212,168,83,0.1), transparent 60%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px]"
            style={{
              background:
                "radial-gradient(ellipse at bottom left, rgba(196,93,62,0.08), transparent 60%)",
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
            <div>
              <h2
                className="text-3xl lg:text-5xl font-bold text-[var(--ivory)] tracking-tight leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Start trading
                <br />
                across continents
                <span className="text-[var(--amber)]">.</span>
              </h2>
              <p className="mt-5 text-lg text-white/40 max-w-lg leading-relaxed">
                Whether you&apos;re sourcing from China or exporting from Africa,
                Silk Road gives you the tools, protection, and connections to
                trade with confidence.
              </p>
            </div>

            <div className="flex flex-col gap-4 min-w-[240px]">
              <Link
                href="/auth/register?role=buyer"
                className="btn-primary !py-4 !px-8 !text-base w-full justify-center"
              >
                I Want to Buy
                <ArrowUpRight className="w-5 h-5" />
              </Link>
              <Link
                href="/auth/register?role=supplier"
                className="btn-secondary !py-4 !px-8 !text-base w-full justify-center"
              >
                I Want to Sell
              </Link>
              <p className="text-xs text-white/25 text-center mt-2">
                Free to join. No listing fees for the first 50 products.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TradeDirections />
        <FeaturedCategories />
        <HowItWorks />
        <TrustFeatures />
        <SocialProof />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
