import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
  Shield,
  Truck,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import { RegionPicker } from "@/components/ui/region-picker";

type FooterColumn = { headingKey: string; links: { labelKey: string; href: string }[] };

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    headingKey: "shopHeading",
    links: [
      { labelKey: "shopAllProducts", href: "/marketplace" },
      { labelKey: "shopAfricanCommodities", href: "/commodities" },
      { labelKey: "shopVerifiedSuppliers", href: "/suppliers" },
      { labelKey: "shopNewArrivals", href: "/marketplace?sort=newest" },
      { labelKey: "shopFeaturedDeals", href: "/marketplace?featured=1" },
    ],
  },
  {
    headingKey: "buyHeading",
    links: [
      { labelKey: "buyHowToBuy", href: "/how-to-buy" },
      { labelKey: "buyRfq", href: "/dashboard/rfq" },
      { labelKey: "buyTradeAssurance", href: "/trade-assurance" },
      { labelKey: "buyBuyerProtection", href: "/buyer-protection" },
      { labelKey: "buyPaymentMethods", href: "/payments" },
      { labelKey: "buyCustoms", href: "/customs" },
    ],
  },
  {
    headingKey: "sellHeading",
    links: [
      { labelKey: "sellBecomeSupplier", href: "/sell" },
      { labelKey: "sellSupplierCenter", href: "/supplier-center" },
      { labelKey: "sellVerification", href: "/verification" },
      { labelKey: "sellFees", href: "/fees" },
      { labelKey: "sellAdvertising", href: "/advertising" },
      { labelKey: "sellApi", href: "/api" },
    ],
  },
  {
    headingKey: "servicesHeading",
    links: [
      { labelKey: "servicesLogistics", href: "/logistics" },
      { labelKey: "servicesMobileMoney", href: "/payments#mobile-money" },
      { labelKey: "servicesInspection", href: "/inspection" },
      { labelKey: "servicesFinancing", href: "/financing" },
      { labelKey: "servicesInsurance", href: "/insurance" },
    ],
  },
  {
    headingKey: "companyHeading",
    links: [
      { labelKey: "companyAbout", href: "/about" },
      { labelKey: "companyCareers", href: "/careers" },
      { labelKey: "companyPress", href: "/press" },
      { labelKey: "companyBlog", href: "/resources" },
      { labelKey: "companyContact", href: "/contact" },
      { labelKey: "companyHelp", href: "/help" },
    ],
  },
];

const TRADE_REGIONS = [
  "Nigeria",
  "Kenya",
  "Rwanda",
  "Ethiopia",
  "Tanzania",
  "Ghana",
  "South Africa",
  "Côte d'Ivoire",
  "Senegal",
  "Uganda",
  "Egypt",
  "Morocco",
  "Guangdong",
  "Zhejiang",
  "Fujian",
  "Shanghai",
];

const TRUST_BADGES = [
  { icon: Shield, titleKey: "trust1Title", bodyKey: "trust1Body" },
  { icon: Truck, titleKey: "trust2Title", bodyKey: "trust2Body" },
  { icon: CreditCard, titleKey: "trust3Title", bodyKey: "trust3Body" },
  { icon: MessageCircle, titleKey: "trust4Title", bodyKey: "trust4Body" },
];

export function Footer() {
  const t = useTranslations("marketing.footer");
  return (
    <footer className="bg-white border-t border-[var(--border-subtle)]">
      {/* Trust badges row */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {TRUST_BADGES.map((b) => (
              <div key={b.titleKey} className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white border border-[var(--border-subtle)] flex items-center justify-center">
                  <b.icon className="w-5 h-5 text-[var(--amber-dark)]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--obsidian)]">
                    {t(b.titleKey)}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">{t(b.bodyKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        {/* Newsletter / CTA */}
        <div className="py-12 border-b border-[var(--border-subtle)] flex flex-col lg:flex-row gap-8 lg:items-end justify-between">
          <div className="max-w-md">
            <h3
              className="text-2xl lg:text-3xl font-bold text-[var(--obsidian)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("newsletterTitle")}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t("newsletterBody")}
            </p>
          </div>
          <form className="flex w-full lg:w-auto max-w-md gap-2">
            <input
              type="email"
              placeholder={t("newsletterPlaceholder")}
              className="flex-1 lg:w-72 h-12 px-4 rounded-full border border-[var(--border-default)] bg-white text-sm outline-none focus:border-[var(--obsidian)] focus:shadow-[0_0_0_3px_rgba(212,168,83,0.15)] transition-all"
              required
            />
            <button
              type="submit"
              className="btn-primary !py-3 !px-6 !text-sm shrink-0"
            >
              {t("newsletterCta")}
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Links grid */}
        <div className="py-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.headingKey}>
              <h4 className="text-xs font-bold text-[var(--obsidian)] tracking-[0.08em] uppercase mb-4">
                {t(col.headingKey)}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline underline-offset-4 transition-colors"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trade regions */}
        <div className="py-8 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-3 font-semibold tracking-[0.08em] uppercase">
            {t("regionsHeading")}
          </p>
          <div className="flex flex-wrap gap-2">
            {TRADE_REGIONS.map((region) => (
              <Link
                key={region}
                href={`/marketplace?region=${region.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-secondary)] rounded-full border border-[var(--border-subtle)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {region}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-8 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--amber)] to-[var(--amber-dark)] flex items-center justify-center">
                <span
                  className="font-black text-[var(--obsidian)] text-xs"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  SR
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--obsidian)]">
                  Silk Road Africa
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">
                  {t("copyright", { year: new Date().getFullYear() })}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Kigali · Lagos · Guangzhou
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> trade@silkroadafrica.com
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> +250 788 000 000
              </span>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-3">
            <RegionPicker variant="full" />
            <div className="flex items-center gap-5 text-xs text-[var(--text-tertiary)]">
              <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">
                {t("privacy")}
              </Link>
              <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">
                {t("terms")}
              </Link>
              <Link href="/compliance" className="hover:text-[var(--text-primary)] transition-colors">
                {t("compliance")}
              </Link>
              <Link href="/cookies" className="hover:text-[var(--text-primary)] transition-colors">
                {t("cookies")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
