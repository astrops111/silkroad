"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useRegion } from "@/lib/providers/region-provider";
import { formatConvertedPriceWithCode } from "@/lib/currency/formatter";

export type RailProduct = {
  id: string;
  name: string;
  image: string;
  /** Price in minor units (cents) of `currency`. */
  amount: number;
  /** Base currency the supplier listed in (e.g. "USD"). */
  currency: string;
  unit?: string;
  supplier: string;
  country: string;
  moq: string;
  badge?: string;
};

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  viewAllHref: string;
  viewAllLabel?: string;
  products: RailProduct[];
};

export function ProductRail({
  eyebrow,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = "View all",
  products,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const region = useRegion();
  const locale = useLocale();

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width ?? 280;
    el.scrollBy({ left: dir * (cardWidth + 16) * 2, behavior: "smooth" });
  };

  return (
    <section className="py-16 lg:py-20 bg-[var(--surface-primary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            {eyebrow && (
              <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
                {eyebrow}
              </span>
            )}
            <h2
              className="mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Scroll left"
              className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Scroll right"
              className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1.5 ml-2 px-4 h-10 rounded-full text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--amber-dark)] transition-colors"
            >
              {viewAllLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-6 px-6 lg:-mx-10 lg:px-10 pb-2"
        >
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/marketplace/${p.id}`}
              className="group snap-start shrink-0 w-[240px] lg:w-[280px] bg-white"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--surface-secondary)]">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="280px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {p.badge && (
                  <span className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold bg-[var(--amber)] text-[var(--obsidian)] tracking-wide uppercase">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="pt-3">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-base font-bold text-[var(--obsidian)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatConvertedPriceWithCode(
                      p.amount,
                      p.currency,
                      region.currency,
                      locale,
                    )}
                  </span>
                  {p.unit && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      / {p.unit}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--text-primary)] line-clamp-2 leading-snug">
                  {p.name}
                </p>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {p.supplier} · {p.country}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                  MOQ {p.moq}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
