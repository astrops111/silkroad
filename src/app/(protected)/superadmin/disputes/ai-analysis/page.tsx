"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Gavel,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp,
  FileText,
  Truck,
  MessageSquare,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DisputeAnalysis {
  summary: string;
  buyerPosition: string;
  supplierPosition: string;
  evidenceAssessment: string;
  deliveryVerification: string;
  recommendedResolution: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  suggestedRefundPct: number;
  suggestedNote: string;
  riskFactors: string[];
  precedentNotes: string;
}

const RESOLUTION_LABELS: Record<string, { label: string; color: string }> = {
  full_pay_supplier: { label: "Release Payment to Supplier", color: "var(--success)" },
  partial_refund_buyer: { label: "Partial Refund to Buyer", color: "var(--amber)" },
  full_refund_buyer: { label: "Full Refund to Buyer", color: "var(--terracotta)" },
  replacement: { label: "Send Replacement", color: "var(--indigo)" },
  dismissed: { label: "Dismiss Dispute", color: "var(--text-tertiary)" },
};

const CONFIDENCE_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  high: { color: "var(--success)", icon: CheckCircle2 },
  medium: { color: "var(--amber)", icon: Info },
  low: { color: "var(--terracotta)", icon: AlertTriangle },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DisputeAIAnalysisPage() {
  const [disputeId, setDisputeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DisputeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!disputeId.trim()) {
      toast.error("Enter a dispute ID");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/admin/disputes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId: disputeId.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Analysis failed");
        return;
      }

      setAnalysis(data.analysis);
      toast.success("Dispute analysis complete");
    } catch {
      setError("Failed to connect to analysis service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/superadmin/dashboard"
          className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
        </Link>
        <div className="flex-1">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            AI Dispute Analysis
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            AI analyzes evidence, chat history, and delivery proof to recommend fair outcomes
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "color-mix(in srgb, var(--terracotta) 10%, transparent)",
            color: "var(--terracotta)",
          }}
        >
          <Scale className="w-3.5 h-3.5" />
          AI Mediator
        </div>
      </div>

      {/* Input */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
          Dispute ID
        </label>
        <div className="flex items-center gap-3">
          <input
            value={disputeId}
            onChange={(e) => setDisputeId(e.target.value)}
            placeholder="Enter dispute UUID..."
            className="flex-1 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={runAnalysis}
            disabled={loading || !disputeId.trim()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: loading || !disputeId.trim() ? "var(--surface-tertiary)" : "var(--obsidian)",
              color: loading || !disputeId.trim() ? "var(--text-tertiary)" : "var(--ivory)",
              cursor: loading || !disputeId.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Analyzing..." : "Analyze Dispute"}
          </button>
        </div>

        {error && (
          <div
            className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{
              background: "color-mix(in srgb, var(--danger) 8%, transparent)",
              color: "var(--danger)",
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {analysis && (
        <>
          {/* Recommendation Hero */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
          >
            <div className="p-6" style={{ background: "linear-gradient(135deg, var(--obsidian), var(--obsidian-mid))" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "rgba(245,240,232,0.5)" }}>
                    AI Recommended Resolution
                  </p>
                  <p
                    className="text-xl font-bold"
                    style={{
                      color: RESOLUTION_LABELS[analysis.recommendedResolution]?.color || "var(--amber)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {RESOLUTION_LABELS[analysis.recommendedResolution]?.label || analysis.recommendedResolution}
                  </p>
                  {analysis.suggestedRefundPct > 0 && (
                    <p className="text-sm mt-1" style={{ color: "rgba(245,240,232,0.6)" }}>
                      Suggested refund: {analysis.suggestedRefundPct}% of disputed amount
                    </p>
                  )}
                </div>
                {(() => {
                  const conf = CONFIDENCE_CONFIG[analysis.confidence];
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
                      {analysis.confidence} confidence
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Reasoning */}
            <div className="p-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Gavel className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>REASONING</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {analysis.reasoning}
              </p>
            </div>

            {/* Suggested note */}
            <div className="p-5">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-tertiary)" }}>SUGGESTED RESOLUTION NOTE</p>
              <p
                className="text-sm px-4 py-3 rounded-xl italic"
                style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}
              >
                &ldquo;{analysis.suggestedNote}&rdquo;
              </p>
            </div>
          </div>

          {/* Analysis Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Summary */}
            <div className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" style={{ color: "var(--indigo)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Summary</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {analysis.summary}
              </p>
            </div>

            {/* Evidence Assessment */}
            <div className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4" style={{ color: "var(--terracotta)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Evidence Assessment</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {analysis.evidenceAssessment}
              </p>
            </div>

            {/* Buyer Position */}
            <div className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Buyer Position</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {analysis.buyerPosition}
              </p>
            </div>

            {/* Delivery Verification */}
            <div className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4" style={{ color: "var(--success)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Delivery Verification</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {analysis.deliveryVerification}
              </p>
            </div>
          </div>

          {/* Risk Factors + Precedent */}
          {analysis.riskFactors.length > 0 && (
            <div className="rounded-2xl border p-5" style={{ background: "color-mix(in srgb, var(--warning) 4%, var(--surface-primary))", borderColor: "color-mix(in srgb, var(--warning) 20%, transparent)" }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" style={{ color: "var(--warning)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Risk Factors</h3>
              </div>
              <ul className="space-y-2">
                {analysis.riskFactors.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--warning)" }}>•</span>
                    {r}
                  </li>
                ))}
              </ul>
              {analysis.precedentNotes && (
                <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-tertiary)" }}>PRECEDENT NOTE</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{analysis.precedentNotes}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
