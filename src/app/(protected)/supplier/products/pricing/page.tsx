"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Globe,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VolumeTier {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  discount: string;
}

interface RegionalPrice {
  country: string;
  countryName: string;
  suggestedPrice: number;
  currency: string;
  pppAdjusted: boolean;
  localCurrencyPrice: number | null;
  localCurrency: string | null;
}

interface PricingResult {
  suggestedBasePrice: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  currency: string;
  confidence: "high" | "medium" | "low";
  pricingStrategy: string;
  strategyExplanation: string;
  volumeTiers: VolumeTier[];
  regionalPricing: RegionalPrice[];
  marginAnalysis: {
    estimatedMarginPct: number;
    industryAvgMarginPct: number;
    recommendation: string;
  };
  competitivePosition: string;
  insights: string[];
}

const CATEGORIES = [
  { value: "electronics", label: "Electronics & Technology" },
  { value: "machinery", label: "Machinery & Equipment" },
  { value: "textiles", label: "Textiles & Apparel" },
  { value: "construction", label: "Construction & Building" },
  { value: "agriculture", label: "Agriculture & Food" },
  { value: "minerals", label: "Minerals & Raw Materials" },
  { value: "energy", label: "Energy & Solar" },
  { value: "consumer_goods", label: "Consumer Goods" },
  { value: "automotive", label: "Automotive & Transport" },
  { value: "chemicals", label: "Chemicals & Pharmaceuticals" },
];

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "KES", name: "Kenya Shilling", symbol: "KSh" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "GHS", name: "Ghana Cedi", symbol: "GH₵" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
];

const MARKET_OPTIONS = [
  { code: "KE", name: "Kenya", region: "East Africa" },
  { code: "UG", name: "Uganda", region: "East Africa" },
  { code: "TZ", name: "Tanzania", region: "East Africa" },
  { code: "RW", name: "Rwanda", region: "East Africa" },
  { code: "ET", name: "Ethiopia", region: "East Africa" },
  { code: "NG", name: "Nigeria", region: "West Africa" },
  { code: "GH", name: "Ghana", region: "West Africa" },
  { code: "SN", name: "Senegal", region: "West Africa" },
  { code: "CI", name: "Ivory Coast", region: "West Africa" },
  { code: "ZA", name: "South Africa", region: "Southern Africa" },
  { code: "ZM", name: "Zambia", region: "Southern Africa" },
  { code: "EG", name: "Egypt", region: "North Africa" },
  { code: "MA", name: "Morocco", region: "North Africa" },
];

const COUNTRY_FLAGS: Record<string, string> = {
  KE: "🇰🇪", UG: "🇺🇬", TZ: "🇹🇿", RW: "🇷🇼", ET: "🇪🇹",
  NG: "🇳🇬", GH: "🇬🇭", SN: "🇸🇳", CI: "🇨🇮",
  ZA: "🇿🇦", ZM: "🇿🇲", EG: "🇪🇬", MA: "🇲🇦",
};

const POSITION_CONFIG: Record<string, { color: string; label: string }> = {
  premium: { color: "var(--indigo)", label: "Premium" },
  competitive: { color: "var(--success)", label: "Competitive" },
  value: { color: "var(--amber)", label: "Value" },
  economy: { color: "var(--terracotta)", label: "Economy" },
};

