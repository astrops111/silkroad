import type { Metadata } from "next";
import { Footer } from "@/components/ui/footer";
import { CaliforniaRequestForm } from "./request-form";

export const metadata: Metadata = {
  title: "California Privacy Rights — Silk Road Africa",
  description:
    "Exercise your California privacy rights under CCPA/CPRA. Submit requests to know, delete, correct, or opt out of the sale or sharing of your personal information.",
};

const PI_CATEGORIES = [
  {
    category: "Identifiers",
    examples: "Name, email, phone, business address, IP address, account ID",
    purpose: "Account creation, authentication, order fulfilment, fraud prevention",
  },
  {
    category: "Commercial information",
    examples: "Purchase history, RFQ records, order details, transaction amounts",
    purpose: "Order processing, dispute resolution, platform analytics",
  },
  {
    category: "Financial information",
    examples:
      "Payment method type (card / mobile money). Card numbers are not stored — processed by Stripe and Flutterwave.",
    purpose: "Payment processing",
  },
  {
    category: "Professional and business information",
    examples: "Company name, business registration, supplier tier, KYC documents",
    purpose: "Supplier verification, B2B trust and trade compliance",
  },
  {
    category: "Internet and network activity",
    examples: "Pages visited, platform search queries, device type, browser",
    purpose: "Platform improvement, security monitoring (analytics only with your consent)",
  },
  {
    category: "Geolocation (coarse)",
    examples: "Country and region derived from IP address or account settings",
    purpose: "Currency and pricing localisation, logistics routing",
  },
  {
    category: "Communications",
    examples: "Messages sent through the platform, RFQ correspondence with suppliers",
    purpose: "Trade facilitation, dispute resolution",
  },
];

const RIGHTS = [
  {
    right: "Right to Know",
    description:
      "You may request disclosure of the categories and specific pieces of personal information we have collected about you, the sources, our purposes for collecting it, and the third parties with whom we share it.",
  },
  {
    right: "Right to Delete",
    description:
      "You may request deletion of personal information we have collected from you, subject to certain exceptions — for example, information needed to complete a pending transaction or fulfil a legal obligation.",
  },
  {
    right: "Right to Correct",
    description:
      "You may request that we correct inaccurate personal information we maintain about you.",
  },
  {
    right: "Right to Opt-Out of Sale or Sharing",
    description:
      "You may direct us not to sell or share your personal information with third parties. We do not sell personal information for money. However, passing identifiers to analytics services (only with your consent) may constitute 'sharing' under CPRA. Submitting an opt-out request below also withdraws any recorded analytics consent.",
  },
  {
    right: "Right to Limit Use of Sensitive Personal Information",
    description:
      "Where we process sensitive personal information — such as financial data or government ID during KYC verification — you may request that we limit our use to what is strictly necessary to provide the service.",
  },
  {
    right: "Right to Non-Discrimination",
    description:
      "We will not discriminate against you for exercising any of these rights, including by denying service, charging different prices, or providing a degraded quality of service.",
  },
];

export default function CaliforniaPrivacyPage() {
  return (
    <>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <header>
          <p className="text-sm font-medium text-amber-700 uppercase tracking-wide mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-stone-900">California Privacy Rights</h1>
          <p className="mt-3 text-stone-500 text-sm">Last updated: May 9, 2026</p>
          <p className="mt-4 text-stone-700 leading-relaxed">
            If you are a California resident, the California Consumer Privacy Act (CCPA) and
            California Privacy Rights Act (CPRA) grant you specific rights regarding your personal
            information. This page explains those rights and how to exercise them.
          </p>
        </header>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mb-6">Your Rights</h2>
          <div className="space-y-5">
            {RIGHTS.map(({ right, description }) => (
              <div key={right} className="border-l-2 border-amber-200 pl-4">
                <h3 className="text-sm font-semibold text-stone-900">{right}</h3>
                <p className="text-sm text-stone-600 mt-1 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 12-month lookback disclosure required by CCPA */}
        <section>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">
            Personal Information We Collect
          </h2>
          <p className="text-sm text-stone-600 mb-5">
            Categories collected in the preceding 12 months:
          </p>
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-stone-50">
                  <th className="text-left py-2.5 px-3 font-medium text-stone-700 border-b border-stone-200 w-36">
                    Category
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-stone-700 border-b border-stone-200">
                    Examples
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-stone-700 border-b border-stone-200">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody>
                {PI_CATEGORIES.map(({ category, examples, purpose }, i) => (
                  <tr key={category} className={i % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                    <td className="py-2.5 px-3 font-medium text-stone-800 align-top border-b border-stone-100">
                      {category}
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 align-top border-b border-stone-100">
                      {examples}
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 align-top border-b border-stone-100">
                      {purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mb-3">
            Do We Sell or Share Personal Information?
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            We do not sell personal information for monetary consideration. We may share identifiers
            and usage data with analytics providers only when you have given explicit consent via our
            cookie banner. Under CPRA, this may constitute &ldquo;sharing.&rdquo; You can withdraw
            analytics consent at any time by clicking{" "}
            <strong className="text-stone-800">Cookie settings</strong> in the footer. Submitting an
            opt-out request below will also remove any recorded analytics consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mb-3">
            Third Parties We Share Data With
          </h2>
          <ul className="space-y-2 text-sm text-stone-600">
            {[
              ["Supabase", "Database and authentication infrastructure"],
              ["Stripe", "Card payment processing (PCI-DSS compliant)"],
              ["Flutterwave", "Africa mobile money and card processing"],
              ["MTN MoMo / Airtel / Tigo", "Mobile money operators"],
              ["OpenSanctions", "Sanctions and trade compliance screening"],
              ["Logistics partners", "Shipping documentation and customs clearance"],
              ["Google Analytics", "Only if you have given analytics consent"],
            ].map(([name, role]) => (
              <li key={name} className="flex gap-2">
                <span className="font-medium text-stone-800 shrink-0">{name}</span>
                <span className="text-stone-400">—</span>
                <span>{role}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Submit a Privacy Request</h2>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            We will verify your identity before processing the request and respond within 45 days.
            Complex requests may be extended to 90 days with notice. Authorised agents may submit on
            your behalf with written permission.
          </p>
          <CaliforniaRequestForm />
        </section>

        <section className="border-t border-stone-100 pt-8">
          <h2 className="text-xl font-semibold text-stone-900 mb-3">Contact Us</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            You may also submit requests by email at{" "}
            <a
              href="mailto:privacy@silkroad.africa"
              className="text-amber-700 underline underline-offset-2 hover:text-amber-800"
            >
              privacy@silkroad.africa
            </a>
            . Include{" "}
            <span className="font-medium text-stone-800">
              &ldquo;California Privacy Request&rdquo;
            </span>{" "}
            in the subject line and specify which right you are exercising.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
