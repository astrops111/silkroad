import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Silk Road Africa",
  description:
    "How Silk Road Africa collects, uses, protects, and shares buyer and supplier data across our China-to-Africa B2B platform.",
};

const LAST_UPDATED = "April 23, 2026";

export default function PrivacyPage() {
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
              <span className="text-[var(--text-primary)]">Privacy</span>
            </div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              Legal
            </span>
            <h1
              className="mt-3 text-4xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)] leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm text-[var(--text-tertiary)]">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="max-w-[760px] mx-auto px-6 lg:px-10 prose-legal">
            <p className="lead">
              Silk Road Africa (&quot;we&quot;, &quot;us&quot;) operates a cross-border B2B marketplace
              that connects buyers in Africa with verified suppliers in China. This
              policy explains what personal and business data we collect, how we use
              and share it, and the choices you have.
            </p>

            <h2>1. Information we collect</h2>
            <p>We collect the following categories of information:</p>
            <ul>
              <li>
                <strong>Account data</strong> — name, email, phone, company name,
                country, role (buyer/supplier), language preference.
              </li>
              <li>
                <strong>Verification / KYC data</strong> — national ID or passport,
                business registration documents, tax ID, beneficial-owner details
                (suppliers and high-value buyers only).
              </li>
              <li>
                <strong>Transaction data</strong> — orders, quotations, RFQs,
                shipping addresses, invoice records, dispute history.
              </li>
              <li>
                <strong>Payment data</strong> — mobile-money numbers (MTN MoMo,
                M-Pesa, Airtel Money), bank-transfer references, escrow-release
                instructions. We do not store full card numbers; card payments are
                handled by Stripe.
              </li>
              <li>
                <strong>Device and usage data</strong> — IP address, browser type,
                pages visited, referral source, session identifiers.
              </li>
              <li>
                <strong>Communications</strong> — messages between buyers and our
                sourcing team, support tickets, inspection reports.
              </li>
            </ul>

            <h2>2. How we use your data</h2>
            <ul>
              <li>
                Operate the marketplace: match buyer requests to suppliers, issue
                quotations, process orders, coordinate logistics and customs.
              </li>
              <li>
                Process payments, release escrow, issue refunds, and resolve
                disputes.
              </li>
              <li>
                Run sanctions / denied-party screening and comply with export, import,
                and anti-money-laundering obligations in China and in destination
                countries.
              </li>
              <li>
                Communicate order updates, shipment tracking, and service notices via
                email, SMS, or WhatsApp.
              </li>
              <li>
                Improve the platform, detect fraud, and secure accounts.
              </li>
              <li>
                Marketing — only with your consent, which you can withdraw at any
                time.
              </li>
            </ul>

            <h2>3. How we share data</h2>
            <p>
              Silk Road Africa deliberately sits between buyers and suppliers: buyer
              identity is not exposed to suppliers by default, and supplier identity
              is not exposed to buyers. We share only the minimum necessary:
            </p>
            <ul>
              <li>
                <strong>Suppliers</strong> receive the shipping destination country,
                order specifications, and quantity — not your name, company, or
                contact.
              </li>
              <li>
                <strong>Logistics providers</strong> (freight forwarders, customs
                brokers, last-mile couriers) receive recipient name, address, phone,
                and commodity description as required to deliver.
              </li>
              <li>
                <strong>Payment processors</strong> (Stripe, mobile-money operators,
                banks) receive payment amounts and references.
              </li>
              <li>
                <strong>Authorities</strong> — customs, tax, law enforcement — when
                legally required.
              </li>
              <li>
                <strong>Service providers</strong> bound by confidentiality (cloud
                hosting, analytics, email, inspection agencies).
              </li>
            </ul>
            <p>
              We do not sell personal data.
            </p>

            <h2>4. Cross-border transfers</h2>
            <p>
              Because our platform connects China and Africa, personal data is
              transferred across borders. We rely on contractual safeguards and, where
              applicable, standard contractual clauses. See our{" "}
              <Link href="/compliance">Trade Compliance</Link> page for additional
              export / import considerations.
            </p>

            <h2>5. Data retention</h2>
            <ul>
              <li>Account data — kept while your account is active, plus 24 months.</li>
              <li>
                Transaction and invoice records — retained for 7 years to meet tax
                and accounting obligations.
              </li>
              <li>KYC documents — retained for 5 years after last activity.</li>
              <li>
                Support and communications — kept up to 36 months unless tied to an
                open dispute.
              </li>
            </ul>

            <h2>6. Your rights</h2>
            <p>
              Depending on where you live, you may have the right to access,
              correct, delete, restrict, or port your data, and to object to
              certain processing. To exercise these rights, email{" "}
              <a href="mailto:privacy@silkroadafrica.com">privacy@silkroadafrica.com</a>.
              We will respond within 30 days.
            </p>

            <h2>7. Security</h2>
            <p>
              We use encryption in transit, encrypted storage, access controls, and
              audit logging. No system is perfectly secure — if you suspect a
              compromise, contact{" "}
              <a href="mailto:security@silkroadafrica.com">
                security@silkroadafrica.com
              </a>
              .
            </p>

            <h2>8. Children</h2>
            <p>
              The platform is intended for businesses and their authorised
              representatives. It is not directed at children under 18.
            </p>

            <h2>9. Changes to this policy</h2>
            <p>
              We may update this policy as the platform evolves. Material changes
              will be announced via email or in-app notice at least 14 days before
              taking effect.
            </p>

            <h2>10. Contact</h2>
            <p>
              Silk Road Africa · Kigali · Lagos · Guangzhou
              <br />
              Email: <a href="mailto:privacy@silkroadafrica.com">privacy@silkroadafrica.com</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
