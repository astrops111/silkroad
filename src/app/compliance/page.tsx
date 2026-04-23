import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Trade Compliance — Silk Road Africa",
  description:
    "How Silk Road Africa handles export controls, sanctions screening, import regulations, duties, product safety, and anti-counterfeit obligations across our China-to-Africa trade lanes.",
};

const LAST_UPDATED = "April 23, 2026";

export default function CompliancePage() {
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
              <span className="text-[var(--text-primary)]">Trade Compliance</span>
            </div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              Legal
            </span>
            <h1
              className="mt-3 text-4xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)] leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Trade Compliance
            </h1>
            <p className="mt-4 text-sm text-[var(--text-tertiary)]">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="max-w-[760px] mx-auto px-6 lg:px-10 prose-legal">
            <p className="lead">
              Cross-border B2B trade is regulated on both ends. This page describes
              how Silk Road Africa meets export obligations in China and import
              obligations in each destination country — and what we expect from
              buyers and suppliers on the platform.
            </p>

            <h2>1. Our shared responsibilities</h2>
            <p>
              Silk Road Africa acts as the merchant of record for orders placed
              through our platform. We coordinate customs clearance on both sides,
              but compliance is a shared responsibility:
            </p>
            <ul>
              <li>
                <strong>Suppliers</strong> are responsible for accurate product
                classification, origin declarations, and export licensing inside
                China.
              </li>
              <li>
                <strong>Buyers</strong> are responsible for ensuring the goods are
                lawful to import, use, and resell in the destination country, and
                for providing accurate recipient KYC where required.
              </li>
              <li>
                <strong>Silk Road Africa</strong> operates sanctions screening,
                curates the catalogue to exclude restricted items, arranges
                licensed freight forwarders and customs brokers, and retains
                records for audit.
              </li>
            </ul>

            <h2>2. Sanctions and denied-party screening</h2>
            <p>
              We screen buyers, suppliers, recipients, and beneficial owners against
              major sanctions and denied-party lists, including:
            </p>
            <ul>
              <li>UN Security Council Consolidated List</li>
              <li>OFAC (US) SDN and sectoral lists</li>
              <li>EU Consolidated Financial Sanctions List</li>
              <li>UK OFSI Consolidated List</li>
              <li>PRC Ministry of Commerce Unreliable Entity List</li>
              <li>Destination-country PEP and AML watchlists where available</li>
            </ul>
            <p>
              Screening runs at account creation, at order placement, and on an
              ongoing basis. Matches are reviewed; confirmed matches trigger
              refusal, suspension, and statutory reporting where required.
            </p>

            <h2>3. Export controls (China)</h2>
            <p>
              Our suppliers operate under China&apos;s Export Control Law, Customs Law,
              and related regulations. For the curated consumer categories we
              support — home, hotel supplies, consumer electronics, beauty, baby
              products, groceries — export licences are rarely required beyond
              standard customs declarations. Where a licence is required (for
              example, dual-use items), we will not ship until the supplier
              produces the licence and we independently verify it.
            </p>

            <h2>4. Import regulations (destinations)</h2>
            <p>
              Rules differ by country. We maintain country-by-country playbooks for
              our active lanes (Nigeria, Kenya, Rwanda, Ethiopia, Tanzania, Ghana,
              South Africa, Côte d&apos;Ivoire, Senegal, Uganda, Egypt, Morocco) covering:
            </p>
            <ul>
              <li>Pre-shipment inspection regimes (SONCAP, PVoC, COC, CTN, BESC).</li>
              <li>
                Product-category standards (SON, KEBS, RSB, SABS, GSB, etc.) for
                electronics, cosmetics, food, and children&apos;s goods.
              </li>
              <li>Labelling, language, and country-of-origin marking requirements.</li>
              <li>Duties, VAT, and exemption schemes such as AfCFTA where applicable.</li>
              <li>Restricted, prohibited, and controlled-goods lists.</li>
            </ul>

            <h2>5. Prohibited and restricted goods</h2>
            <p>
              The platform does not list, source, or ship:
            </p>
            <ul>
              <li>Weapons, ammunition, explosives, and military / dual-use items.</li>
              <li>Controlled substances, precursors, and untested pharmaceuticals.</li>
              <li>Counterfeits and items infringing third-party IP.</li>
              <li>
                Goods with false country-of-origin marks or falsified certificates.
              </li>
              <li>
                Endangered species and products regulated under CITES.
              </li>
              <li>Used goods misrepresented as new.</li>
              <li>
                Hazardous materials outside a dedicated HAZMAT workflow (contact us
                in advance).
              </li>
            </ul>
            <p>
              Additional category-specific restrictions apply by destination — for
              example, certain cosmetic actives, infant formula without local
              registration, or electronics above a specified battery capacity.
              These are surfaced at quotation time.
            </p>

            <h2>6. Product safety and certification</h2>
            <p>
              Where a product requires certification to be sold or used legally in
              the destination country, we coordinate:
            </p>
            <ul>
              <li>Certificates of conformity (COC / SONCAP / PVoC) where required.</li>
              <li>
                Factory audits and pre-shipment inspections through accredited third
                parties (SGS, Bureau Veritas, Intertek) for qualifying orders.
              </li>
              <li>
                Lab test reports for categories such as cosmetics, baby products,
                and electrical equipment.
              </li>
            </ul>
            <p>
              Inspection fees, where applicable, are itemised on your quotation.
            </p>

            <h2>7. Anti-counterfeit and IP</h2>
            <p>
              Brand owners may submit IP notices via{" "}
              <a href="mailto:ip@silkroadafrica.com">ip@silkroadafrica.com</a>. We
              remove infringing listings expeditiously and may terminate repeat
              infringers. Buyers sourcing branded goods must have, or warrant the
              supplier has, a legitimate licence to distribute that brand in the
              destination country.
            </p>

            <h2>8. Anti-money-laundering and counter-terrorist financing</h2>
            <p>
              We apply risk-based AML / CFT controls:
            </p>
            <ul>
              <li>KYC at onboarding for buyers, suppliers, and their beneficial owners.</li>
              <li>Enhanced due diligence for high-risk jurisdictions or large tickets.</li>
              <li>Transaction monitoring and unusual-activity review.</li>
              <li>Statutory reporting to competent authorities where required.</li>
            </ul>

            <h2>9. Records and audit</h2>
            <p>
              We retain order, customs, and screening records for at least 7 years.
              These records may be shared with regulators, tax authorities, and
              courts when legally required.
            </p>

            <h2>10. Report a concern</h2>
            <p>
              Compliance concerns, suspected sanctions evasion, or IP infringement:{" "}
              <a href="mailto:compliance@silkroadafrica.com">
                compliance@silkroadafrica.com
              </a>
              . Reports can be made anonymously; retaliation against reporters is
              prohibited.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
