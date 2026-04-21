import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "How It Works — Silk Road Africa",
  description:
    "Bidirectional B2B commerce across China and Africa. Discover, quote, pay, and ship — the four-step process and the trade flows that move through Silk Road.",
};

function PageHeader() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--border-subtle)] pt-[148px] pb-20 lg:pb-28">
      <Image
        src="https://images.pexels.com/photos/15378707/pexels-photo-15378707.jpeg?auto=compress&cs=tinysrgb&w=1800"
        alt="Cargo trucks moving goods across borders"
        fill
        priority
        sizes="100vw"
        className="object-cover -z-10"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--obsidian)]/85 via-[var(--obsidian)]/65 to-[var(--obsidian)]/30" />

      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <span className="text-xs font-semibold text-[var(--amber)] tracking-[0.15em] uppercase">
          How Silk Road Works
        </span>
        <h1
          className="mt-4 text-4xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.05]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Two continents. One platform. Four steps.
        </h1>
        <p className="mt-5 text-lg text-white/80 max-w-2xl leading-relaxed">
          From discovery to delivery, Silk Road handles the complexity of
          China–Africa trade so you can focus on growing your business.
        </p>
      </div>
    </section>
  );
}

function TradeDirections() {
  const flows = [
    {
      direction: "China → Africa",
      tag: "Manufactured Goods",
      tagColor:
        "bg-[var(--indigo)]/10 text-[var(--indigo)] border-[var(--indigo)]/20",
      title: "Source from 12,000+ verified Chinese factories",
      desc: "Electronics, machinery, textiles, construction materials, auto parts — direct from manufacturers with MOQ as low as 10 units.",
      categories: [
        { icon: Zap, name: "Electronics", count: "3,400+" },
        { icon: Factory, name: "Machinery", count: "2,100+" },
        { icon: Package, name: "Textiles", count: "1,800+" },
        { icon: Truck, name: "Construction", count: "1,200+" },
      ],
      accent: "var(--indigo)",
      accentLight: "var(--indigo-light)",
      cta: "Browse Products",
      href: "/marketplace",
    },
    {
      direction: "Africa → China",
      tag: "Natural Resources & Commodities",
      tagColor:
        "bg-[var(--terracotta)]/10 text-[var(--terracotta)] border-[var(--terracotta)]/20",
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
      cta: "Browse Commodities",
      href: "/commodities",
    },
  ];

  return (
    <section className="py-24 bg-[var(--surface-primary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
            Bidirectional Commerce
          </span>
          <h2
            className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What flows through Silk Road
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
                        {cat.count} listings
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
      desc: "Pay via escrow or mobile money. Funds held safely until you confirm delivery and quality.",
    },
    {
      number: "04",
      icon: Truck,
      title: "Ship & Track",
      desc: "Door-to-door logistics with real-time tracking, customs documentation, and insurance.",
    },
  ];

  return (
    <section className="py-24 bg-[var(--surface-secondary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
          <div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              The Process
            </span>
            <h2
              className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Four steps, end to end
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] max-w-sm leading-relaxed lg:text-right">
            From the first search to the last-mile delivery, Silk Road handles
            the complexity.
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
  return (
    <section className="py-20 bg-[var(--surface-primary)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="rounded-3xl bg-[var(--obsidian)] p-10 lg:p-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <h2
              className="text-2xl lg:text-3xl font-bold text-[var(--ivory)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to start your first order?
            </h2>
            <p className="mt-3 text-white/55 max-w-lg">
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
