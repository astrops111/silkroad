"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ShieldQuestion,
} from "lucide-react";
import { toast } from "sonner";

export type KycCase = {
  id: string;
  name: string;
  countryCode: string | null;
  city: string | null;
  taxId: string | null;
  taxIdType: string | null;
  submittedAt: string | null;
  licenseUrl: string | null;
  contactEmail: string | null;
  contactName: string | null;
};

export type KycCounts = {
  pending: number;
  verified: number;
  rejected: number;
  unverified: number;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function VerificationQueueClient({
  cases: initialCases,
  counts,
}: {
  cases: KycCase[];
  counts: KycCounts;
}) {
  const [cases, setCases] = useState(initialCases);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [decided, setDecided] = useState({ approved: 0, rejected: 0 });

  const kpis = [
    { label: "Pending Review", value: counts.pending - decided.approved - decided.rejected, icon: Clock, accent: "var(--warning)" },
    { label: "Verified", value: counts.verified + decided.approved, icon: CheckCircle2, accent: "var(--success)" },
    { label: "Rejected", value: counts.rejected + decided.rejected, icon: XCircle, accent: "var(--danger)" },
    { label: "Not Yet Submitted", value: counts.unverified, icon: ShieldQuestion, accent: "var(--text-tertiary)" },
  ];

  const decide = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: id,
          action,
          ...(action === "reject" && note.trim() ? { reason: note.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Request failed");
      }
      setCases((prev) => prev.filter((c) => c.id !== id));
      setDecided((d) =>
        action === "approve"
          ? { ...d, approved: d.approved + 1 }
          : { ...d, rejected: d.rejected + 1 }
      );
      setRejectingId(null);
      setNote("");
      toast.success(
        action === "approve"
          ? "Supplier verified — settlements unblocked, owner notified"
          : "Verification rejected — owner notified"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          KYC Verification
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Supplier verification submissions. Approval unblocks settlement
          payouts and resource listings.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="p-6 rounded-2xl border"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}
            >
              <kpi.icon className="w-5 h-5" style={{ color: kpi.accent }} />
            </div>
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {kpi.value}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Queue */}
      {cases.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <CheckCircle2
            className="w-8 h-8 mx-auto mb-3"
            style={{ color: "var(--success)" }}
          />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Queue clear
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            No pending verifications. Suppliers submit from Settings →
            Verification in the supplier portal.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => {
            const busy = busyId === c.id;
            const rejecting = rejectingId === c.id;
            return (
              <div
                key={c.id}
                className="rounded-2xl border p-6"
                style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold text-base"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {c.name}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          color: "var(--warning)",
                          background: "color-mix(in srgb, var(--warning) 10%, transparent)",
                        }}
                      >
                        Pending
                      </span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {[c.city, c.countryCode].filter(Boolean).join(", ") || "Location unknown"}
                      {" · submitted "}
                      {fmtDate(c.submittedAt)}
                      {c.contactEmail && (
                        <>
                          {" · "}
                          <a
                            href={`mailto:${c.contactEmail}`}
                            className="hover:underline"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {c.contactName || c.contactEmail}
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/admin/suppliers/${c.id}`}
                    className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                    style={{ color: "var(--amber-dark)" }}
                  >
                    Full profile
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Documents */}
                <div
                  className="mt-4 rounded-xl border divide-y"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                      <span style={{ color: "var(--text-secondary)" }}>Business license</span>
                    </div>
                    {c.licenseUrl ? (
                      <a
                        href={c.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                        style={{ color: "var(--indigo)" }}
                      >
                        View document
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium"
                        style={{ color: "var(--danger)" }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Not uploaded
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                      <span style={{ color: "var(--text-secondary)" }}>
                        Tax ID{c.taxIdType ? ` (${c.taxIdType})` : ""}
                      </span>
                    </div>
                    <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>
                      {c.taxId ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Reject note */}
                {rejecting && (
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Reason shown to the supplier (e.g. license expired, name mismatch)…"
                    rows={2}
                    className="mt-4 w-full rounded-xl border px-3 py-2 text-sm"
                    style={{
                      background: "var(--surface-secondary)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                    }}
                  />
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => decide(c.id, "approve")}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                    style={{
                      background: "color-mix(in srgb, var(--success) 12%, transparent)",
                      color: "var(--success)",
                      border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)",
                    }}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </button>
                  {rejecting ? (
                    <>
                      <button
                        onClick={() => decide(c.id, "reject")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                        style={{
                          background: "color-mix(in srgb, var(--danger) 12%, transparent)",
                          color: "var(--danger)",
                          border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
                        }}
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Confirm rejection
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setNote("");
                        }}
                        disabled={busy}
                        className="text-sm font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setRejectingId(c.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                      style={{
                        color: "var(--danger)",
                        border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject…
                    </button>
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
