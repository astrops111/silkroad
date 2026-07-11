"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Package } from "lucide-react";
import { applyMarkup } from "@/lib/pricing";

interface RecommendedProduct {
  product_id: string;
  score: number;
  reason: string;
  name: string;
  slug: string;
  base_price: number;
  currency: string | null;
  moq: number | null;
}

/**
 * Horizontal product recommendation rail. Fetches from the flag-gated
 * recommendations API and renders nothing while the flag is off, the
 * visitor is anonymous (forMe), or there is nothing to recommend —
 * safe to mount unconditionally.
 */
export function RecommendationRail({
  title,
  productId,
  forMe = false,
}: {
  title: string;
  productId?: string;
  forMe?: boolean;
}) {
  const [items, setItems] = useState<RecommendedProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    const params = productId ? `productId=${productId}` : forMe ? "forMe=true" : "";
    if (!params) return;

    fetch(`/api/ai/recommendations?${params}`)
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.recommendations?.length) {
          setItems(data.recommendations);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productId, forMe]);

  if (items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4" style={{ color: "var(--amber)" }} />
        <h2
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          {title}
        </h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((p) => (
          <Link
            key={p.product_id}
            href={`/marketplace/${p.product_id}`}
            className="flex-shrink-0 w-52 rounded-xl border p-4 transition-shadow hover:shadow-md"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
          >
            <div
              className="w-full h-24 rounded-lg mb-3 flex items-center justify-center"
              style={{ background: "var(--surface-secondary)" }}
            >
              <Package className="w-6 h-6" style={{ color: "var(--text-tertiary)" }} />
            </div>
            <p
              className="text-sm font-medium leading-snug line-clamp-2"
              style={{ color: "var(--text-primary)" }}
            >
              {p.name}
            </p>
            <p className="text-sm font-bold mt-1" style={{ color: "var(--text-primary)" }}>
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: p.currency ?? "USD",
              }).format(applyMarkup(p.base_price / 100))}
              <span className="font-normal text-xs" style={{ color: "var(--text-tertiary)" }}>
                {" "}/unit{p.moq ? ` · MOQ ${p.moq}` : ""}
              </span>
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>
              {p.reason}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
