import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Terms of Service — Silk Road Africa",
  description:
    "Terms governing use of Silk Road Africa, the cross-border B2B marketplace connecting African buyers with Chinese suppliers.",
};

const LAST_UPDATED = "April 23, 2026";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="pt-[184px] pb-16 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <div className="max-w-[1000px] mx-auto px-6 lg:px-10">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-5">
              <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[var(--text-primary)]">Terms</span>
            </div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              Legal
            </span>
            <h1
              className="mt-3 text-4xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)] leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Terms of Service
            </h1>
            <p className="mt-4 text-sm text-[var(--text-tertiary)]">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="max-w-[760px] mx-auto px-6 lg:px-10 prose-legal">
            <p className="lead">
              These Terms govern your access to and use of Silk Road Africa (the
              &quot;Service&quot;). By creating an account, placing an order, or using the
              Service, you agree to these Terms.
            </p>

            <h2>1. The Service</h2>
            <p>
              Silk Road Africa operates a curated, single-direction B2B marketplace
              where buyers located in Africa purchase goods sourced from verified
              suppliers in China. We handle sourcing, quotation, payment escrow,
              logistics coordination, customs, and last-mile delivery.
            </p>
            <p>
              Supplier identity is not disclosed to buyers, and buyer identity is
              not disclosed to suppliers. Orders are placed with Silk Road Africa,
              and we transact with suppliers on your behalf.
            </p>

            <h2>2. Eligibility and accounts</h2>
            <ul>
              <li>
                You must be at least 18 and have authority to bind the business you
                represent.
              </li>
              <li>
                Information you provide — including KYC and company details — must
                be accurate and kept current.
              </li>
              <li>You are responsible for all activity under your account.</li>
              <li>
                We may suspend or close accounts for violations of these Terms,
                applicable law, or our risk policies.
              </li>
            </ul>

            <h2>3. Buyer obligations</h2>
            <ul>
              <li>
                Provide accurate product requirements, quantities, and destination
                details when placing a request.
              </li>
              <li>
                Pay the quoted amount in full (or the deposit, if agreed) within
                the validity window.
              </li>
              <li>
                Confirm receipt of goods promptly and raise any disputes within the
                inspection window stated on the order.
              </li>
              <li>
                Comply with all applicable import laws in the destination country,
                including customs declarations, duties, and product standards.
              </li>
            </ul>

            <h2>4. Pricing, quotations, and orders</h2>
            <ul>
              <li>
                Quotations are valid for the period stated on the quotation. Prices
                may change after expiry due to raw-material or FX movement.
              </li>
              <li>
                An order is formed only when we confirm it in writing (in-app order
                confirmation or emailed PI). Prior messages, cart contents, and
                quotations are not binding.
              </li>
              <li>
                All prices are in USD unless stated otherwise. Local-currency
                display is indicative and subject to conversion at payment time.
              </li>
            </ul>

            <h2>5. Payments</h2>
            <ul>
              <li>
                We accept mobile money (MTN MoMo, M-Pesa, Airtel Money), bank
                transfer, and card (via Stripe) depending on your country.
              </li>
              <li>
                Payments are held in escrow until you confirm delivery or the
                inspection period lapses.
              </li>
              <li>
                Failed payments, chargebacks, or reversals may delay or cancel an
                order.
              </li>
              <li>
                You are responsible for any bank, mobile-money, or FX fees charged
                by your provider.
              </li>
            </ul>

            <h2>6. Shipping, customs, and delivery</h2>
            <ul>
              <li>
                Shipping timelines are estimates, not guarantees. Ocean freight
                typically runs 30–55 days door-to-door; air freight 7–15 days.
              </li>
              <li>
                Unless stated otherwise, orders are shipped DDP (Delivered Duty
                Paid) — we handle customs, duties, and last-mile delivery.
              </li>
              <li>
                Delays caused by customs inspections, force majeure, port
                congestion, or incorrect recipient information are not
                compensable delays under these Terms.
              </li>
            </ul>

            <h2>7. Inspection, disputes, and refunds</h2>
            <ul>
              <li>
                Inspect goods on arrival. Report shortages, damage, or non-conformity
                within the inspection window stated on the order (typically 7
                business days).
              </li>
              <li>
                We will investigate claims with the supplier and third-party
                inspectors where applicable.
              </li>
              <li>
                Remedies may include replacement, partial refund, or full refund,
                depending on the finding.
              </li>
              <li>
                Claims submitted outside the inspection window are generally not
                eligible unless the defect was latent and reported promptly on
                discovery.
              </li>
            </ul>

            <h2>8. Prohibited items and conduct</h2>
            <p>You may not use the Service to source or ship:</p>
            <ul>
              <li>Weapons, ammunition, explosives, or military-use items.</li>
              <li>
                Controlled substances, precursors, or items banned under the
                destination country&apos;s import law.
              </li>
              <li>
                Counterfeits, items infringing third-party IP, or items bearing
                false country-of-origin marks.
              </li>
              <li>
                Goods subject to sanctions or destined for sanctioned parties.
              </li>
              <li>Live animals, untested pharmaceuticals, or hazardous materials without prior written approval.</li>
            </ul>
            <p>
              You must not reverse-engineer, scrape, or resell Service data. See{" "}
              <Link href="/compliance">Trade Compliance</Link> for the full list.
            </p>

            <h2>9. Intellectual property</h2>
            <p>
              The Service, including software, branding, and content, is owned by
              Silk Road Africa or its licensors. You receive a limited,
              non-transferable right to use the Service for its intended purpose.
            </p>

            <h2>10. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, our total aggregate liability
              to you for any claim arising out of or relating to the Service is
              capped at the greater of (a) the fees actually paid by you for the
              order at issue in the preceding 12 months, or (b) USD 500.
            </p>
            <p>
              We are not liable for indirect, incidental, consequential, or
              loss-of-profit damages.
            </p>

            <h2>11. Indemnity</h2>
            <p>
              You agree to indemnify Silk Road Africa against claims arising from
              your breach of these Terms, your misrepresentation of goods or
              intended use, or your violation of applicable law.
            </p>

            <h2>12. Changes</h2>
            <p>
              We may update these Terms. Material changes take effect 14 days after
              notice. Continued use after the effective date constitutes acceptance.
            </p>

            <h2>13. Governing law and disputes</h2>
            <p>
              These Terms are governed by the laws of Rwanda. Disputes are first
              attempted through good-faith negotiation, then binding arbitration in
              Kigali under the Kigali International Arbitration Centre rules. This
              does not limit consumer-protection rights you may have under local
              law in your jurisdiction.
            </p>

            <h2>14. Contact</h2>
            <p>
              Silk Road Africa · Kigali · Lagos · Guangzhou
              <br />
              Email: <a href="mailto:legal@silkroadafrica.com">legal@silkroadafrica.com</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
