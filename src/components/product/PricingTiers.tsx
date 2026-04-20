"use client";

import { useState, useEffect } from "react";
import { TrendingDown, Loader2, MessageSquare } from "lucide-react";

/* ---------- Types ---------- */
interface PricingTier {
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
}

interface PricingResponse {
  basePrice: number;
  baseCurrency: string;
  moq: number;
  tiers: PricingTier[];
}

export interface PricingTiersProps {
  productId: string;
  basePrice: number;
  currency: string;
  moq: number;
}

/* ---------- Helpers ---------- */
function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function savingsPercent(base: number, tier: number): number {
  if (base <= 0) return 0;
  return Math.round(((base - tier) / base) * 100);
}

/* ---------- Component ---------- */
export default function PricingTiers({
  productId,
  basePrice,
  currency,
  moq,
}: PricingTiersProps) {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTiers() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products/${productId}/pricing`);
        if (!res.ok) throw new Error("Failed to load pricing");
        const data: PricingResponse = await res.json();
        if (!cancelled) {
          setTiers(data.tiers ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load pricing");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTiers();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  /* Find best-value tier (highest savings) */
  const bestTierIdx = tiers.reduce<number>((best, tier, idx) => {
    if (best === -1) return idx;
    const bestSavings = savingsPercent(basePrice, tiers[best].unit_price);
    const currSavings = savingsPercent(basePrice, tier.unit_price);
    return currSavings > bestSavings ? idx : best;
  }, tiers.length > 0 ? 0 : -1);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--surface-primary)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--surface-secondary)",
        }}
      >
        <div className="flex items-center gap-2">
          <TrendingDown className="size-4" style={{ color: "var(--amber)" }} />
          <h3
            className="text-sm font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Volume Pricing
          </h3>
        </div>
      </div>

      {/* Base price */}
      <div
        className="flex items-baseline gap-2 px-5 py-3 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <span
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          {formatCurrency(basePrice, currency)}
        </span>
        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          /unit
        </span>
        <span
          className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            background: "var(--surface-secondary)",
            color: "var(--text-secondary)",
          }}
        >
          MOQ: {moq.toLocaleString()}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 px-5 py-8">
          <Loader2
            className="size-5 animate-spin"
            style={{ color: "var(--amber)" }}
          />
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Loading tiers...
          </span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="px-5 py-6 text-center">
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        </div>
      )}

      {/* No tiers */}
      {!loading && !error && tiers.length === 0 && (
        <div className="px-5 py-6 text-center">
          <MessageSquare
            className="mx-auto mb-2 size-8"
            style={{ color: "var(--text-tertiary)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Contact supplier for bulk pricing
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Volume discounts available on request
          </p>
        </div>
      )}

      {/* Tier rows */}
      {!loading && !error && tiers.length > 0 && (
        <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {/* Table header */}
          <div
            className="grid grid-cols-3 gap-2 px-5 py-2.5 text-xs font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span>Quantity</span>
            <span className="text-right">Unit Price</span>
            <span className="text-right">Savings</span>
          </div>

          {tiers.map((tier, idx) => {
            const savings = savingsPercent(basePrice, tier.unit_price);
            const isBest = idx === bestTierIdx && savings > 0;
            const rangeLabel = tier.max_quantity
              ? `${tier.min_quantity.toLocaleString()}\u2013${tier.max_quantity.toLocaleString()} units`
              : `${tier.min_quantity.toLocaleString()}+ units`;

            return (
              <div
                key={idx}
                className="relative grid grid-cols-3 items-center gap-2 px-5 py-3 transition-colors"
                style={{
                  background: isBest ? "var(--amber-glow)" : "transparent",
                }}
              >
                {/* Best value label */}
                {isBest && (
                  <span
                    className="absolute -top-0 right-4 rounded-b-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      background: "var(--amber)",
                      color: "var(--obsidian)",
                    }}
                  >
                    Best Value
                  </span>
                )}

                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {rangeLabel}
                </span>
                <span
                  className="text-right text-sm font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: isBest ? "var(--amber-dark)" : "var(--text-primary)",
                  }}
                >
                  {formatCurrency(tier.unit_price, currency)}
                </span>
                <div className="flex items-center justify-end">
                  {savings > 0 ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: "var(--amber-glow)",
                        color: "var(--amber-dark)",
                      }}
                    >
                      -{savings}%
                    </span>
                  ) : (
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Base
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
