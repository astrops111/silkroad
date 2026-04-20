"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  Sparkles,
  Power,
  Scale,
  Shield,
  Loader2,
  ArrowRight,
  Activity,
  Zap,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  ImagePlus,
  MessageSquare,
  Gavel,
  Route,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AIFeature {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  updated_at: string;
}

const FEATURE_ICONS: Record<string, typeof Sparkles> = {
  ai_listing_generator: ImagePlus,
  ai_pricing_engine: TrendingUp,
  ai_support_agent: MessageSquare,
  ai_dispute_resolution: Gavel,
  ai_compliance_scanner: ShieldCheck,
  ai_route_optimizer: Route,
};

const CATEGORY_COLORS: Record<string, string> = {
  seller_tools: "var(--amber)",
  support: "var(--indigo)",
  trust_safety: "var(--terracotta)",
  operations: "var(--success)",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SuperAdminDashboard() {
  const [features, setFeatures] = useState<AIFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ai-features")
      .then((r) => r.json())
      .then((d) => setFeatures(d.features || []))
      .finally(() => setLoading(false));
  }, []);

  const enabledCount = features.filter((f) => f.is_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Crown className="w-6 h-6" style={{ color: "var(--amber)" }} />
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Super Admin Panel
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Platform-level AI features, trust & safety tools, and compliance management
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div
          className="p-6 rounded-2xl border"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "color-mix(in srgb, var(--amber) 12%, transparent)" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "var(--amber)" }} />
          </div>
          <p
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {loading ? "—" : `${enabledCount}/${features.length}`}
          </p>
          <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
            AI Features Active
          </p>
        </div>

        <Link
          href="/superadmin/disputes/ai-analysis"
          className="p-6 rounded-2xl border transition-all hover:shadow-md group"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "color-mix(in srgb, var(--terracotta) 12%, transparent)" }}
          >
            <Scale className="w-5 h-5" style={{ color: "var(--terracotta)" }} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                AI Dispute Analysis
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                Analyze disputes with AI
              </p>
            </div>
            <ArrowRight
              className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
        </Link>

        <Link
          href="/superadmin/compliance"
          className="p-6 rounded-2xl border transition-all hover:shadow-md group"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)" }}
          >
            <Shield className="w-5 h-5" style={{ color: "var(--success)" }} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Compliance Scanner
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                Check import/export regulations
              </p>
            </div>
            <ArrowRight
              className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
        </Link>
      </div>

      {/* Feature Status Grid */}
      <div
        className="rounded-2xl border"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              AI Feature Status
            </h2>
          </div>
          <Link
            href="/superadmin/ai-features"
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: "var(--indigo)" }}
          >
            Manage All
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-tertiary)" }} />
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {features.map((feature) => {
              const Icon = FEATURE_ICONS[feature.id] || Sparkles;
              const catColor = CATEGORY_COLORS[feature.category] || "var(--text-tertiary)";

              return (
                <div key={feature.id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: feature.is_enabled
                        ? `color-mix(in srgb, ${catColor} 12%, transparent)`
                        : "var(--surface-secondary)",
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{
                        color: feature.is_enabled ? catColor : "var(--text-tertiary)",
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {feature.name}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
                      {feature.description}
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0"
                    style={{
                      background: feature.is_enabled
                        ? "color-mix(in srgb, var(--success) 10%, transparent)"
                        : "color-mix(in srgb, var(--text-tertiary) 8%, transparent)",
                      color: feature.is_enabled ? "var(--success)" : "var(--text-tertiary)",
                    }}
                  >
                    <Power className="w-3 h-3" />
                    {feature.is_enabled ? "Active" : "Disabled"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className="rounded-2xl border p-5"
          style={{
            background: "color-mix(in srgb, var(--amber) 4%, var(--surface-primary))",
            borderColor: "color-mix(in srgb, var(--amber) 15%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--amber-dark)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Important Notes
            </h3>
          </div>
          <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--amber)" }}>1.</span>
              All AI features require the <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: "var(--surface-secondary)" }}>ANTHROPIC_API_KEY</code> env variable.
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--amber)" }}>2.</span>
              Features are disabled by default. Enable them individually from the Feature Toggles page.
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--amber)" }}>3.</span>
              AI features consume API credits per request. Monitor usage in your Anthropic dashboard.
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--amber)" }}>4.</span>
              Only <strong>Super Admin</strong> users can access this panel and toggle AI features.
            </li>
          </ul>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: "var(--indigo)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              AI Capabilities
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            <li className="flex items-center gap-2">
              <ImagePlus className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--amber)" }} />
              Photo → 12-language product listings
            </li>
            <li className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--success)" }} />
              PPP-adjusted pricing for African markets
            </li>
            <li className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--indigo)" }} />
              Multilingual AI support with order lookups
            </li>
            <li className="flex items-center gap-2">
              <Gavel className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--terracotta)" }} />
              Evidence-based dispute mediation
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--success)" }} />
              Import/export compliance with trade bloc awareness
            </li>
            <li className="flex items-center gap-2">
              <Route className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--indigo)" }} />
              Fleet route optimization with TSP solver
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
