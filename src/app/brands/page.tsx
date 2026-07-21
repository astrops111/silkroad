import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { listBrands } from "@/lib/queries/brands";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop by Brand — B2B Wholesale Brands for Africa | SilkRoad Africa",
  description:
    "Browse wholesale brands available for B2B buyers in Africa. Source authentic Korean beauty, electronics and more in bulk at factory prices, with shipping and customs handled.",
  alternates: { canonical: "/brands" },
  keywords: ["wholesale brands Africa", "B2B brands", "bulk brand supplier Africa", "Korean beauty wholesale"],
};

export default async function BrandsIndexPage() {
  const brands = await listBrands();

  return (
    <>
      <Navbar />
      <main className="pt-[104px] lg:pt-[140px] bg-[var(--surface-secondary)] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <header className="mb-8 max-w-3xl">
            <h1
              className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Wholesale Brands for Africa
            </h1>
            <p className="mt-3 text-[var(--text-secondary)] leading-relaxed">
              {brands.length}+ brands available for B2B buyers across Africa — source authentic products in bulk
              at wholesale prices, with sourcing, shipping and customs handled end-to-end.
            </p>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {brands.map((b) => (
              <Link
                key={b.slug}
                href={`/brands/${b.slug}`}
                className="group card-elevated px-4 py-3.5 flex items-center justify-between gap-2"
              >
                <span className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--amber-dark)] transition-colors">
                  {b.brand}
                </span>
                <span className="shrink-0 text-[11px] font-medium text-[var(--text-tertiary)] bg-[var(--surface-secondary)] rounded-full px-2 py-0.5">
                  {b.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
