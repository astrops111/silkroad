"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Users,
  Star,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Crown,
  TrendingUp,
  Clock,
  MapPin,
  Target,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface SupplierMatch {
  companyId: string;
  companyName: string;
  matchScore: number;
  matchReasons: string[];
  concerns: string[];
  estimatedUnitPrice: number | null;
  estimatedLeadTimeDays: number | null;
  tierBadge: string;
  recommended: boolean;
}

interface MatchResult {
  matches: SupplierMatch[];
  summary: string;
  totalCandidatesScanned: number;
  matchCriteria: string[];
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: typeof Star }> = {
  verified: { label: "Verified", color: "var(--terracotta)", icon: Shield },
  gold: { label: "Gold", color: "var(--amber)", icon: Crown },
  standard: { label: "Standard", color: "var(--indigo)", icon: Star },
  free: { label: "Free", color: "var(--text-tertiary)", icon: Package },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--amber)" : "var(--terracotta)";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-tertiary)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function RFQMatchPage() {
  const [rfqId, setRfqId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMatch = async () => {
    if (!rfqId.trim()) {
      toast.error("Enter an RFQ ID");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/rfq-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqId: rfqId.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Matching failed");
        return;
      }

      setResult(data.result);
      toast.success(`Found ${data.result.matches.length} matching suppliers!`);
    } catch {
      setError("Failed to connect to matching service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/rfq" className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors">
          <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            AI Supplier Matching
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Find the best suppliers for your RFQ based on product fit, pricing, and reliability
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "color-mix(in srgb, var(--indigo) 10%, transparent)", color: "var(--indigo)" }}>
          <Sparkles className="w-3.5 h-3.5" />
          AI Matching
        </div>
      </div>

      {/* Input */}
      <div className="rounded-2xl border p-6" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>RFQ ID</label>
        <div className="flex items-center gap-3">
          <input
            value={rfqId}
            onChange={(e) => setRfqId(e.target.value)}
            placeholder="Enter RFQ UUID..."
            className="flex-1 rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
          <button
            onClick={runMatch}
            disabled={loading || !rfqId.trim()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: loading || !rfqId.trim() ? "var(--surface-tertiary)" : "var(--obsidian)",
              color: loading || !rfqId.trim() ? "var(--text-tertiary)" : "var(--ivory)",
              cursor: loading || !rfqId.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {loading ? "Matching suppliers..." : "Find Suppliers"}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)" }}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="flex items-start gap-3 px-5 py-4 rounded-xl" style={{ background: "color-mix(in srgb, var(--indigo) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--indigo) 15%, transparent)" }}>
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--indigo)" }} />
            <div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{result.summary}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                Scanned {result.totalCandidatesScanned} suppliers • Matched on: {result.matchCriteria.join(", ")}
              </p>
            </div>
          </div>

          {/* Matches */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Top Matches ({result.matches.length})
            </h2>

            {result.matches.map((match, idx) => {
              const tierCfg = TIER_CONFIG[match.tierBadge] || TIER_CONFIG.free;
              const TierIcon = tierCfg.icon;

              return (
                <div
                  key={idx}
                  className="rounded-2xl border overflow-hidden"
                  style={{
                    background: "var(--surface-primary)",
                    borderColor: match.recommended ? `color-mix(in srgb, var(--success) 25%, var(--border-subtle))` : "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center gap-4 p-5">
                    {/* Rank */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                      style={{
                        background: match.recommended ? "color-mix(in srgb, var(--success) 12%, transparent)" : "var(--surface-secondary)",
                        color: match.recommended ? "var(--success)" : "var(--text-tertiary)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      #{idx + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{match.companyName}</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${tierCfg.color} 12%, transparent)`, color: tierCfg.color }}>
                          <TierIcon className="w-3 h-3" />
                          {tierCfg.label}
                        </span>
                        {match.recommended && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", color: "var(--success)" }}>
                            <CheckCircle2 className="w-3 h-3" /> Recommended
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {match.matchReasons.slice(0, 3).map((r, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-5 shrink-0">
                      <div className="text-right">
                        <ScoreBar score={match.matchScore} />
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>Match score</p>
                      </div>
                      {match.estimatedUnitPrice && (
                        <div className="text-right">
                          <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>${match.estimatedUnitPrice.toFixed(2)}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>est. price</p>
                        </div>
                      )}
                      {match.estimatedLeadTimeDays && (
                        <div className="text-right">
                          <p className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                            <Clock className="w-3 h-3" /> {match.estimatedLeadTimeDays}d
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>lead time</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Concerns */}
                  {match.concerns.length > 0 && (
                    <div className="px-5 pb-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
                        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          {match.concerns.join(" • ")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "color-mix(in srgb, var(--indigo) 10%, transparent)" }}>
            <Users className="w-8 h-8" style={{ color: "var(--indigo)" }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Find the Best Suppliers for Your RFQ
          </h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-tertiary)" }}>
            Enter your RFQ ID and our AI will analyze your requirements against all platform suppliers —
            scoring them on product fit, pricing, reliability, certifications, and location.
          </p>
        </div>
      )}
    </div>
  );
}
