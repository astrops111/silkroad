"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Loader2, CheckCircle2, Circle, XCircle, Ship,
  FileText, Banknote, Download,
} from "lucide-react";
import { formatMoney } from "@/lib/payments/currency-config";
import { TRADE_FLOW_STEPS, STEP_DEFS, stepIndex } from "@/lib/trade-flow/steps";

interface Flow {
  id: string;
  flow_number: string;
  current_step: string;
  supplier_name: string | null;
  destination_port: string | null;
  currency: string;
  goods_total: number | null;
  shipping_cost: number | null;
  grand_total: number | null;
  shipping_fee_due: number | null;
  payment_instructions: string | null;
  shipping_payment_instructions: string | null;
  goods_summary: string | null;
  vessel_name: string | null;
  seaway_bill_number: string | null;
  etd: string | null;
  eta: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface FlowEvent {
  id: string;
  to_step: string;
  note: string | null;
  created_at: string;
}

interface FlowDoc {
  id: string;
  kind: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

const DOC_KIND_LABELS: Record<string, string> = {
  buyer_invoice: "Invoice",
  seaway_bill: "Seaway Bill",
  ebm: "EBM",
};

/** Buyer-friendly wording per step (falls back to admin labels). */
const BUYER_STEP_TEXT: Record<string, string> = {
  started: "Request received — we are preparing your quote",
  supplier_quote_requested: "Quote requested from the supplier",
  supplier_invoice_received: "Supplier pricing received",
  buyer_invoice_sent: "Invoice sent to you — awaiting your payment",
  buyer_payment_received: "Your payment received",
  supplier_order_placed: "Order placed with the supplier",
  supplier_confirmed: "Supplier confirmed your order",
  shipment_loaded: "Shipment loading — Seaway Bill issued",
  arrived_transit_port: "Arrived at transit port",
  arrived_destination: "Arrived at destination — customs clearance",
  shipping_payment_requested: "Shipping payment requested",
  shipping_payment_received: "Shipping payment received",
  completed: "Documents released — ready for collection",
};

export default function BuyerTradeFlowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [documents, setDocuments] = useState<FlowDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/trade-flows/${id}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setFlow(data.flow);
        setEvents(data.events ?? []);
        setDocuments(data.documents ?? []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
        <Ship className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Order not found</p>
        <Link href="/dashboard/trade-flows" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to tracking</Link>
      </div>
    );
  }

  const currentIdx = stepIndex(flow.current_step);
  const cancelled = flow.current_step === "cancelled";
  const completed = flow.current_step === "completed";
  // First event date per step (steps can only be entered once).
  const stepDates = new Map<string, string>();
  for (const ev of events) {
    if (!stepDates.has(ev.to_step)) stepDates.set(ev.to_step, ev.created_at);
  }
  const awaitingPayment = flow.current_step === "buyer_invoice_sent";
  const awaitingShippingPayment = flow.current_step === "shipping_payment_requested";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/trade-flows" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Order Tracking
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            {flow.flow_number}
          </h1>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={
              cancelled
                ? { color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }
                : completed
                  ? { color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, transparent)" }
                  : { color: "var(--indigo)", background: "color-mix(in srgb, var(--indigo) 10%, transparent)" }
            }
          >
            {cancelled ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {STEP_DEFS[flow.current_step]?.label ?? flow.current_step}
          </span>
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          {flow.destination_port ? `Shipping to ${flow.destination_port}` : "Destination to be confirmed"} · opened {new Date(flow.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Payment call-outs */}
      {awaitingPayment && flow.payment_instructions && (
        <div className="rounded-2xl border p-5" style={{ borderColor: "color-mix(in srgb, var(--warning) 35%, transparent)", background: "color-mix(in srgb, var(--warning) 8%, transparent)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Payment due{flow.grand_total !== null ? `: ${formatMoney(flow.grand_total, flow.currency)}` : ""}
          </p>
          <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{flow.payment_instructions}</p>
        </div>
      )}
      {awaitingShippingPayment && flow.shipping_payment_instructions && (
        <div className="rounded-2xl border p-5" style={{ borderColor: "color-mix(in srgb, var(--warning) 35%, transparent)", background: "color-mix(in srgb, var(--warning) 8%, transparent)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Shipping payment due{flow.shipping_fee_due !== null ? `: ${formatMoney(flow.shipping_fee_due, flow.currency)}` : ""}
          </p>
          <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{flow.shipping_payment_instructions}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border p-6" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Progress</h2>
            <ol className="space-y-0">
              {TRADE_FLOW_STEPS.map((s, i) => {
                const done = !cancelled && i < currentIdx;
                const current = !cancelled && i === currentIdx;
                const date = stepDates.get(s);
                const last = i === TRADE_FLOW_STEPS.length - 1;
                return (
                  <li key={s} className="relative flex gap-4 pb-6" style={last ? { paddingBottom: 0 } : undefined}>
                    {!last && (
                      <span
                        className="absolute left-[11px] top-6 bottom-0 w-0.5"
                        style={{ background: done ? "var(--amber)" : "var(--border-subtle)" }}
                      />
                    )}
                    <span className="relative z-10 shrink-0 mt-0.5">
                      {done || (current && completed) ? (
                        <CheckCircle2 className="w-6 h-6" style={{ color: "var(--amber)" }} />
                      ) : current ? (
                        <Circle className="w-6 h-6" style={{ color: "var(--amber)", fill: "color-mix(in srgb, var(--amber) 25%, transparent)" }} />
                      ) : (
                        <Circle className="w-6 h-6" style={{ color: "var(--border-subtle)" }} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium leading-6"
                        style={{ color: done || current ? "var(--text-primary)" : "var(--text-tertiary)" }}
                      >
                        {BUYER_STEP_TEXT[s] ?? STEP_DEFS[s]?.label ?? s}
                      </p>
                      {date && (done || current) && (
                        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {cancelled && (
              <p className="mt-4 text-xs font-medium" style={{ color: "var(--danger)" }}>
                This order was cancelled{flow.cancelled_at ? ` on ${new Date(flow.cancelled_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}. Contact us if you have questions.
              </p>
            )}
          </div>
        </div>

        {/* Side cards */}
        <div className="space-y-5">
          {/* Documents */}
          {documents.length > 0 && (
            <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Your Documents</h2>
              </div>
              {documents.filter((d) => d.file_url).map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url!}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg"
                  style={{ background: "var(--surface-secondary)" }}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>{DOC_KIND_LABELS[doc.kind] ?? doc.kind}</p>
                    <p className="text-xs font-medium truncate" style={{ color: "var(--amber)" }}>{doc.file_name ?? "Download"}</p>
                  </div>
                  <Download className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                </a>
              ))}
            </div>
          )}

          {/* Shipment */}
          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Ship className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Shipment</h2>
            </div>
            {[
              ["Vessel", flow.vessel_name],
              ["Seaway Bill", flow.seaway_bill_number],
              ["Departure (ETD)", flow.etd],
              ["Arrival (ETA)", flow.eta],
              ["Destination", flow.destination_port],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</span>
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{value ?? "—"}</span>
              </div>
            ))}
          </div>

          {/* Amounts */}
          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Order Value</h2>
            </div>
            {[
              ["Goods", flow.goods_total],
              ["Shipping", flow.shipping_cost],
              ["Total", flow.grand_total],
              ["Shipping charge", flow.shipping_fee_due],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {value !== null && value !== undefined ? formatMoney(value as number, flow.currency) : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Goods */}
          {flow.goods_summary && (
            <div className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Goods</h2>
              <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{flow.goods_summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
