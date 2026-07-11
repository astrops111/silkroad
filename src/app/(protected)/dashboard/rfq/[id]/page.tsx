"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  Send,
  Loader2,
  Package,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  LandedCostBreakdown,
  type LandedCostSnapshot,
} from "@/components/rfq/landed-cost-breakdown";

/* ─────────────────────────────────────────────────────────── types */

interface RfqItem {
  id: string;
  product_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  target_unit_price: number | null;
  hs_code: string | null;
  sort_order: number;
}

interface QuotationItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  lead_time_days: number | null;
}

interface Quotation {
  id: string;
  quotation_number: string;
  supplier_id: string;
  supplier_name: string | null;
  total_amount: number;
  currency: string;
  payment_terms: string | null;
  trade_term: string | null;
  lead_time_days: number | null;
  validity_days: number | null;
  valid_until: string | null;
  moq: number | null;
  shipping_cost: number;
  shipping_method: string | null;
  notes: string | null;
  version: number;
  status: string;
  submitted_at: string | null;
  landed_cost_snapshot: LandedCostSnapshot | null;
  landed_cost_status: string;
  landed_cost_computed_at: string | null;
  quotation_items: QuotationItem[];
}

interface RFQ {
  id: string;
  rfq_number: string;
  title: string;
  description: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  target_price: number | null;
  currency: string;
  delivery_country: string | null;
  delivery_city: string | null;
  required_by: string | null;
  deadline: string | null;
  status: string;
  is_public: boolean;
  awarded_quotation_id: string | null;
  buyer_company_name: string | null;
  created_at: string;
  rfq_items: RfqItem[];
  quotations: Quotation[];
}

/* ─────────────────────────────────────────────────────────── helpers */

const RFQ_STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft:     { label: "Draft",     variant: "secondary" },
  open:      { label: "Open",      variant: "outline" },
  quoted:    { label: "Quoted",    variant: "default" },
  awarded:   { label: "Awarded",   variant: "default" },
  converted: { label: "Converted", variant: "default" },
  expired:   { label: "Expired",   variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const QUOTE_STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft:     { label: "Draft",    variant: "secondary" },
  submitted: { label: "Received", variant: "outline" },
  revised:   { label: "Revised",  variant: "secondary" },
  accepted:  { label: "Awarded",  variant: "default" },
  rejected:  { label: "Rejected", variant: "destructive" },
};

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ─────────────────────────────────────────────────────────── quote card */

