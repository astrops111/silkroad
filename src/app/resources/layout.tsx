import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Silk Road Resources — Africa → China Natural Resources Portal",
  description:
    "Source metals, minerals, timber, agricultural commodities and raw materials from verified African producers. LC-backed trade, inspection, freight and FX handled end-to-end.",
};

export default async function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("resources.nav");

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/resources" className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight">
              丝路资源 <span className="text-[var(--amber)]">·</span> Silk Road Resources
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <Link href="/resources/listings?group=metals" className="hover:text-white">
              {t("metals")}
            </Link>
            <Link href="/resources/listings?group=minerals" className="hover:text-white">
              {t("minerals")}
            </Link>
            <Link href="/resources/listings?group=food" className="hover:text-white">
              {t("food")}
            </Link>
            <Link href="/resources/listings?group=timber" className="hover:text-white">
              {t("timber")}
            </Link>
            <Link href="/resources/listings?group=energy" className="hover:text-white">
              {t("energy")}
            </Link>
            <span className="text-white/20">|</span>
            <Link href="/resources/rfqs" className="hover:text-white">
              {t("rfqs")}
            </Link>
            <Link href="/resources/lc" className="hover:text-white">
              {t("lc")}
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-slate-300 hover:text-white"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/auth/register?intent=resources_buyer"
              className="text-sm px-4 py-2 rounded-md bg-[var(--amber)] text-black font-medium hover:opacity-90"
            >
              {t("register")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 py-10 mt-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
          <span>
            © {new Date().getFullYear()} Silk Road Resources · LC-backed
            Africa → China trade
          </span>
          <span>
            {t("compliance")}: Kimberley · OECD 3TG · CITES · GACC
          </span>
        </div>
      </footer>
    </div>
  );
}
