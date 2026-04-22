import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "How to Buy — Silk Road Africa",
  description:
    "Step-by-step guide to placing a B2B order on Silk Road Africa: browse curated China-sourced products, place a request, pay via mobile money or bank transfer, and receive door-to-door delivery across Africa.",
};

function PageHeader() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--border-subtle)] pt-[184px] pb-20 lg:pb-28">
      <Image
        src="https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=1800"
        alt="Warehouse workers packing goods"
        fill
        priority
        sizes="100vw"
        className="object-cover -z-10"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--obsidian)]/85 via-[var(--obsidian)]/65 to-[var(--obsidian)]/30" />

      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="flex items-center gap-2 text-xs text-white/70 mb-5">
          <Link href="/how-it-works" className="hover:text-white transition-colors">
            How it works
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/90">How to buy</span>
        </div>
        <span className="text-xs font-semibold text-[var(--amber)] tracking-[0.15em] uppercase">
          Buyer Guide
        </span>
        <h1
          className="mt-4 text-4xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.05]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          How to buy on Silk Road Africa
        </h1>
        <p className="mt-5 text-lg text-white/80 max-w-2xl leading-relaxed">
          Place your first B2B order in minutes. We source from verified Chinese
          factories and handle logistics, customs, and last-mile delivery to your
          door — so you only pay for what actually arrives.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link href="/marketplace" className="btn-primary !py-3.5 !px-7">
            Browse the marketplace
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/register?role=buyer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-white/25 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            Create a buyer account
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowToBuySteps() {
  const steps = [
    {
      number: "01",
      icon: Search,
      title: "Browse or search the marketplace",
      desc: "Find products across Home, Hotels, Consumer Electronics, Beauty, Groceries, and Baby categories. Filter by MOQ, destination country, and delivery window.",
      bullets: [
        "12,000+ SKUs curated from verified Chinese manufacturers",
        "Every listing shows a landed price for your country",
        "Save items to your shortlist without an account",
      ],
    },
    {
      number: "02",
      icon: ShoppingCart,
      title: "Add items to your cart or submit an RFQ",
      desc: "For listed SKUs, add to cart with your required quantity. For custom specs, packaging, or volumes above listing MOQ, submit a Request for Quotation.",
      bullets: [
        "Mix multiple items in a single consolidated shipment",
        "Specify delivery country, incoterm, and target date",
        "Receive a binding platform quote within 24 hours",
      ],
    },
    {
      number: "03",
      icon: ClipboardList,
      title: "Place your order",
      desc: "Submit the order from your buyer dashboard. Silk Road Africa takes ownership end-to-end — you deal with one party, not a list of factories.",
      bullets: [
        "One contract, one invoice, one point of contact",
        "Supplier identities are handled by the platform",
        "Order status visible in real time from your dashboard",
      ],
    },
    {
      number: "04",
      icon: Wallet,
      title: "Pay the way your business already pays",
      desc: "Funds are held in Trade Assurance escrow — released to us only after you confirm the goods arrived in the state you ordered.",
      bullets: [
        "MTN MoMo, Airtel Money, M-Pesa, Orange Money",
        "USD / EUR / CNY bank transfer and SWIFT",
        "LC and open-account terms for qualifying buyers",
      ],
    },
    {
      number: "05",
      icon: Truck,
      title: "We source, ship, and clear customs",
      desc: "Our own logistics network moves your order from the factory gate to a bonded warehouse near you. Track every leg of the journey inside your dashboard.",
      bullets: [
        "Door-to-door across 27+ African countries",
        "Customs documentation and duties handled for you",
        "Cargo insurance included on every order",
      ],
    },
    {
      number: "06",
      icon: PackageCheck,
      title: "Receive, inspect, and confirm",
      desc: "Sign for the delivery, inspect the goods, and confirm in your dashboard. Only then is escrow released. Raise a dispute in one click if anything is wrong.",
      bullets: [
        "7-day inspection window on every order",
        "Mediated dispute resolution with full refund protection",
        "Re-order from your history with a single click",
      ],
    },
  ];

  return (
    <section id="how-to-buy" className="py-24 bg-[var(--surface-secondary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-14 gap-6">
          <div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              Step by Step
            </span>
            <h2
              className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-[var(--obsidian)] max-w-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              From browsing to doorstep — six steps
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] max-w-sm leading-relaxed lg:text-right">
            You place one order with Silk Road Africa. We handle sourcing,
            shipping, and customs as a single party so you never coordinate
            multiple factories yourself.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {steps.map((step) => (
            <article
              key={step.number}
              className="relative p-7 lg:p-8 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
            >
              <span
                className="absolute top-5 right-6 text-[3.75rem] font-black text-[var(--obsidian)]/[0.04] leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {step.number}
              </span>
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/15 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-[var(--amber-dark)]" />
                </div>
                <h3
                  className="text-xl font-bold text-[var(--obsidian)] mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.desc}
                </p>
                <ul className="mt-5 space-y-2">
                  {step.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[var(--amber-dark)] mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Protections() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Trade Assurance on every order",
      body: "Payments are held in escrow until you confirm delivery and quality. Mediated dispute resolution within 72 hours.",
    },
    {
      icon: CreditCard,
      title: "No direct supplier payment",
      body: "You pay Silk Road Africa, not the factory. One invoice, one party accountable for the whole order.",
    },
    {
      icon: Truck,
      title: "Platform-owned last mile",
      body: "Our own drivers and bonded warehouses deliver across Africa. No third-party handoffs between port and your door.",
    },
  ];

  return (
    <section className="py-24 bg-[var(--surface-primary)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
            Buyer Protection
          </span>
          <h2
            className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your money is safe until the goods are in your hands
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.title}
              className="p-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--indigo)]/10 border border-[var(--indigo)]/15 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-[var(--indigo)]" />
              </div>
              <h3
                className="text-lg font-bold text-[var(--obsidian)] mb-1.5"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Do I need an account to browse?",
      a: "No. You can browse the full marketplace, compare products, and build a shortlist without signing up. You only need an account to place an order or submit an RFQ.",
    },
    {
      q: "Can I talk to the supplier directly?",
      a: "No — Silk Road Africa is the single party on every order. This keeps pricing consistent, protects you from supplier disputes, and makes us accountable for the whole delivery.",
    },
    {
      q: "What currencies can I pay in?",
      a: "You can pay in your local currency (KES, NGN, GHS, ZAR, RWF, UGX, TZS and more) via mobile money and bank transfer, or in USD / EUR / CNY via SWIFT.",
    },
    {
      q: "What happens if the goods arrive damaged?",
      a: "Raise a dispute from your dashboard within 7 days of delivery. Escrow stays frozen until resolution. Most disputes close within 72 hours with a full or partial refund.",
    },
    {
      q: "What's the minimum order?",
      a: "MOQ is set per listing — many products start at 10 units. Consolidate multiple SKUs into one shipment to hit MOQ thresholds without over-ordering.",
    },
    {
      q: "How long does delivery take?",
      a: "Typically 18–35 days door-to-door depending on destination country and whether the order ships by sea or air. Every quote includes a delivery window.",
    },
  ];

  return (
    <section className="py-24 bg-[var(--surface-secondary)]">
      <div className="max-w-[980px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
            Frequently Asked
          </span>
          <h2
            className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Common buyer questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-[var(--border-subtle)] bg-white p-6 open:shadow-[var(--shadow-sm)]"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                <span className="text-base font-semibold text-[var(--obsidian)]">
                  {item.q}
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                {item.a}
              </p>
            </details>
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
              Ready to place your first order?
            </h2>
            <p className="mt-3 text-white/55 max-w-lg">
              Create a buyer account in under a minute. No listing fees, no
              subscription — you only pay for the goods you order.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
            <Link href="/marketplace" className="btn-primary !py-3.5 !px-7">
              Browse products
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register?role=buyer"
              className="btn-secondary !py-3.5 !px-7"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HowToBuyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <PageHeader />
        <HowToBuySteps />
        <Protections />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
