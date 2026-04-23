"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Megaphone,
  TrendingUp,
  Eye,
  MousePointer,
  MessageSquare,
  Loader2,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface Promotion {
  id: string;
  placement: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  impressions: number;
  clicks: number;
  inquiries: number;
  products: {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    currency: string;
    product_images: { url: string; is_primary: boolean }[];
  };
}

const PLACEMENT_LABELS: Record<string, string> = {
  search: "Search Results",
  category: "Category Page",
  homepage: "Homepage",
  rfq_sidebar: "RFQ Sidebar",
};

export default function PromotePage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [tier, setTier] = useState("free");
  const [limit, setLimit] = useState(0);
  const [used, setUsed] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  // In production, companyId comes from auth context
  const companyId = "demo-company";

  useEffect(() => {
    fetch(`/api/supplier/promote?companyId=${companyId}`)
      .then((r) => r.json())
      .then((data) => {
        setPromotions(data.promotions || []);
        setTier(data.tier || "free");
        setLimit(data.limit || 0);
        setUsed(data.used || 0);
        setRemaining(data.remaining || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const activePromos = promotions.filter((p) => p.is_active && new Date(p.ends_at) > new Date());
  const totalImpressions = promotions.reduce((s, p) => s + p.impressions, 0);
  const totalClicks = promotions.reduce((s, p) => s + p.clicks, 0);
  const totalInquiries = promotions.reduce((s, p) => s + p.inquiries, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/supplier/products" className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors">
          <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Promoted Listings
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Boost your products to the top of search results and category pages
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "color-mix(in srgb, var(--amber) 12%, transparent)", color: "var(--amber-dark)" }}>
          <Star className="w-3.5 h-3.5" />
          {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
        </div>
      </div>

      {/* Quota Bar */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" style={{ color: "var(--indigo)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Monthly Promotion Quota</h2>
          </div>
          <span className="text-sm font-bold" style={{ color: limit > 0 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            {used} / {limit} used
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-tertiary)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: limit > 0 ? `${(used / limit) * 100}%` : "0%",
              background: used >= limit ? "var(--danger)" : "var(--indigo)",
            }}
          />
        </div>
        {limit === 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--amber-dark)" }}>
            <Crown className="w-3.5 h-3.5" />
            Upgrade to Gold ($149/mo) or Verified ($299/mo) to unlock promoted listings.
            <Link href="/supplier/subscription" className="underline font-semibold">Upgrade</Link>
          </div>
        )}
      </div>

      {/* Performance KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "var(--indigo)" },
          { label: "Clicks", value: totalClicks.toLocaleString(), icon: MousePointer, color: "var(--amber)" },
          { label: "Inquiries", value: totalInquiries.toLocaleString(), icon: MessageSquare, color: "var(--success)" },
        ].map((kpi) => (
          <div key={kpi.label} className="p-5 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <kpi.icon className="w-4 h-4 mb-2" style={{ color: kpi.color }} />
            <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{kpi.value}</p>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Active Promotions */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Active Promotions ({activePromos.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-tertiary)" }} /></div>
        ) : activePromos.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <Megaphone className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No active promotions</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {limit > 0 ? "Go to your products list and click \"Promote\" on any approved product." : "Upgrade your subscription to start promoting products."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePromos.map((promo) => {
              // eslint-disable-next-line react-hooks/purity
              const daysLeft = Math.ceil((new Date(promo.ends_at).getTime() - Date.now()) / 86400000);
              const ctr = promo.impressions > 0 ? ((promo.clicks / promo.impressions) * 100).toFixed(1) : "0.0";

              return (
                <div key={promo.id} className="rounded-2xl border p-5 flex items-center gap-4" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--surface-secondary)] shrink-0">
                    {promo.products?.product_images?.[0]?.url ? (
                      <img src={promo.products.product_images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Megaphone className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {promo.products?.name || "Product"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {PLACEMENT_LABELS[promo.placement] || promo.placement}
                      </span>
                      <span className="text-[11px] flex items-center gap-1" style={{ color: daysLeft < 7 ? "var(--warning)" : "var(--text-tertiary)" }}>
                        <Clock className="w-3 h-3" /> {daysLeft}d left
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-right">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{promo.impressions}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>views</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{ctr}%</p>
                      <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>CTR</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--success)" }}>{promo.inquiries}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>leads</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
