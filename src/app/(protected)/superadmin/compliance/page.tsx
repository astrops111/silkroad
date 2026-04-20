"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  Globe,
  FileText,
  ArrowRight,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ComplianceFlag {
  severity: "critical" | "warning" | "info";
  code: string;
  title: string;
  description: string;
  regulation: string;
  recommendation: string;
}

interface ComplianceResult {
  status: "clear" | "flagged" | "blocked";
  flags: ComplianceFlag[];
  tradeAgreements: string[];
  requiredDocuments: string[];
  estimatedDutyPct: number | null;
  notes: string;
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

const COUNTRIES = [
  { code: "CN", name: "China" },
  { code: "KE", name: "Kenya" }, { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" }, { code: "ZA", name: "South Africa" },
  { code: "UG", name: "Uganda" }, { code: "TZ", name: "Tanzania" },
  { code: "ET", name: "Ethiopia" }, { code: "RW", name: "Rwanda" },
  { code: "SN", name: "Senegal" }, { code: "CI", name: "Ivory Coast" },
  { code: "EG", name: "Egypt" }, { code: "MA", name: "Morocco" },
  { code: "ZM", name: "Zambia" }, { code: "ZW", name: "Zimbabwe" },
  { code: "CM", name: "Cameroon" }, { code: "CD", name: "DR Congo" },
];

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: typeof AlertTriangle }> = {
  critical: { color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 8%, transparent)", icon: XCircle },
  warning: { color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 8%, transparent)", icon: AlertTriangle },
  info: { color: "var(--info)", bg: "color-mix(in srgb, var(--info) 8%, transparent)", icon: Info },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  clear: { label: "Compliant", color: "var(--success)", icon: CheckCircle2 },
  flagged: { label: "Flagged — Review Required", color: "var(--warning)", icon: AlertTriangle },
  blocked: { label: "Blocked — Cannot Proceed", color: "var(--danger)", icon: XCircle },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CompliancePage() {
  const [form, setForm] = useState({
    productName: "",
    productDescription: "",
    category: "consumer_goods",
    hsCode: "",
    originCountry: "CN",
    destinationCountry: "KE",
    valueUsd: "",
    weight: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const runScan = async () => {
    if (!form.productName) {
      toast.error("Product name is required");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/compliance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Scan failed");
        return;
      }

      setResult(data.compliance);
      toast.success("Compliance scan complete");
    } catch {
      setError("Failed to connect to compliance service");
    } finally {
      setLoading(false);
    }
  };

  const originName = COUNTRIES.find((c) => c.code === form.originCountry)?.name || form.originCountry;
  const destName = COUNTRIES.find((c) => c.code === form.destinationCountry)?.name || form.destinationCountry;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Compliance Scanner
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Check products and transactions against import/export regulations
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "color-mix(in srgb, var(--success) 10%, transparent)",
            color: "var(--success)",
          }}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Regulatory AI
        </div>
      </div>

      {/* Input Form */}
      <div
        className="rounded-2xl border p-6 space-y-5"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        {/* Trade Route */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
            Trade Route
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <select
                value={form.originCountry}
                onChange={(e) => updateForm("originCountry", e.target.value)}
                className="w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
            </div>
            <ArrowRight className="w-5 h-5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
            <div className="relative flex-1">
              <select
                value={form.destinationCountry}
                onChange={(e) => updateForm("destinationCountry", e.target.value)}
                className="w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Product Name *</label>
            <input
              value={form.productName}
              onChange={(e) => updateForm("productName", e.target.value)}
              placeholder="e.g. Solar Panel 400W Monocrystalline"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => updateForm("category", e.target.value)}
                className="w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Description</label>
          <textarea
            value={form.productDescription}
            onChange={(e) => updateForm("productDescription", e.target.value)}
            placeholder="Product details, materials, intended use..."
            rows={2}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none"
            style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>HS Code</label>
            <input
              value={form.hsCode}
              onChange={(e) => updateForm("hsCode", e.target.value)}
              placeholder="e.g. 8541.40"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Value (USD)</label>
            <input
              type="number"
              value={form.valueUsd}
              onChange={(e) => updateForm("valueUsd", e.target.value)}
              placeholder="e.g. 5000"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Weight (kg)</label>
            <input
              type="number"
              value={form.weight}
              onChange={(e) => updateForm("weight", e.target.value)}
              placeholder="e.g. 25"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        <button
          onClick={runScan}
          disabled={loading || !form.productName}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: loading || !form.productName ? "var(--surface-tertiary)" : "var(--obsidian)",
            color: loading || !form.productName ? "var(--text-tertiary)" : "var(--ivory)",
            cursor: loading || !form.productName ? "not-allowed" : "pointer",
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {loading ? `Scanning ${originName} → ${destName}...` : "Run Compliance Scan"}
        </button>

        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)" }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Status Banner */}
          {(() => {
            const st = STATUS_CONFIG[result.status];
            const StatusIcon = st.icon;
            return (
              <div
                className="flex items-center gap-3 px-5 py-4 rounded-2xl"
                style={{
                  background: `color-mix(in srgb, ${st.color} 8%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${st.color} 25%, transparent)`,
                }}
              >
                <StatusIcon className="w-6 h-6" style={{ color: st.color }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: st.color }}>{st.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{result.notes}</p>
                </div>
                {result.estimatedDutyPct !== null && (
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                      {result.estimatedDutyPct}%
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Est. duty rate</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Flags */}
          {result.flags.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Compliance Flags ({result.flags.length})
              </h2>
              {result.flags.map((flag, i) => {
                const sev = SEVERITY_CONFIG[flag.severity];
                const FlagIcon = sev.icon;
                return (
                  <div
                    key={i}
                    className="rounded-2xl border p-5"
                    style={{ background: sev.bg, borderColor: `color-mix(in srgb, ${sev.color} 20%, transparent)` }}
                  >
                    <div className="flex items-start gap-3">
                      <FlagIcon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: sev.color }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: `color-mix(in srgb, ${sev.color} 15%, transparent)`, color: sev.color }}>
                            {flag.severity}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                            {flag.code}
                          </span>
                        </div>
                        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{flag.title}</p>
                        <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>{flag.description}</p>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            <span className="font-semibold">Regulation:</span> {flag.regulation}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            <span className="font-semibold">Action:</span> {flag.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trade Agreements + Documents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.tradeAgreements.length > 0 && (
              <div className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4" style={{ color: "var(--indigo)" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Trade Agreements</h3>
                </div>
                <ul className="space-y-2">
                  {result.tradeAgreements.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.requiredDocuments.length > 0 && (
              <div className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" style={{ color: "var(--terracotta)" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Required Documents</h3>
                </div>
                <ul className="space-y-2">
                  {result.requiredDocuments.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--terracotta)" }}>•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
