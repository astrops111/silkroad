"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, Loader2, CheckCircle2, Circle, XCircle, FileText,
  Paperclip, Send, Trash2, Building, Ship, Banknote, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatMoney, toDisplayAmount } from "@/lib/payments/currency-config";
import { TRADE_FLOW_STEPS, STEP_DEFS, stepIndex, nextStep, isTerminal } from "@/lib/trade-flow/steps";

/* ------------------------------------------------------------------ */
/*  Types — shapes returned by GET /api/admin/trade-flows/[id]         */
/* ------------------------------------------------------------------ */
interface Flow {
  id: string;
  flow_number: string;
  rfq_id: string | null;
  purchase_order_id: string | null;
  buyer_user_id: string | null;
  buyer_company_name: string | null;
  supplier_company_id: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  current_step: string;
  consignee_company_name: string | null;
  consignee_tin: string | null;
  consignee_phone: string | null;
  consignee_email: string | null;
  destination_port: string | null;
  goods_summary: string | null;
  currency: string;
  goods_total: number | null;
  shipping_cost: number | null;
  grand_total: number | null;
  shipping_fee_due: number | null;
  payment_instructions: string | null;
  shipping_payment_instructions: string | null;
  vessel_name: string | null;
  seaway_bill_number: string | null;
  etd: string | null;
  eta: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FlowEvent {
  id: string;
  from_step: string | null;
  to_step: string;
  note: string | null;
  notified: Record<string, unknown>;
  created_at: string;
}

interface FlowDoc {
  id: string;
  kind: string;
  file_url: string | null;
  file_name: string | null;
  note: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Field metadata for step-payload forms                              */
/* ------------------------------------------------------------------ */
const FIELD_META: Record<string, { label: string; type: "text" | "textarea" | "money" | "date" | "email" }> = {
  supplier_name:                 { label: "Supplier name", type: "text" },
  supplier_email:                { label: "Supplier email", type: "email" },
  consignee_company_name:        { label: "Consignee company name", type: "text" },
  consignee_tin:                 { label: "Consignee TIN", type: "text" },
  consignee_phone:               { label: "Consignee phone", type: "text" },
  consignee_email:               { label: "Consignee email", type: "email" },
  destination_port:              { label: "Port of destination", type: "text" },
  goods_summary:                 { label: "Goods description", type: "textarea" },
  currency:                      { label: "Currency (e.g. USD)", type: "text" },
  goods_total:                   { label: "Goods total", type: "money" },
  shipping_cost:                 { label: "Shipping cost", type: "money" },
  grand_total:                   { label: "Grand total", type: "money" },
  shipping_fee_due:              { label: "Shipping charge due", type: "money" },
  payment_instructions:          { label: "Payment instructions (shown to buyer)", type: "textarea" },
  shipping_payment_instructions: { label: "Shipping payment instructions (shown to buyer)", type: "textarea" },
  vessel_name:                   { label: "Vessel name", type: "text" },
  seaway_bill_number:            { label: "Seaway Bill number", type: "text" },
  etd:                           { label: "ETD (departure)", type: "date" },
  eta:                           { label: "ETA (arrival)", type: "date" },
};

const DOC_KIND_LABELS: Record<string, string> = {
  quote_request: "Quote request",
  supplier_invoice: "Supplier invoice",
  buyer_invoice: "Buyer invoice",
  buyer_payment_proof: "Buyer payment proof",
  supplier_payment_proof: "Supplier payment proof",
  seaway_bill: "Seaway Bill",
  ebm: "EBM",
  other: "Other",
};

export default function TradeFlowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [documents, setDocuments] = useState<FlowDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Advance form
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  // Documents form
  const [docKind, setDocKind] = useState("other");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docNote, setDocNote] = useState("");
  const [docUploading, setDocUploading] = useState(false);

