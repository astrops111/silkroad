import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, ClipboardList, Wallet, Truck } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply } from "@/lib/company-access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.sell");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SellPage() {
  const t = await getTranslations("marketing.sell");
  const user = await getCurrentUser();
  const isSupplier = user?.company_members?.some((m) => canSupply(m.companies?.type)) ?? false;

  const primaryCta = !user
    ? { href: "/auth/register?role=supplier", label: t("ctaRegister") }
    : isSupplier
      ? { href: "/supplier", label: t("ctaDashboard") }
      : { href: "/request-supplier-account", label: t("ctaApply") };

  const values = [
    { icon: ClipboardList, title: t("value1Title"), body: t("value1Body") },
    { icon: Wallet, title: t("value2Title"), body: t("value2Body") },
    { icon: Truck, title: t("value3Title"), body: t("value3Body") },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-[var(--border-subtle)] pt-[184px] pb-24 lg:pb-32 bg-[var(--obsidian)]">
          <div
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse at top right, rgba(216,159,46,0.15), transparent 60%)",
            }}
          />
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <span className="text-xs font-semibold text-[var(--amber)] tracking-[0.15em] uppercase">
              {t("eyebrow")}
            </span>
            <h1
              className="mt-4 text-4xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("title")}
            </h1>
            <p className="mt-6 text-lg text-white/75 max-w-2xl leading-relaxed">
              {t("subtitle")}
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link href={primaryCta.href} className="btn-primary !py-3.5 !px-7">
                {primaryCta.label}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/how-it-works" className="btn-secondary !py-3.5 !px-7">
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-32 bg-[var(--surface-primary)]">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10 grid sm:grid-cols-3 gap-6">
            {values.map((v) => (
              <div
                key={v.title}
                className="p-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/15 flex items-center justify-center mb-5">
                  <v.icon className="w-5 h-5 text-[var(--amber-dark)]" />
                </div>
                <h3
                  className="text-lg font-bold text-[var(--obsidian)] mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {v.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
