import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Package, ShieldCheck, Ship, Boxes } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { getBrandLanding, resolveBrandFromSlug, type BrandLanding } from "@/lib/queries/brands";
import { buildProductPath } from "@/lib/product-url";
import { applyMarkup } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const REGION_LABEL: Record<string, string> = {
  KR: "South Korea",
  CN: "China",
  TW: "Taiwan",
  JP: "Japan",
};

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://silkroad.africa";
}

async function loadBrand(slug: string): Promise<BrandLanding | null> {
  const brand = await resolveBrandFromSlug(slug);
  if (!brand) return null;
  return getBrandLanding(brand);
}

function originText(origins: string[]): string {
  const labels = origins.map((o) => REGION_LABEL[o] ?? o);
  return labels.length ? labels.join(" & ") : "Asia";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadBrand(slug);
  if (!data) return { title: "Brand not found | SilkRoad Africa" };

  const cats = data.categories.slice(0, 3).map((c) => c.categoryName).join(", ");
  const origin = originText(data.origins);
  const title = `${data.brand} Wholesale in Africa — B2B ${data.brand} Supplier | SilkRoad Africa`;
  const description = `Buy ${data.brand} wholesale for your business in Africa. Source ${data.totalProducts}+ ${data.brand} products from ${origin}${cats ? ` — ${cats}` : ""} in bulk at B2B prices, with sourcing, shipping and customs handled end-to-end.`;

  return {
    title,
    description,
    alternates: { canonical: `/brands/${data.slug}` },
    openGraph: { title, description, type: "website", url: `${baseUrl()}/brands/${data.slug}` },
    keywords: [
      `${data.brand} wholesale`,
      `${data.brand} B2B`,
      `${data.brand} supplier Africa`,
      `buy ${data.brand} bulk`,
      `${data.brand} distributor Africa`,
    ],
  };
}

export default async function BrandLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadBrand(slug);
  if (!data) notFound();

  const base = baseUrl();
  const origin = originText(data.origins);
  const priceOf = (cents: number) => applyMarkup(cents / 100);

  // Structured data: breadcrumb + a product ItemList of the featured picks.
  const featured = data.categories.flatMap((g) => g.products).slice(0, 20);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: base },
          { "@type": "ListItem", position: 2, name: "Brands", item: `${base}/brands` },
          { "@type": "ListItem", position: 3, name: data.brand, item: `${base}/brands/${data.slug}` },
        ],
      },
      {
        "@type": "ItemList",
        name: `${data.brand} products`,
        numberOfItems: featured.length,
        itemListElement: featured.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: p.name,
            ...(p.image ? { image: p.image } : {}),
            brand: { "@type": "Brand", name: data.brand },
            url: `${base}${buildProductPath({ id: p.id, slug: p.slug, name: p.name, origin_country: p.originCountry, category_path: p.categoryPath })}`,
            offers: {
              "@type": "Offer",
              priceCurrency: "USD",
              price: priceOf(p.basePrice).toFixed(2),
              availability: "https://schema.org/InStock",
            },
          },
        })),
      },
    ],
  };

  return (
    <>
      <Navbar />
      <main className="pt-[104px] lg:pt-[140px] bg-[var(--surface-secondary)] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[var(--text-primary)]">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/brands" className="hover:text-[var(--text-primary)]">Brands</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[var(--text-secondary)] font-medium">{data.brand}</span>
          </nav>

          {/* Hero */}
          <header className="mb-10">
            <h1
              className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {data.brand} — Wholesale &amp; B2B Supplier in Africa
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--text-secondary)] leading-relaxed">
              Source <strong>{data.brand}</strong> in bulk for your business across Africa. We connect African
              buyers directly to {origin} manufacturing — {data.totalProducts}+ {data.brand} products at B2B
              wholesale prices, with sourcing, consolidated shipping and customs clearance handled end-to-end.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-primary)] border border-[var(--border-subtle)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <Boxes className="w-3.5 h-3.5 text-[var(--amber-dark)]" /> {data.totalProducts}+ SKUs
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-primary)] border border-[var(--border-subtle)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--amber-dark)]" /> Verified supplier
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-primary)] border border-[var(--border-subtle)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <Ship className="w-3.5 h-3.5 text-[var(--amber-dark)]" /> Landed-cost quotes to Africa
              </span>
            </div>
          </header>

          {/* Categories with top-5 products */}
          <div className="space-y-12">
            {data.categories.map((group) => (
              <section key={group.categoryId}>
                <div className="flex items-end justify-between mb-4">
                  <h2
                    className="text-xl lg:text-2xl font-bold tracking-tight text-[var(--text-primary)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {data.brand} {group.categoryName}
                  </h2>
                  <Link
                    href={`/marketplace?brand=${encodeURIComponent(data.brand)}`}
                    className="text-sm font-medium text-[var(--amber-dark)] hover:underline shrink-0"
                  >
                    View all {group.count} &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
                  {group.products.map((p) => (
                    <Link
                      key={p.id}
                      href={buildProductPath({
                        id: p.id,
                        slug: p.slug,
                        name: p.name,
                        origin_country: p.originCountry,
                        category_path: p.categoryPath,
                      })}
                      className="group card-elevated overflow-hidden flex flex-col"
                    >
                      <div className="relative w-full aspect-square bg-[var(--surface-secondary)] overflow-hidden">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="w-10 h-10 text-[var(--text-primary)] opacity-[0.08]" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col gap-1">
                        <h3 className="text-[13px] font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">
                          {p.name}
                        </h3>
                        <div className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                          ${priceOf(p.basePrice).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">MOQ {p.moq ?? 1}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
