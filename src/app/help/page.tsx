import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mail, Phone, MessageCircle, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.help");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function HelpPage() {
  const t = await getTranslations("marketing.help");

  const links = [
    { href: "/how-to-buy", label: t("linkHowToBuy") },
    { href: "/compliance", label: t("linkCompliance") },
    { href: "/terms", label: t("linkTerms") },
    { href: "/privacy", label: t("linkPrivacy") },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="pt-[184px] pb-16 lg:pb-20 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <div className="max-w-[900px] mx-auto px-6 lg:px-10">
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              {t("eyebrow")}
            </span>
            <h1
              className="mt-4 text-4xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)] leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("title")}
            </h1>
            <p className="mt-5 text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
              {t("subtitle")}
            </p>
            <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/20 max-w-xl">
              <MessageCircle className="w-5 h-5 text-[var(--amber-dark)] shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--text-secondary)]">{t("chatHint")}</p>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="max-w-[900px] mx-auto px-6 lg:px-10 grid sm:grid-cols-2 gap-10">
            <div>
              <h2
                className="text-sm font-bold text-[var(--obsidian)] tracking-[0.08em] uppercase mb-5"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("contactHeading")}
              </h2>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[var(--amber-dark)]" />
                  <div>
                    <div className="text-xs text-[var(--text-tertiary)]">{t("emailLabel")}</div>
                    <a
                      href="mailto:trade@silkroadafrica.com"
                      className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--amber-dark)]"
                    >
                      trade@silkroadafrica.com
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[var(--amber-dark)]" />
                  <div>
                    <div className="text-xs text-[var(--text-tertiary)]">{t("phoneLabel")}</div>
                    <a
                      href="tel:+250788000000"
                      className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--amber-dark)]"
                    >
                      +250 788 000 000
                    </a>
                  </div>
                </li>
              </ul>
            </div>

            <div>
              <h2
                className="text-sm font-bold text-[var(--obsidian)] tracking-[0.08em] uppercase mb-5"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("linksHeading")}
              </h2>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--amber-dark)] transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
