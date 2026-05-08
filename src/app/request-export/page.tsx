import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ExportRequestForm } from "@/components/requests/export-request-form";

export const metadata: Metadata = {
  title: "Export RFQ — Silk Road Africa",
  description:
    "List your commodity for export. Our trade team will match you with verified buyers across Asia within one business day.",
};

function PageHeader() {
  return (
    <section className="bg-[var(--surface-secondary)] pt-[176px] pb-10 lg:pb-14 border-b border-[var(--border-subtle)]">
      <div className="max-w-[900px] mx-auto px-6 lg:px-10">
        <Link
          href="/commodities"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to export portal
        </Link>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--terracotta)]/10 border border-[var(--terracotta)]/20">
          <Leaf className="w-3 h-3 text-[var(--terracotta)]" />
          <span className="text-[11px] font-semibold text-[var(--terracotta)] tracking-[0.12em] uppercase">
            Export Enquiry
          </span>
        </span>
        <h1
          className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)] leading-[1.1]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Source commodities from Africa
        </h1>
        <p className="mt-4 text-base lg:text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          Tell us what you want to import from Africa. Our trade team will match you with verified producers and cooperatives — usually within one business day.
        </p>
      </div>
    </section>
  );
}

export default function RequestExportPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <PageHeader />
        <section className="py-12 lg:py-20 bg-[var(--surface-primary)]">
          <div className="max-w-[900px] mx-auto px-6 lg:px-10">
            <ExportRequestForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