  const fetchFlow = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/trade-flows/${id}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setFlow(data.flow);
      setEvents(data.events ?? []);
      setDocuments(data.documents ?? []);
    } catch (err) {
      console.error("Failed to fetch trade flow:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  // Pre-fill the advance form with current flow values when the flow loads.
  const upcoming = flow && !isTerminal(flow.current_step) ? nextStep(flow.current_step) : null;
  useEffect(() => {
    if (!flow || !upcoming) return;
    const def = STEP_DEFS[upcoming];
    if (!def) return;
    const values: Record<string, string> = {};
    for (const field of def.fields) {
      const raw = (flow as unknown as Record<string, unknown>)[field];
      if (raw === null || raw === undefined) {
        values[field] = "";
      } else if (FIELD_META[field]?.type === "money") {
        values[field] = String(toDisplayAmount(Number(raw), flow.currency));
      } else {
        values[field] = String(raw);
      }
    }
    setFieldValues(values);
  }, [flow, upcoming]);

  async function advance(toStep: string) {
    if (!flow) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/admin/trade-flows/${flow.id}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStep, note: note || undefined, fields: fieldValues }),
      });
      const result = await res.json();
      if (result.success) {
        const sent: string[] = [];
        if (result.notified?.buyerEmail) sent.push("buyer email");
        if (result.notified?.supplierEmail) sent.push("supplier email");
        if (result.notified?.telegram) sent.push("Telegram");
        if (result.notified?.inApp) sent.push("in-app");
        toast.success(
          `Moved to "${STEP_DEFS[toStep]?.label ?? toStep}"${sent.length ? ` — notified: ${sent.join(", ")}` : ""}`
        );
        setNote("");
        setShowCancel(false);
        await fetchFlow();
      } else {
        toast.error(result.error || "Failed to advance");
      }
    } catch {
      toast.error("Failed to advance");
    } finally {
      setAdvancing(false);
    }
  }

  async function attachDocument() {
    if (!flow) return;
    if (!docFile && !docNote) {
      toast.error("Choose a file or add a note");
      return;
    }
    setDocUploading(true);
    try {
      let filePath: string | undefined;
      let fileName: string | undefined;
      if (docFile) {
        const fd = new FormData();
        fd.append("file", docFile);
        fd.append("bucket", "documents");
        fd.append("folder", `trade-flows/${flow.id}/`);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        const up = await upRes.json();
        if (!upRes.ok) {
          toast.error(up.error || "Upload failed");
          return;
        }
        // The documents bucket is private — send the storage path so the API
        // can mint a long-lived signed URL (the public URL would 403).
        filePath = up.path;
        fileName = up.fileName;
      }
      const res = await fetch(`/api/admin/trade-flows/${flow.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: docKind, filePath, fileName, note: docNote || undefined }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Document attached");
        setDocFile(null);
        setDocNote("");
        await fetchFlow();
      } else {
        toast.error(result.error || "Failed to attach document");
      }
    } catch {
      toast.error("Failed to attach document");
    } finally {
      setDocUploading(false);
    }
  }

  async function removeDocument(documentId: string) {
    if (!flow) return;
    try {
      const res = await fetch(`/api/admin/trade-flows/${flow.id}/documents?documentId=${documentId}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast.success("Document removed");
        await fetchFlow();
      } else {
        toast.error(result.error || "Failed to remove document");
      }
    } catch {
      toast.error("Failed to remove document");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
      </div>
    );
  }

  if (notFound || !flow) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <FileText className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Trade flow not found</p>
        <Link href="/admin/trade-flows" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to trade flows</Link>
      </div>
    );
  }

  const currentIdx = stepIndex(flow.current_step);
  const upcomingDef = upcoming ? STEP_DEFS[upcoming] : null;
  const cancelled = flow.current_step === "cancelled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/trade-flows" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Trade Flows
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {flow.flow_number}
              </h1>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={
                  cancelled
                    ? { color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }
                    : flow.current_step === "completed"
                      ? { color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, transparent)" }
                      : { color: "var(--indigo)", background: "color-mix(in srgb, var(--indigo) 10%, transparent)" }
                }
              >
                {STEP_DEFS[flow.current_step]?.label ?? flow.current_step}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {flow.buyer_company_name ?? "Unknown buyer"}
              {flow.supplier_name ? ` ↔ ${flow.supplier_name}` : ""} · opened {new Date(flow.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          {flow.rfq_id && (
            <Link href={`/admin/rfqs/${flow.rfq_id}`} className="text-sm font-semibold shrink-0" style={{ color: "var(--amber)" }}>
              View source RFQ →
            </Link>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-2xl border p-5 overflow-x-auto" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-start gap-0 min-w-[900px]">
          {TRADE_FLOW_STEPS.map((s, i) => {
            const done = !cancelled && i < currentIdx;
            const current = !cancelled && i === currentIdx;
            return (
              <div key={s} className="flex-1 flex flex-col items-center relative">
                {i > 0 && (
                  <div
                    className="absolute top-3 right-1/2 w-full h-0.5"
                    style={{ background: done || current ? "var(--amber)" : "var(--border-subtle)" }}
                  />
                )}
                <div className="relative z-10">
                  {done ? (
                    <CheckCircle2 className="w-6 h-6" style={{ color: "var(--amber)" }} />
                  ) : current ? (
                    <Circle className="w-6 h-6" style={{ color: "var(--amber)", fill: "color-mix(in srgb, var(--amber) 25%, transparent)" }} />
                  ) : (
                    <Circle className="w-6 h-6" style={{ color: "var(--border-subtle)" }} />
                  )}
                </div>
                <span
                  className="mt-2 text-[10px] font-semibold text-center leading-tight px-1"
                  style={{ color: done || current ? "var(--text-primary)" : "var(--text-tertiary)" }}
                >
                  {i + 1}. {STEP_DEFS[s]?.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: advance + history */}
        <div className="lg:col-span-2 space-y-5">
          {/* Advance card */}
          {!isTerminal(flow.current_step) && upcoming && upcomingDef && (
            <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
                <Send className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Next step: {stepIndex(upcoming) + 1}. {upcomingDef.label}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{upcomingDef.description}</p>

                {upcomingDef.fields.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {upcomingDef.fields.map((field) => {
                      const meta = FIELD_META[field];
                      if (!meta) return null;
                      const common = {
                        value: fieldValues[field] ?? "",
                        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                          setFieldValues((prev) => ({ ...prev, [field]: e.target.value })),
                        className: "w-full px-3 py-2 rounded-lg text-sm outline-none",
                        style: { background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" } as React.CSSProperties,
                      };
                      return (
                        <div key={field} className={meta.type === "textarea" ? "sm:col-span-2" : ""}>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                            {meta.label}
                          </label>
                          {meta.type === "textarea" ? (
                            <textarea rows={3} {...common} />
                          ) : (
                            <input
                              type={meta.type === "money" ? "number" : meta.type === "date" ? "date" : meta.type === "email" ? "email" : "text"}
                              step={meta.type === "money" ? "0.01" : undefined}
                              {...common}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {upcomingDef.documents.length > 0 && (
                  <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    <Paperclip className="w-3 h-3 inline mr-1" />
                    Attach {upcomingDef.documents.map((d) => DOC_KIND_LABELS[d] ?? d).join(", ")} in the Documents panel — attached files are linked in the step&apos;s emails.
                  </p>
                )}

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                    Note (included in notifications)
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  Notifies: {upcomingDef.notifies.join(" + ")}
                </div>

                <button
                  onClick={() => advance(upcoming)}
                  disabled={advancing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--obsidian)", color: "var(--ivory)" }}
                >
                  {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Mark &quot;{upcomingDef.label}&quot; &amp; send notifications
                </button>

                {/* Cancel */}
                {!showCancel ? (
                  <button onClick={() => setShowCancel(true)} className="w-full text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Cancel this flow…
                  </button>
                ) : (
                  <button
                    onClick={() => advance("cancelled")}
                    disabled={advancing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                    style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}
                  >
                    <XCircle className="w-4 h-4" /> Confirm cancel flow
                  </button>
                )}
              </div>
            </div>
          )}

          {/* History */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
              <ChevronDown className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>History</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {events.length === 0 && (
                <p className="px-6 py-4 text-xs" style={{ color: "var(--text-tertiary)" }}>No events yet.</p>
              )}
              {[...events].reverse().map((ev) => {
                const notified: string[] = [];
                if (ev.notified?.buyerEmail) notified.push("buyer email");
                if (ev.notified?.supplierEmail) notified.push("supplier email");
                if (ev.notified?.telegram) notified.push("Telegram");
                if (ev.notified?.inApp) notified.push("in-app");
                return (
                  <div key={ev.id} className="px-6 py-3.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {STEP_DEFS[ev.to_step]?.label ?? ev.to_step}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {new Date(ev.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {ev.note && <p className="mt-1 text-xs whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{ev.note}</p>}
                    {notified.length > 0 && (
                      <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>Notified: {notified.join(", ")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: parties, commercials, documents */}
        <div className="space-y-5">
          {/* Parties */}
          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Parties &amp; Consignment</h2>
            </div>
            {[
              ["Buyer", flow.buyer_company_name],
              ["Supplier", flow.supplier_name],
              ["Supplier email", flow.supplier_email],
              ["Consignee", flow.consignee_company_name],
              ["TIN", flow.consignee_tin],
              ["Phone", flow.consignee_phone],
              ["Email", flow.consignee_email],
              ["Destination port", flow.destination_port],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-start justify-between gap-3">
                <span className="text-xs shrink-0" style={{ color: "var(--text-tertiary)" }}>{label}</span>
                <span className="text-xs font-medium text-right break-all" style={{ color: "var(--text-primary)" }}>{value ?? "—"}</span>
              </div>
            ))}
          </div>

          {/* Commercials */}
          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Commercials</h2>
            </div>
            {[
              ["Goods total", flow.goods_total],
              ["Shipping cost", flow.shipping_cost],
              ["Grand total", flow.grand_total],
              ["Shipping fee due", flow.shipping_fee_due],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {value !== null && value !== undefined ? formatMoney(value as number, flow.currency) : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Shipment */}
          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Ship className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Shipment</h2>
            </div>
            {[
              ["Vessel", flow.vessel_name],
              ["Seaway Bill", flow.seaway_bill_number],
              ["ETD", flow.etd],
              ["ETA", flow.eta],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</span>
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{value ?? "—"}</span>
              </div>
            ))}
          </div>

          {/* Documents */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Documents</h2>
            </div>

            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface-secondary)" }}>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>{DOC_KIND_LABELS[doc.kind] ?? doc.kind}</p>
                      {doc.file_url ? (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs font-medium truncate block" style={{ color: "var(--amber)" }}>
                          {doc.file_name ?? "View file"}
                        </a>
                      ) : (
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{doc.note ?? "—"}</p>
                      )}
                    </div>
                    <button onClick={() => removeDocument(doc.id)} className="shrink-0" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-1 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <select
                value={docKind}
                onChange={(e) => setDocKind(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                {Object.entries(DOC_KIND_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs"
                style={{ color: "var(--text-secondary)" }}
              />
              <input
                value={docNote}
                onChange={(e) => setDocNote(e.target.value)}
                placeholder="Note / reference (optional)"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
              <button
                onClick={attachDocument}
                disabled={docUploading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold"
                style={{ background: "var(--obsidian)", color: "var(--ivory)" }}
              >
                {docUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                Attach document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