function QuoteCard({
  quote,
  rfqId,
  rfqStatus,
  awardedId,
  onAwarded,
}: {
  quote: Quotation;
  rfqId: string;
  rfqStatus: string;
  awardedId: string | null;
  onAwarded: (quotationId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [awarding, setAwarding] = useState(false);

  const qStatus = QUOTE_STATUS[quote.status] ?? QUOTE_STATUS.submitted;
  const isAwarded = quote.id === awardedId;
  const canAward =
    ["open", "quoted"].includes(rfqStatus) && quote.status === "submitted";

  async function handleAward() {
    setAwarding(true);
    try {
      const res = await fetch("/api/rfqs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqId, action: "award", quotationId: quote.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Award failed");
      toast.success(`Awarded to ${quote.supplier_name ?? "supplier"}`);
      onAwarded(quote.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Award failed");
    } finally {
      setAwarding(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-colors ${
        isAwarded
          ? "border-[var(--amber)] bg-[var(--amber-glow)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-primary)]"
      }`}
    >
      {/* Quote header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--obsidian)]">
              {quote.supplier_name ?? "Unnamed Supplier"}
            </span>
            <Badge variant={isAwarded ? "default" : qStatus.variant} className="text-xs">
              {isAwarded ? "Awarded" : qStatus.label}
            </Badge>
            {quote.version > 1 && (
              <span className="text-xs text-[var(--text-tertiary)]">v{quote.version}</span>
            )}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{quote.quotation_number}</p>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-[var(--obsidian)]">
            {fmt(quote.total_amount, quote.currency)}
          </p>
          {quote.shipping_cost > 0 && (
            <p className="text-xs text-[var(--text-tertiary)]">
              + {fmt(quote.shipping_cost, quote.currency)} shipping
            </p>
          )}
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">Lead Time</p>
          <p className="text-[var(--obsidian)] font-medium">
            {quote.lead_time_days ? `${quote.lead_time_days} days` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">Payment</p>
          <p className="text-[var(--obsidian)] font-medium capitalize">
            {quote.payment_terms?.replace(/_/g, " ") ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">Trade Term</p>
          <p className="text-[var(--obsidian)] font-medium">{quote.trade_term ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">Valid Until</p>
          <p className="text-[var(--obsidian)] font-medium">{fmtDate(quote.valid_until)}</p>
        </div>
      </div>

      {/* Total landed cost — supplier price + freight + duties */}
      <LandedCostBreakdown
        snapshot={quote.landed_cost_snapshot}
        status={quote.landed_cost_status}
        computedAt={quote.landed_cost_computed_at}
        supplierAmountMinor={quote.total_amount}
        currency={quote.currency}
      />

      {/* Expandable line items */}
      {quote.quotation_items.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-[var(--amber-dark)] hover:text-[var(--amber)] transition-colors font-medium"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide" : "View"} line items ({quote.quotation_items.length})
        </button>
      )}

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {["Product", "Qty", "Unit", "Unit Price", "Total"].map((h) => (
                  <th
                    key={h}
                    className="pb-2 text-left font-semibold text-[var(--text-tertiary)] uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quote.quotation_items.map((qi) => (
                <tr key={qi.id} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="py-2 pr-3 text-[var(--obsidian)] font-medium">{qi.product_name}</td>
                  <td className="py-2 pr-3 text-[var(--text-secondary)]">{qi.quantity}</td>
                  <td className="py-2 pr-3 text-[var(--text-secondary)]">{qi.unit}</td>
                  <td className="py-2 pr-3 text-[var(--text-secondary)]">
                    {fmt(qi.unit_price, quote.currency)}
                  </td>
                  <td className="py-2 font-semibold text-[var(--obsidian)]">
                    {fmt(qi.total_price, quote.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {quote.notes && (
        <p className="text-xs text-[var(--text-secondary)] italic border-l-2 border-[var(--border-subtle)] pl-3">
          {quote.notes}
        </p>
      )}

      {canAward && (
        <div className="pt-1">
          <Button size="sm" onClick={handleAward} disabled={awarding}>
            {awarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            Award this Quote
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── page */

export default function RFQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params.id as string;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rfqs/${rfqId}`);
      if (!res.ok) throw new Error();
      const { rfq } = await res.json();
      setRfq(rfq);
    } catch {
      toast.error("RFQ not found");
      router.push("/dashboard/rfq");
    } finally {
      setLoading(false);
    }
  }, [rfqId, router]);

  useEffect(() => { load(); }, [load]);

  function handleAwarded(quotationId: string) {
    setRfq((prev) =>
      prev
        ? {
            ...prev,
            status: "awarded",
            awarded_quotation_id: quotationId,
            quotations: prev.quotations.map((q) => ({
              ...q,
              status:
                q.id === quotationId
                  ? "accepted"
                  : q.status === "submitted"
                  ? "rejected"
                  : q.status,
            })),
          }
        : prev
    );
  }

  async function handlePublish() {
    if (!rfq) return;
    setActing(true);
    try {
      const res = await fetch("/api/rfqs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqId: rfq.id, action: "publish" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("RFQ published — suppliers can now submit quotes");
      setRfq((prev) => prev ? { ...prev, status: "open" } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    if (!rfq) return;
    setActing(true);
    try {
      const res = await fetch("/api/rfqs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqId: rfq.id, action: "cancel" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("RFQ cancelled");
      setRfq((prev) => prev ? { ...prev, status: "cancelled" } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActing(false);
    }
  }

  async function handleConvert() {
    if (!rfq) return;
    setActing(true);
    try {
      const res = await fetch("/api/rfqs/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqId: rfq.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { orderId, orderNumber } = await res.json();
      toast.success(`Order ${orderNumber} created`);
      router.push(`/dashboard/orders/${orderId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (!rfq) return null;

  const rfqConfig = RFQ_STATUS[rfq.status] ?? RFQ_STATUS.open;
  const submittedQuotes = rfq.quotations.filter((q) => q.status !== "draft");
  const isDeadlinePassed = rfq.deadline ? new Date(rfq.deadline) < new Date() : false;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/dashboard/rfq"
          className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors mt-0.5"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-2xl font-bold text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {rfq.title}
            </h1>
            <Badge variant={rfqConfig.variant}>{rfqConfig.label}</Badge>
          </div>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {rfq.rfq_number} · Created {fmtDate(rfq.created_at)}
            {rfq.buyer_company_name && ` · ${rfq.buyer_company_name}`}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          {rfq.status === "draft" && (
            <Button size="sm" onClick={handlePublish} disabled={acting}>
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publish RFQ
            </Button>
          )}
          {rfq.status === "awarded" && (
            <Button size="sm" onClick={handleConvert} disabled={acting}>
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              Create Order
            </Button>
          )}
          {["draft", "open", "quoted"].includes(rfq.status) && (
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={acting}>
              <XCircle className="w-4 h-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Deadline warning */}
      {isDeadlinePassed && rfq.status === "open" && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            The quotation deadline has passed. No new quotes can be submitted.
          </p>
        </div>
      )}

      {/* RFQ details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--text-tertiary)]" />
            RFQ Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Category</p>
              <p className="text-[var(--obsidian)]">{rfq.category ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Quantity</p>
              <p className="text-[var(--obsidian)]">{rfq.quantity.toLocaleString()} {rfq.unit}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Target Price</p>
              <p className="text-[var(--obsidian)]">
                {rfq.target_price ? fmt(rfq.target_price, rfq.currency) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Delivery</p>
              <p className="text-[var(--obsidian)]">
                {[rfq.delivery_city, rfq.delivery_country].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Required By</p>
              <p className="text-[var(--obsidian)]">{fmtDate(rfq.required_by)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Quote Deadline</p>
              <p className={`font-medium ${isDeadlinePassed ? "text-red-600" : "text-[var(--obsidian)]"}`}>
                {fmtDate(rfq.deadline)}
              </p>
            </div>
          </div>

          {rfq.description && (
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Description</p>
              <p className="text-sm text-[var(--text-secondary)]">{rfq.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requested items */}
      {rfq.rfq_items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--text-tertiary)]" />
              Requested Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {["Product", "Qty", "Unit", "Target Price", "HS Code"].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] tracking-widest uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...rfq.rfq_items]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((item) => (
                      <tr key={item.id} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className="py-3 pr-4">
                          <span className="font-medium text-[var(--obsidian)]">{item.product_name}</span>
                          {item.description && (
                            <span className="block text-xs text-[var(--text-tertiary)]">{item.description}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">{item.quantity.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">{item.unit}</td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">
                          {item.target_unit_price ? fmt(item.target_unit_price, rfq.currency) : "—"}
                        </td>
                        <td className="py-3 text-[var(--text-tertiary)] text-xs">{item.hs_code ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quote inbox */}
      <div className="space-y-3">
        <h2
          className="text-lg font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Quotes Received
          {submittedQuotes.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[var(--text-tertiary)]">
              ({submittedQuotes.length})
            </span>
          )}
        </h2>

        {submittedQuotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-10 text-center space-y-2">
            <Clock className="w-8 h-8 text-[var(--text-tertiary)] mx-auto" />
            <p className="text-[var(--text-secondary)] font-medium">No quotes received yet</p>
            <p className="text-sm text-[var(--text-tertiary)]">
              {rfq.status === "open"
                ? "Suppliers will submit quotes before the deadline."
                : "This RFQ is not open for quotes."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {submittedQuotes.map((q) => (
              <QuoteCard
                key={q.id}
                quote={q}
                rfqId={rfq.id}
                rfqStatus={rfq.status}
                awardedId={rfq.awarded_quotation_id}
                onAwarded={handleAwarded}
              />
            ))}
          </div>
        )}
      </div>

      {/* Awarded → convert banner */}
      {rfq.status === "awarded" && (
        <div className="rounded-xl bg-[var(--amber-glow)] border border-[var(--amber)]/30 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--amber-dark)] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--amber-dark)]">Quote Awarded</p>
              <p className="text-xs text-[var(--amber-dark)]/80">
                Convert to a purchase order to proceed with the supplier.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleConvert} disabled={acting}>
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Create Order
          </Button>
        </div>
      )}
    </div>
  );
}
