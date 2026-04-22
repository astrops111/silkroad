import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { BuyerRequestForm } from "@/components/requests/buyer-request-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("buyerRequest");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function PageHeader() {
  const t = useTranslations("buyerRequest");
  return (
    <section className="bg-[var(--surface-secondary)] pt-[176px] pb-10 lg:pb-14 border-b border-[var(--border-subtle)]">
      <div className="max-w-[900px] mx-auto px-6 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("backHome")}
        </Link>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--amber)]/10 border border-[var(--amber)]/20">
          <Sparkles className="w-3 h-3 text-[var(--amber-dark)]" />
          <span className="text-[11px] font-semibold text-[var(--amber-dark)] tracking-[0.12em] uppercase">
            {t("eyebrow")}
          </span>
        </span>
        <h1
          className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)] leading-[1.1]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h1>
        <p className="mt-4 text-base lg:text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          {t("subtitle")}
        </p>
      </div>
    </section>
  );
}

export default function RequestPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <PageHeader />
        <section className="py-12 lg:py-20 bg-[var(--surface-primary)]">
          <div className="max-w-[900px] mx-auto px-6 lg:px-10">
            <BuyerRequestForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
