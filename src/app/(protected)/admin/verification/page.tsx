"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  ExternalLink,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Search,
  Download,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type DocStatus = "pending" | "approved" | "rejected" | "missing";
type KycStatus = "pending" | "in_review" | "approved" | "rejected";

interface KycDocument {
  type: string;
  label: string;
  status: DocStatus;
  uploadedAt: string | null;
  url: string | null;
  note: string | null;
}

interface KycCase {
  id: string;
  companyName: string;
  countryFlag: string;
  contactEmail: string;
  submittedAt: string;
  status: KycStatus;
  documents: KycDocument[];
  adminNote: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */
const INITIAL_CASES: KycCase[] = [
  {
    id: "KYC-001",
    companyName: "Guangzhou Huawei Electronics Ltd.",
    countryFlag: "🇨🇳",
    contactEmail: "compliance@gzhw.cn",
    submittedAt: "2026-04-14",
    status: "pending",
    adminNote: "",
    documents: [
      { type: "business_license", label: "Business License", status: "pending", uploadedAt: "2026-04-14", url: "#", note: null },
      { type: "tax_certificate", label: "Tax Certificate", status: "pending", uploadedAt: "2026-04-14", url: "#", note: null },
      { type: "id_card", label: "Director ID / Passport", status: "approved", uploadedAt: "2026-04-13", url: "#", note: null },
      { type: "bank_statement", label: "Bank Statement (3 months)", status: "missing", uploadedAt: null, url: null, note: "Requested on 2026-04-14" },
    ],
  },
  {
    id: "KYC-002",
    companyName: "Shenzhen TechParts Co.",
    countryFlag: "🇨🇳",
    contactEmail: "legal@techparts.sz",
    submittedAt: "2026-04-12",
    status: "in_review",
    adminNote: "Bank statement looks unusual — escalated to finance team",
    documents: [
      { type: "business_license", label: "Business License", status: "approved", uploadedAt: "2026-04-12", url: "#", note: null },
      { type: "tax_certificate", label: "Tax Certificate", status: "approved", uploadedAt: "2026-04-12", url: "#", note: null },
      { type: "id_card", label: "Director ID / Passport", status: "approved", uploadedAt: "2026-04-12", url: "#", note: null },
      { type: "bank_statement", label: "Bank Statement (3 months)", status: "pending", uploadedAt: "2026-04-13", url: "#", note: null },
    ],
  },
  {
    id: "KYC-003",
    companyName: "Dongguan Plastics Manufacturing",
    countryFlag: "🇨🇳",
    contactEmail: "admin@dgplastics.cn",
    submittedAt: "2026-04-10",
    status: "pending",
    adminNote: "",
    documents: [
      { type: "business_license", label: "Business License", status: "approved", uploadedAt: "2026-04-10", url: "#", note: null },
      { type: "tax_certificate", label: "Tax Certificate", status: "rejected", uploadedAt: "2026-04-10", url: "#", note: "Certificate expired 2025-12-31 — please resubmit" },
      { type: "id_card", label: "Director ID / Passport", status: "pending", uploadedAt: "2026-04-11", url: "#", note: null },
      { type: "bank_statement", label: "Bank Statement (3 months)", status: "pending", uploadedAt: "2026-04-11", url: "#", note: null },
    ],
  },
  {
    id: "KYC-004",
    companyName: "Seoul Consumer Goods Ltd.",
    countryFlag: "🇰🇷",
    contactEmail: "kyc@seoulcg.kr",
    submittedAt: "2026-04-08",
    status: "in_review",
    adminNote: "",
    documents: [
      { type: "business_license", label: "Business Registration", status: "approved", uploadedAt: "2026-04-08", url: "#", note: null },
      { type: "tax_certificate", label: "Tax Certificate", status: "approved", uploadedAt: "2026-04-08", url: "#", note: null },
      { type: "id_card", label: "Director ID / Passport", status: "approved", uploadedAt: "2026-04-08", url: "#", note: null },
      { type: "bank_statement", label: "Bank Statement (3 months)", status: "approved", uploadedAt: "2026-04-09", url: "#", note: null },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const kycStatusConfig: Record<KycStatus, { label: string; color: string; bg: string; icon: typeof ShieldCheck }> = {
  pending: { label: "Pending", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  in_review: { label: "In Review", color: "var(--indigo)", bg: "color-mix(in srgb, var(--indigo) 10%, transparent)", icon: Eye },
  approved: { label: "Approved", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
};

const docStatusConfig: Record<DocStatus, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  approved: { color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2, label: "Approved" },
  pending: { color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock, label: "Pending" },
  rejected: { color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle, label: "Rejected" },
  missing: { color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: AlertTriangle, label: "Not uploaded" },
};

const kpis = [
  { label: "Pending Review", value: "23", icon: Clock, accent: "var(--warning)" },
  { label: "In Review", value: "7", icon: Eye, accent: "var(--indigo)" },
  { label: "Approved (30d)", value: "41", icon: CheckCircle2, accent: "var(--success)" },
  { label: "Rejected (30d)", value: "5", icon: XCircle, accent: "var(--danger)" },
];

/* ------------------------------------------------------------------ */
/*  Document row                                                       */
/* ------------------------------------------------------------------ */
function DocRow({ doc, onApprove, onReject }: {
  doc: KycDocument;
  onApprove: () => void;
  onReject: (note: string) => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const cfg = docStatusConfig[doc.status];
  const DocIcon = cfg.icon;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{doc.label}</p>
            {doc.uploadedAt && (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Uploaded {doc.uploadedAt}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            <DocIcon className="w-3 h-3" />
            {cfg.label}
          </span>
          {doc.url && (
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {doc.note && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)" }}>
          {doc.note}
        </p>
      )}

      {doc.status === "pending" && !rejectMode && (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}
          >
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            Approve
          </button>
          <button
            onClick={() => setRejectMode(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" }}
          >
            <XCircle className="w-3 h-3 inline mr-1" />
            Reject
          </button>
        </div>
      )}

      {rejectMode && (
        <div className="space-y-2">
          <input
            type="text"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason for rejection (shown to supplier)…"
            className="w-full px-3 py-2 rounded-lg text-xs outline-none"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { if (!rejectNote.trim()) return; onReject(rejectNote); setRejectMode(false); setRejectNote(""); }}
              disabled={!rejectNote.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
            >
              Confirm Reject
            </button>
            <button
              onClick={() => { setRejectMode(false); setRejectNote(""); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AdminVerificationPage() {
  const [cases, setCases] = useState<KycCase[]>(INITIAL_CASES);
  const [expanded, setExpanded] = useState<string | null>(INITIAL_CASES[0].id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filtered = cases.filter((c) => {
    const matchSearch = !search || c.companyName.toLowerCase().includes(search.toLowerCase()) || c.contactEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function approveDoc(caseId: string, docType: string) {
    setCases((prev) => prev.map((c) => c.id !== caseId ? c : {
      ...c,
      documents: c.documents.map((d) => d.type === docType ? { ...d, status: "approved" as DocStatus, note: null } : d),
    }));
    toast.success("Document approved");
  }

  function rejectDoc(caseId: string, docType: string, note: string) {
    setCases((prev) => prev.map((c) => c.id !== caseId ? c : {
      ...c,
      documents: c.documents.map((d) => d.type === docType ? { ...d, status: "rejected" as DocStatus, note } : d),
    }));
    toast.error("Document rejected — supplier will be notified");
  }

  async function handleApproveKyc(caseId: string) {
    setActionLoading(caseId + "_approve");
    await new Promise((r) => setTimeout(r, 700));
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, status: "approved" as KycStatus } : c));
    setActionLoading(null);
    toast.success("KYC approved — supplier account activated");
  }

  async function handleRejectKyc(caseId: string) {
    setActionLoading(caseId + "_reject");
    await new Promise((r) => setTimeout(r, 700));
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, status: "rejected" as KycStatus } : c));
    setActionLoading(null);
    toast.error("KYC rejected — supplier notified");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            KYC Verification
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Review supplier identity documents and approve onboarding
          </p>
        </div>
        <button className="btn-outline !py-2 !px-4 !text-sm">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="p-5 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}>
              <kpi.icon className="w-4 h-4" style={{ color: kpi.accent }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{kpi.value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 max-w-md"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search by company or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>

      {/* Cases */}
      <div className="space-y-3">
        {filtered.map((kyc) => {
          const statusCfg = kycStatusConfig[kyc.status];
          const StatusIcon = statusCfg.icon;
          const isExpanded = expanded === kyc.id;
          const allDocsReady = kyc.documents.every((d) => d.status === "approved");
          const hasRejected = kyc.documents.some((d) => d.status === "rejected");
          const pendingCount = kyc.documents.filter((d) => d.status === "pending").length;

          return (
            <div
              key={kyc.id}
              className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
            >
              {/* Case header */}
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left"
                onClick={() => setExpanded(isExpanded ? null : kyc.id)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xl">{kyc.countryFlag}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{kyc.companyName}</p>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ color: statusCfg.color, background: statusCfg.bg }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {kyc.contactEmail} · Submitted {kyc.submittedAt} · {kyc.id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {pendingCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: "var(--warning)", background: "color-mix(in srgb, var(--warning) 10%, transparent)" }}>
                      {pendingCount} pending doc{pendingCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {allDocsReady && kyc.status !== "approved" && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, transparent)" }}>
                      Ready to approve
                    </span>
                  )}
                  <ChevronDown
                    className="w-4 h-4 transition-transform"
                    style={{ color: "var(--text-tertiary)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </div>
              </button>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t px-6 pb-6 pt-5 space-y-5" style={{ borderColor: "var(--border-subtle)" }}>
                  {/* Documents */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>Documents</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {kyc.documents.map((doc) => (
                        <DocRow
                          key={doc.type}
                          doc={doc}
                          onApprove={() => approveDoc(kyc.id, doc.type)}
                          onReject={(note) => rejectDoc(kyc.id, doc.type, note)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Admin note */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                      Internal Note
                    </p>
                    <textarea
                      value={kyc.adminNote}
                      onChange={(e) =>
                        setCases((prev) =>
                          prev.map((c) => c.id === kyc.id ? { ...c, adminNote: e.target.value } : c)
                        )
                      }
                      placeholder="Add internal notes about this case (not shown to supplier)…"
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                      style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    />
                  </div>

                  {/* Decision */}
                  {kyc.status !== "approved" && kyc.status !== "rejected" && (
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                      <button
                        onClick={() => handleApproveKyc(kyc.id)}
                        disabled={!allDocsReady || !!actionLoading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                        style={{ background: "var(--success)", color: "white" }}
                      >
                        {actionLoading === kyc.id + "_approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve KYC
                      </button>
                      <button
                        onClick={() => handleRejectKyc(kyc.id)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                          color: "var(--danger)",
                          border: "1px solid color-mix(in srgb, var(--danger) 20%, transparent)",
                        }}
                      >
                        {actionLoading === kyc.id + "_reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Reject KYC
                      </button>
                      {!allDocsReady && (
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          All documents must be approved first{hasRejected ? " — some docs rejected" : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {kyc.status === "approved" && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "color-mix(in srgb, var(--success) 8%, transparent)", color: "var(--success)" }}>
                      <ShieldCheck className="w-4 h-4" />
                      KYC approved — supplier account is active
                    </div>
                  )}
                  {kyc.status === "rejected" && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)" }}>
                      <XCircle className="w-4 h-4" />
                      KYC rejected — supplier has been notified
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-primary)" }}>
            <ShieldCheck className="w-12 h-12 mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No KYC cases match the current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