const CONFIDENCE_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  high: { color: "var(--success)", icon: CheckCircle2 },
  medium: { color: "var(--amber)", icon: Info },
  low: { color: "var(--terracotta)", icon: AlertTriangle },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const [form, setForm] = useState({
    productName: "",
    productDescription: "",
    category: "consumer_goods",
    costPrice: "",
    currentPrice: "",
    currency: "USD",
    originCountry: "CN",
    moq: "100",
  });
  const [targetMarkets, setTargetMarkets] = useState<string[]>([
    "KE", "NG", "GH", "ZA", "UG", "TZ",
  ]);
  const [competitors, setCompetitors] = useState<
    { name: string; price: string; currency: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PricingResult | null>(null);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMarket = (code: string) => {
    setTargetMarkets((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const addCompetitor = () => {
    setCompetitors((prev) => [
      ...prev,
      { name: "", price: "", currency: form.currency },
    ]);
  };

  const updateCompetitor = (idx: number, field: string, value: string) => {
    setCompetitors((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const removeCompetitor = (idx: number) => {
    setCompetitors((prev) => prev.filter((_, i) => i !== idx));
  };

  const generatePricing = useCallback(async () => {
    if (!form.productName || !form.productDescription) {
      toast.error("Product name and description are required");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const validCompetitors = competitors
        .filter((c) => c.name && c.price)
        .map((c) => ({
          name: c.name,
          price: parseFloat(c.price),
          currency: c.currency,
        }));

      const res = await fetch("/api/supplier/pricing-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          targetMarkets,
          competitorPrices: validCompetitors.length > 0 ? validCompetitors : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Pricing generation failed");
        return;
      }

      setResult(data.pricing);
      toast.success("Pricing recommendations generated!");
    } catch {
      toast.error("Failed to connect to pricing service");
    } finally {
      setLoading(false);
    }
  }, [form, targetMarkets, competitors]);

  const currSymbol = CURRENCIES.find((c) => c.code === form.currency)?.symbol || "$";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/supplier/products"
            className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </Link>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Pricing Recommendations
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              AI-powered competitive pricing with regional PPP adjustments
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "color-mix(in srgb, var(--success) 10%, transparent)",
            color: "var(--success)",
          }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Smart Pricing
        </div>
      </div>

      {/* Input Form */}
      <div
        className="rounded-2xl border p-6 space-y-5"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          Product Information
        </h2>

        {/* Name & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              Product Name *
            </label>
            <input
              value={form.productName}
              onChange={(e) => updateForm("productName", e.target.value)}
              placeholder="e.g. Premium Shea Butter — Raw Unrefined"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              Category
            </label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => updateForm("category", e.target.value)}
                className="w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
            Product Description *
          </label>
          <textarea
            value={form.productDescription}
            onChange={(e) => updateForm("productDescription", e.target.value)}
            placeholder="Describe your product — materials, specifications, use cases, certifications..."
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none"
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Pricing Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              Currency
            </label>
            <div className="relative">
              <select
                value={form.currency}
                onChange={(e) => updateForm("currency", e.target.value)}
                className="w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              Cost Price (optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.costPrice}
              onChange={(e) => updateForm("costPrice", e.target.value)}
              placeholder="Your cost"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              Current Price (optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.currentPrice}
              onChange={(e) => updateForm("currentPrice", e.target.value)}
              placeholder="Listed price"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              MOQ (units)
            </label>
            <input
              type="number"
              value={form.moq}
              onChange={(e) => updateForm("moq", e.target.value)}
              placeholder="100"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* Target Markets */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
            Target Markets
          </label>
          <div className="flex flex-wrap gap-2">
            {MARKET_OPTIONS.map((m) => {
              const isSelected = targetMarkets.includes(m.code);
              return (
                <button
                  key={m.code}
                  onClick={() => toggleMarket(m.code)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isSelected
                      ? "var(--obsidian)"
                      : "var(--surface-secondary)",
                    color: isSelected ? "var(--ivory)" : "var(--text-secondary)",
                    border: `1px solid ${isSelected ? "var(--obsidian)" : "var(--border-subtle)"}`,
                  }}
                >
                  {COUNTRY_FLAGS[m.code]} {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Competitor Prices */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
              Competitor Prices (optional)
            </label>
            <button
              onClick={addCompetitor}
              className="text-xs font-medium transition-colors"
              style={{ color: "var(--indigo)" }}
            >
              + Add Competitor
            </button>
          </div>
          {competitors.map((comp, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <input
                value={comp.name}
                onChange={(e) => updateCompetitor(idx, "name", e.target.value)}
                placeholder="Competitor name"
                className="flex-1 rounded-lg px-3 py-2 text-xs"
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
              <input
                type="number"
                value={comp.price}
                onChange={(e) => updateCompetitor(idx, "price", e.target.value)}
                placeholder="Price"
                className="w-28 rounded-lg px-3 py-2 text-xs"
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={() => removeCompetitor(idx)}
                className="text-xs px-2 py-2 rounded-lg"
                style={{ color: "var(--danger)" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Generate Button */}
        <button
          onClick={generatePricing}
          disabled={loading || !form.productName || !form.productDescription}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background:
              loading || !form.productName || !form.productDescription
                ? "var(--surface-tertiary)"
                : "var(--obsidian)",
            color:
              loading || !form.productName || !form.productDescription
                ? "var(--text-tertiary)"
                : "var(--ivory)",
            cursor:
              loading || !form.productName || !form.productDescription
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? "Analyzing market & pricing..." : "Get Pricing Recommendations"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Price Recommendation Hero */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
          >
            <div
              className="p-6"
              style={{
                background: "linear-gradient(135deg, var(--obsidian) 0%, var(--obsidian-mid) 100%)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "rgba(245,240,232,0.5)" }}>
                    Suggested Base Price
                  </p>
                  <p
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-display)", color: "var(--amber)" }}
                  >
                    {currSymbol}{result.suggestedBasePrice.toFixed(2)}
                  </p>
                  <p className="text-sm mt-1" style={{ color: "rgba(245,240,232,0.6)" }}>
                    Range: {currSymbol}{result.priceRangeLow.toFixed(2)} — {currSymbol}{result.priceRangeHigh.toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {/* Confidence */}
                  {(() => {
                    const conf = CONFIDENCE_CONFIG[result.confidence];
                    const ConfIcon = conf.icon;
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{
                          background: `color-mix(in srgb, ${conf.color} 15%, transparent)`,
                          color: conf.color,
                        }}
                      >
                        <ConfIcon className="w-3.5 h-3.5" />
                        {result.confidence} confidence
                      </span>
                    );
                  })()}
                  {/* Position */}
                  {(() => {
                    const pos = POSITION_CONFIG[result.competitivePosition] || POSITION_CONFIG.competitive;
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{
                          background: `color-mix(in srgb, ${pos.color} 15%, transparent)`,
                          color: pos.color,
                        }}
                      >
                        <Target className="w-3.5 h-3.5" />
                        {pos.label} positioning
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Strategy */}
            <div className="p-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--amber-dark)" }}>
                {result.pricingStrategy}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {result.strategyExplanation}
              </p>
            </div>

            {/* Margin Analysis */}
            <div className="p-5 flex items-center gap-6" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)" }}
                >
                  <BarChart3 className="w-5 h-5" style={{ color: "var(--success)" }} />
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                    {result.marginAnalysis.estimatedMarginPct.toFixed(1)}%
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    Your margin
                  </p>
                </div>
              </div>
              <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                vs.
              </div>
              <div>
                <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
                  {result.marginAnalysis.industryAvgMarginPct.toFixed(1)}%
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  Industry avg
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {result.marginAnalysis.recommendation}
                </p>
              </div>
            </div>
          </div>

          {/* Volume Tiers + Regional Pricing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Volume Tiers */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4" style={{ color: "var(--indigo)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Volume Pricing Tiers
                </h3>
              </div>
              <div className="space-y-2">
                {result.volumeTiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3 px-4 rounded-xl"
                    style={{ background: "var(--surface-secondary)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {tier.minQty} — {tier.maxQty || "∞"} units
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: "color-mix(in srgb, var(--success) 10%, transparent)",
                          color: "var(--success)",
                        }}
                      >
                        {tier.discount} off
                      </span>
                      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {currSymbol}{tier.unitPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Pricing */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4" style={{ color: "var(--terracotta)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Regional Pricing (PPP Adjusted)
                </h3>
              </div>
              <div className="space-y-2">
                {result.regionalPricing.map((rp) => {
                  const priceDiff = result.suggestedBasePrice > 0
                    ? ((rp.suggestedPrice - result.suggestedBasePrice) / result.suggestedBasePrice) * 100
                    : 0;
                  return (
                    <div
                      key={rp.country}
                      className="flex items-center justify-between py-2.5 px-4 rounded-xl"
                      style={{ background: "var(--surface-secondary)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{COUNTRY_FLAGS[rp.country]}</span>
                        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                          {rp.countryName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {rp.localCurrencyPrice && rp.localCurrency && (
                          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                            ≈ {rp.localCurrency} {rp.localCurrencyPrice.toLocaleString()}
                          </span>
                        )}
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                          {currSymbol}{rp.suggestedPrice.toFixed(2)}
                        </span>
                        <span
                          className="flex items-center gap-0.5 text-[10px] font-semibold"
                          style={{
                            color:
                              priceDiff < -5 ? "var(--terracotta)" : priceDiff > 5 ? "var(--success)" : "var(--text-tertiary)",
                          }}
                        >
                          {priceDiff < -1 ? (
                            <ArrowDownRight className="w-3 h-3" />
                          ) : priceDiff > 1 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {Math.abs(priceDiff).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Insights */}
          {result.insights.length > 0 && (
            <div
              className="rounded-2xl border p-5"
              style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Pricing Insights
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 py-3 px-4 rounded-xl"
                    style={{ background: "var(--surface-secondary)" }}
                  >
                    <DollarSign
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: "var(--amber)" }}
                    />
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)" }}
          >
            <TrendingUp className="w-8 h-8" style={{ color: "var(--success)" }} />
          </div>
          <h3
            className="text-lg font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Smart Pricing for African Markets
          </h3>
          <p className="text-sm max-w-md mx-auto mb-8" style={{ color: "var(--text-tertiary)" }}>
            Enter your product details above. Our AI considers purchasing power parity,
            competitor pricing, category margins, and cross-border trade costs to suggest
            optimal pricing for each market.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              {
                icon: Target,
                title: "Competitive Analysis",
                desc: "Positions your product against competitors in each category",
              },
              {
                icon: Globe,
                title: "PPP Adjustments",
                desc: "Pricing adapted to each country's purchasing power",
              },
              {
                icon: Layers,
                title: "Volume Tiers",
                desc: "Automatic bulk discount tiers to incentivize larger orders",
              },
            ].map((f) => (
              <div key={f.title} className="p-4 rounded-xl" style={{ background: "var(--surface-secondary)" }}>
                <f.icon className="w-5 h-5 mb-2" style={{ color: "var(--success)" }} />
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  {f.title}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
