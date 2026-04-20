"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Power,
  Loader2,
  ImagePlus,
  TrendingUp,
  MessageSquare,
  Gavel,
  ShieldCheck,
  Route,
  ChevronRight,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AIFeature {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  seller_tools: { label: "Seller Tools", color: "var(--amber)" },
  support: { label: "Customer Support", color: "var(--indigo)" },
  trust_safety: { label: "Trust & Safety", color: "var(--terracotta)" },
  operations: { label: "Operations", color: "var(--success)" },
};

const FEATURE_ICONS: Record<string, typeof Sparkles> = {
  ai_listing_generator: ImagePlus,
  ai_pricing_engine: TrendingUp,
  ai_support_agent: MessageSquare,
  ai_dispute_resolution: Gavel,
  ai_compliance_scanner: ShieldCheck,
  ai_route_optimizer: Route,
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AIFeaturesPage() {
  const [features, setFeatures] = useState<AIFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-features");
      const data = await res.json();
      setFeatures(data.features || []);
    } catch {
      toast.error("Failed to load AI features");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const toggleFeature = async (featureId: string, enabled: boolean) => {
    setTogglingId(featureId);
    try {
      const res = await fetch("/api/admin/ai-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureId, enabled }),
      });

      if (!res.ok) {
        toast.error("Failed to update feature");
        return;
      }

      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? { ...f, is_enabled: enabled } : f))
      );
      toast.success(`${enabled ? "Enabled" : "Disabled"} successfully`);
    } catch {
      toast.error("Failed to update feature");
    } finally {
      setTogglingId(null);
    }
  };

  // Group by category
  const grouped = features.reduce<Record<string, AIFeature[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  const enabledCount = features.filter((f) => f.is_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            AI Features
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Enable or disable AI-powered features across the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: enabledCount > 0
                ? "color-mix(in srgb, var(--success) 10%, transparent)"
                : "color-mix(in srgb, var(--text-tertiary) 10%, transparent)",
              color: enabledCount > 0 ? "var(--success)" : "var(--text-tertiary)",
            }}
          >
            <Power className="w-3.5 h-3.5" />
            {enabledCount} of {features.length} active
          </span>
        </div>
      </div>

      {/* Warning Banner */}
      <div
        className="flex items-start gap-3 px-5 py-4 rounded-xl"
        style={{
          background: "color-mix(in srgb, var(--amber) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--amber) 20%, transparent)",
        }}
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--amber-dark)" }} />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            AI features require an ANTHROPIC_API_KEY environment variable
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Each enabled feature will use Claude API credits. Features are disabled by default and must be explicitly turned on.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, featureList]) => {
            const catConfig = CATEGORY_CONFIG[category] || {
              label: category,
              color: "var(--text-tertiary)",
            };

            return (
              <div key={category}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: catConfig.color }}
                  />
                  <h2
                    className="text-xs font-semibold uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {catConfig.label}
                  </h2>
                </div>

                <div className="space-y-3">
                  {featureList.map((feature) => {
                    const Icon = FEATURE_ICONS[feature.id] || Sparkles;
                    const isToggling = togglingId === feature.id;
                    const isExpanded = expandedId === feature.id;

                    return (
                      <div
                        key={feature.id}
                        className="rounded-2xl border overflow-hidden transition-all"
                        style={{
                          background: "var(--surface-primary)",
                          borderColor: feature.is_enabled
                            ? `color-mix(in srgb, ${catConfig.color} 25%, var(--border-subtle))`
                            : "var(--border-subtle)",
                        }}
                      >
                        <div className="flex items-center gap-4 p-5">
                          {/* Icon */}
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: feature.is_enabled
                                ? `color-mix(in srgb, ${catConfig.color} 12%, transparent)`
                                : "var(--surface-secondary)",
                            }}
                          >
                            <Icon
                              className="w-5 h-5"
                              style={{
                                color: feature.is_enabled ? catConfig.color : "var(--text-tertiary)",
                              }}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {feature.name}
                            </p>
                            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-tertiary)" }}>
                              {feature.description}
                            </p>
                          </div>

                          {/* Config button */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : feature.id)}
                            className="p-2 rounded-lg transition-colors shrink-0"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            <Settings2
                              className="w-4 h-4 transition-transform"
                              style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                            />
                          </button>

                          {/* Toggle */}
                          <button
                            onClick={() => toggleFeature(feature.id, !feature.is_enabled)}
                            disabled={isToggling}
                            className="relative w-12 h-7 rounded-full transition-all shrink-0"
                            style={{
                              background: feature.is_enabled
                                ? catConfig.color
                                : "var(--border-default)",
                              opacity: isToggling ? 0.6 : 1,
                            }}
                          >
                            {isToggling ? (
                              <Loader2
                                className="w-3.5 h-3.5 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                style={{ color: "white" }}
                              />
                            ) : (
                              <span
                                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
                                style={{
                                  left: feature.is_enabled ? "calc(100% - 24px)" : "4px",
                                }}
                              />
                            )}
                          </button>
                        </div>

                        {/* Expanded config */}
                        {isExpanded && (
                          <div
                            className="px-5 pb-5 pt-2 space-y-3"
                            style={{ borderTop: "1px solid var(--border-subtle)" }}
                          >
                            <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                              CONFIGURATION
                            </p>
                            <div
                              className="p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap"
                              style={{
                                background: "var(--surface-secondary)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {JSON.stringify(feature.config, null, 2)}
                            </div>
                            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                              Last updated: {new Date(feature.updated_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
