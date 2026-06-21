"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Gavel, AlertTriangle, Clock, MessageSquare, CheckCircle2,
  FileText, User, Building, Calendar, ChevronDown, Loader2, Upload,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type DisputeStatus = "open" | "under_review" | "awaiting_evidence" | "resolved";
type Resolution = "full_pay_supplier" | "partial_refund_buyer" | "full_refund_buyer" | "dismissed";

interface TimelineEvent { date: string; actor: string; event: string; }
interface EvidenceItem { name: string; uploadedBy: "buyer" | "supplier"; uploadedAt: string; }
interface DisputeDetail {
  id: string; title: string; type: string;
  buyer: string; buyerEmail: string;
  supplier: string; supplierEmail: string;
  orderNumber: string; amount: string;
  status: DisputeStatus; createdAt: string; description: string;
  evidence: EvidenceItem[]; timeline: TimelineEvent[];
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                           */
/* ------------------------------------------------------------------ */
const DISPUTES: DisputeDetail[] = [
  {
    id: "d1", title: "Damaged goods on arrival", type: "damaged",
    buyer: "TechHub Ghana", buyerEmail: "orders@techhubgh.com",
    supplier: "SunTech Shenzhen", supplierEmail: "export@suntech.cn",
    orderNumber: "SR-20260408-003", amount: "$2,400",
    status: "open", createdAt: "2026-04-14",
    description: "Buyer reports that 8 of 50 units arrived with broken screens. Packaging appeared intact on delivery. Photos show damage consistent with rough handling during transit.",
    evidence: [
      { name: "damaged-units-photo-1.jpg", uploadedBy: "buyer", uploadedAt: "2026-04-14" },
      { name: "damaged-units-photo-2.jpg", uploadedBy: "buyer", uploadedAt: "2026-04-14" },
      { name: "delivery-receipt.pdf",      uploadedBy: "buyer", uploadedAt: "2026-04-14" },
    ],
    timeline: [
      { date: "2026-04-14 09:21", actor: "TechHub Ghana", event: "Dispute opened — damaged goods reported" },
      { date: "2026-04-14 09:21", actor: "System",        event: "Payment hold applied on SR-20260408-003" },
      { date: "2026-04-14 10:05", actor: "TechHub Ghana", event: "3 evidence files uploaded" },
    ],
  },
  {
    id: "d2", title: "Wrong item received - ordered blue, received red", type: "wrong_item",
    buyer: "Nairobi Imports Ltd", buyerEmail: "orders@nairobiimports.co.ke",
    supplier: "Silk Valley Textiles", supplierEmail: "sales@silkvalley.cn",
    orderNumber: "SR-20260405-012", amount: "$560",
    status: "under_review", createdAt: "2026-04-12",
    description: "Buyer ordered 80 units in blue (SVT-COTTON-BLUE). Received 80 units in red (SVT-COTTON-RED). Supplier's own packing list confirms the wrong SKU was shipped.",
    evidence: [
      { name: "received-items-red.jpg",    uploadedBy: "buyer",    uploadedAt: "2026-04-12" },
      { name: "order-confirmation.pdf",    uploadedBy: "buyer",    uploadedAt: "2026-04-12" },
      { name: "packing-list-supplier.pdf", uploadedBy: "supplier", uploadedAt: "2026-04-13" },
    ],
    timeline: [
      { date: "2026-04-12 14:30", actor: "Nairobi Imports Ltd",  event: "Dispute opened — wrong item received" },
      { date: "2026-04-12 14:30", actor: "System",                event: "Payment hold applied" },
      { date: "2026-04-12 15:00", actor: "Nairobi Imports Ltd",  event: "2 evidence files uploaded" },
      { date: "2026-04-13 08:44", actor: "Silk Valley Textiles", event: "Packing list uploaded — confirms shipping error" },
      { date: "2026-04-13 09:00", actor: "Admin",                 event: "Dispute moved to Under Review" },
    ],
  },
  {
    id: "d3", title: "Quantity mismatch - received 450 of 500 ordered", type: "quantity_mismatch",
    buyer: "Cairo Electronics", buyerEmail: "ahmed.h@cairoelectronics.eg",
    supplier: "BrightPath Lighting", supplierEmail: "export@brightpath.cn",
    orderNumber: "SR-20260401-008", amount: "$1,425",
    status: "awaiting_evidence", createdAt: "2026-04-10",
    description: "Buyer ordered 500 LED bulb packs; received 450. Carrier delivery note shows 18 cartons delivered vs 20 shipped. Buyer claims refund for 50 missing units at $28.50 each.",
    evidence: [
      { name: "delivery-note-18-cartons.pdf", uploadedBy: "buyer", uploadedAt: "2026-04-10" },
    ],
    timeline: [
      { date: "2026-04-10 11:15", actor: "Cairo Electronics", event: "Dispute opened — quantity shortfall" },
      { date: "2026-04-10 11:15", actor: "System",             event: "Payment hold applied" },
      { date: "2026-04-10 11:30", actor: "Cairo Electronics", event: "Delivery note uploaded" },
      { date: "2026-04-10 13:00", actor: "Admin",              event: "Requested shipping carrier manifest from supplier" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */
const statusConfig: Record<DisputeStatus, { label: string; color: string; bg: string; icon: typeof Gavel }> = {
  open:              { label: "Open",              color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: AlertTriangle },
  under_review:      { label: "Under Review",      color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",  icon: Clock },
  awaiting_evidence: { label: "Awaiting Evidence", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: MessageSquare },
  resolved:          { label: "Resolved",          color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
};

const resolutionOptions: { value: Resolution; label: string }[] = [
  { value: "full_pay_supplier",    label: "Release full payment to supplier" },
  { value: "partial_refund_buyer", label: "Partial refund to buyer" },
  { value: "full_refund_buyer",    label: "Full refund to buyer" },
  { value: "dismissed",            label: "Dismiss dispute" },
];

const typeLabel: Record<string, string> = {
  damaged: "Damaged goods", wrong_item: "Wrong item",
  quantity_mismatch: "Quantity mismatch", not_delivered: "Not delivered", quality: "Quality issue",
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispute = DISPUTES.find((d) => d.id === id);
  const [resolution, setResolution] = useState<Resolution | "">("");
  const [adminNote, setAdminNote] = useState("");
  const [resolving, setResolving] = useState(false);

  if (!dispute) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Gavel className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Dispute not found</p>
        <Link href="/admin/disputes" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to disputes</Link>
      </div>
    );
  }

  const status = statusConfig[dispute.status];
  const StatusIcon = status.icon;

  async function handleResolve() {
    if (!resolution) return;
    setResolving(true);
    await new Promise((r) => setTimeout(r, 800));
    setResolving(false);
    toast.success("Dispute resolved");
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
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
              <span>{dispute.orderNumber}</span>
              <span>·</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{dispute.amount}</span>
              <span>·</span>
              <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{dispute.createdAt}</div>
            </div>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>
            {typeLabel[dispute.type] ?? dispute.type}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: parties + description + evidence + timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Parties */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Buyer",    icon: User,     name: dispute.buyer,    email: dispute.buyerEmail },
              { label: "Supplier", icon: Building, name: dispute.supplier, email: dispute.supplierEmail },
            ].map((party) => (
              <div key={party.label} className="rounded-2xl border p-4 space-y-2" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <party.icon className="w-4 h-4" style={{ color: "var(--amber)" }} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{party.label}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{party.name}</p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{party.email}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Description</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{dispute.description}</p>
          </div>

          {/* Evidence */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Evidence ({dispute.evidence.length})
                </h2>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>
                <Upload className="w-3.5 h-3.5" /> Request more
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {dispute.evidence.map((ev) => (
                <div key={ev.name} className="flex items-center justify-between px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{ev.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        By {ev.uploadedBy === "buyer" ? dispute.buyer : dispute.supplier} · {ev.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <button className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: "var(--amber)", background: "color-mix(in srgb, var(--amber) 8%, transparent)" }}>
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Timeline</h2>
            <div className="space-y-4">
              {dispute.timeline.map((ev, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "var(--amber)" }} />
                    {i < dispute.timeline.length - 1 && (
                      <div className="w-px flex-1 mt-1" style={{ background: "var(--border-subtle)" }} />
                    )}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>{ev.event}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{ev.actor} · {ev.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: resolution + note */}
        <div className="space-y-5">
          {dispute.status !== "resolved" ? (
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
              placeholder="Internal notes — not shown to buyer or supplier…"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
