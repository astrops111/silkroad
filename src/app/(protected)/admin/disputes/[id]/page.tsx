"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Gavel, AlertTriangle, Clock, MessageSquare, CheckCircle2,
  FileText, User, Building, Calendar, ChevronDown, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type DisputeStatus = "open" | "under_review" | "awaiting_evidence" | "resolved" | "escalated" | "closed";
type Resolution = "full_pay_supplier" | "partial_refund_buyer" | "full_refund_buyer" | "replacement" | "dismissed";

interface DisputeDetail {
  id: string;
  title: string;
  type: string;
  description: string;
  status: DisputeStatus;
  resolution: Resolution | null;
  resolution_note: string | null;
  disputed_amount: number | null;
  currency: string | null;
  created_at: string;
  resolved_at: string | null;
  evidence_urls: string[] | null;
  buyer: { name: string } | null;
  supplier: { name: string } | null;
  openedBy: { full_name: string | null; email: string | null } | null;
  order: { order_number: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Gavel }> = {
  open:              { label: "Open",              color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: AlertTriangle },
  under_review:      { label: "Under Review",      color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",  icon: Clock },
  awaiting_evidence: { label: "Awaiting Evidence", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: MessageSquare },
  escalated:         { label: "Escalated",         color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: AlertTriangle },
  resolved:          { label: "Resolved",          color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  closed:            { label: "Closed",            color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: CheckCircle2 },
};

const resolutionOptions: { value: Resolution; label: string }[] = [
  { value: "full_pay_supplier",    label: "Release full payment to supplier" },
  { value: "partial_refund_buyer", label: "Partial refund to buyer" },
  { value: "full_refund_buyer",    label: "Full refund to buyer" },
  { value: "replacement",          label: "Replacement shipment" },
  { value: "dismissed",            label: "Dismiss dispute" },
];

const typeLabel: Record<string, string> = {
  product_quality: "Product quality", wrong_item: "Wrong item", not_delivered: "Not delivered",
  damaged: "Damaged goods", quantity_mismatch: "Quantity mismatch", late_delivery: "Late delivery",
};

function formatAmount(amount: number | null, currency: string | null) {
  if (!amount) return "—";
  return `${currency ?? "USD"} ${(amount / 100).toFixed(2)}`;
}

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dispute, setDispute] = useState<DisputeDetail | null | undefined>(undefined);
  const [resolution, setResolution] = useState<Resolution | "">("");
  const [refundAmount, setRefundAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [resolving, setResolving] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/disputes?id=${id}`);
    const data = await res.json();
    setDispute(data.disputes?.[0] ?? null);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (dispute === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Gavel className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Dispute not found</p>
        <Link href="/admin/disputes" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to disputes</Link>
      </div>
    );
  }

  const status = statusConfig[dispute.status] ?? statusConfig.open;
  const StatusIcon = status.icon;
  const isResolved = dispute.status === "resolved" || dispute.status === "closed";

  async function handleResolve() {
    if (!resolution) return;
    setResolving(true);
    const res = await fetch("/api/admin/disputes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disputeId: id,
        resolution,
        resolutionNote: adminNote || undefined,
        refundAmount: resolution === "partial_refund_buyer" && refundAmount ? Math.round(Number(refundAmount) * 100) : undefined,
      }),
    });
    const data = await res.json();
    setResolving(false);
    if (!res.ok) {
      toast.error(data.error || "Failed to resolve dispute");
      return;
    }
    toast.success("Dispute resolved");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/disputes" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Disputes
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {dispute.title}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-sm" style={{ color: "var(--text-tertiary)" }}>
              <span>{dispute.order?.order_number ?? "—"}</span>
              <span>·</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatAmount(dispute.disputed_amount, dispute.currency)}</span>
              <span>·</span>
              <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(dispute.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>
            {typeLabel[dispute.type] ?? dispute.type}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Buyer",    icon: User,     name: dispute.buyer?.name ?? "—",    email: dispute.openedBy?.email ?? "" },
              { label: "Supplier", icon: Building, name: dispute.supplier?.name ?? "—", email: "" },
            ].map((party) => (
              <div key={party.label} className="rounded-2xl border p-4 space-y-2" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <party.icon className="w-4 h-4" style={{ color: "var(--amber)" }} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{party.label}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{party.name}</p>
                {party.email && <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{party.email}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border p-6" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Description</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{dispute.description}</p>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Evidence ({dispute.evidence_urls?.length ?? 0})
                </h2>
              </div>
            </div>
            {(!dispute.evidence_urls || dispute.evidence_urls.length === 0) ? (
              <p className="px-6 py-6 text-sm" style={{ color: "var(--text-tertiary)" }}>No evidence uploaded yet.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                {dispute.evidence_urls.map((url, i) => (
                  <div key={url} className="flex items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>Evidence {i + 1}</p>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                      style={{ color: "var(--amber)", background: "color-mix(in srgb, var(--amber) 8%, transparent)" }}
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isResolved && (
            <div className="rounded-2xl border p-6" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Resolution</h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {resolutionOptions.find((o) => o.value === dispute.resolution)?.label ?? dispute.resolution}
                {dispute.resolved_at && ` · ${new Date(dispute.resolved_at).toLocaleString()}`}
              </p>
              {dispute.resolution_note && (
                <p className="text-sm mt-2" style={{ color: "var(--text-tertiary)" }}>{dispute.resolution_note}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {!isResolved ? (
            <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Resolution</h2>
              <div className="relative">
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as Resolution)}
                  className="w-full appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: resolution ? "var(--text-primary)" : "var(--text-tertiary)" }}
                >
                  <option value="">Select resolution…</option>
                  {resolutionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
              </div>
              {resolution === "partial_refund_buyer" && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Refund amount"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              )}
              <button
                onClick={handleResolve}
                disabled={!resolution || resolving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--success)", color: "white" }}
              >
                {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Apply Resolution
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border p-5 flex items-center gap-3" style={{ background: "color-mix(in srgb, var(--success) 8%, transparent)", borderColor: "color-mix(in srgb, var(--success) 20%, transparent)" }}>
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>Dispute resolved</p>
            </div>
          )}

          <div className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Admin Note</h2>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={4}
              placeholder="Internal notes — recorded with the resolution…"
              disabled={isResolved}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none disabled:opacity-60"
              style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
