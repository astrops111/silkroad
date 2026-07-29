"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft, FileText, Package, Building, Mail, Phone, Globe,
  Loader2, Clock, CheckCircle2, XCircle, AlertCircle, Send, Users,
  Search, Plus, Trash2, UserCheck, PenLine, Zap,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types — matches the shape returned by GET /api/rfqs/[id]           */
/* ------------------------------------------------------------------ */
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
  shipping_cost: number | null;
  shipping_method: string | null;
  notes: string | null;
  version: number;
  status: string;
  submitted_at: string | null;
  quotation_items: QuotationItem[];
}

interface RfqItem {
  id: string;
  product_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  target_unit_price: number | null;
}

interface RfqDetail {
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
  supplier_visible_at: string | null;
  buyer_company_name: string | null;
  buyer: { email: string; full_name: string; phone: string | null } | null;
  invitedSuppliers: { id: string; name: string; country_code: string | null }[];
  rfq_items: RfqItem[];
  quotations: Quotation[];
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */
const RFQ_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  draft:     { label: "Draft",     color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock },
  open:      { label: "Open",      color: "var(--info)", bg: "color-mix(in srgb, var(--info) 10%, transparent)", icon: Send },
  quoted:    { label: "Quoted",    color: "var(--amber-dark)", bg: "color-mix(in srgb, var(--amber) 12%, transparent)", icon: FileText },
  awarded:   { label: "Awarded",   color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  expired:   { label: "Expired",   color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock },
  cancelled: { label: "Cancelled", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
  converted: { label: "Converted", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
};

const QUOTE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "var(--text-tertiary)", bg: "var(--surface-secondary)" },
  submitted: { label: "Submitted", color: "var(--info)", bg: "color-mix(in srgb, var(--info) 10%, transparent)" },
  revised:   { label: "Revised",   color: "var(--amber-dark)", bg: "color-mix(in srgb, var(--amber) 12%, transparent)" },
  accepted:  { label: "Accepted",  color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)" },
  rejected:  { label: "Rejected",  color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)" },
  expired:   { label: "Expired",   color: "var(--text-tertiary)", bg: "var(--surface-secondary)" },
  withdrawn: { label: "Withdrawn", color: "var(--text-tertiary)", bg: "var(--surface-secondary)" },
};

function statusMeta(status: string) {
  return RFQ_STATUS_CONFIG[status] ?? { label: status, color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock };
}

function money(minorUnits: number | null, currency: string) {
  if (minorUnits == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", minimumFractionDigits: 0 }).format(minorUnits / 100);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Assign / Respond panel types                                       */
/* ------------------------------------------------------------------ */
interface SupplierResult {
  id: string;
  name: string;
  country_code: string | null;
  verification_status: string | null;
}

interface ProductResult {
  id: string;
  name: string;
  base_price: number;
  currency: string;
  moq: number | null;
  lead_time_days: number | null;
}

interface CartItem {
  key: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number; // dollars, converted to minor units on submit
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function AdminRfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Assign / Respond panel state
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierResults, setSupplierResults] = useState<SupplierResult[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierResult | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mode, setMode] = useState<"draft" | "binding">("draft");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [tradeTerm, setTradeTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRfq = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rfqs/${id}`);
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      setRfq(data.rfq);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRfq(); }, [fetchRfq]);

  // Debounced supplier search
  useEffect(() => {
    if (!supplierQuery.trim()) { setSupplierResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/suppliers?search=${encodeURIComponent(supplierQuery)}&limit=8`);
        const data = await res.json();
        setSupplierResults(data.suppliers ?? []);
      } catch {
        setSupplierResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [supplierQuery]);

  // Debounced product search
  useEffect(() => {
    if (!productQuery.trim()) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(productQuery)}&limit=8`);
        const data = await res.json();
        setProductResults(
          (data.products ?? []).map((p: { id: string; name: string; base_price: number; currency: string; moq: number | null; lead_time_days: number | null }) => ({
            id: p.id, name: p.name, base_price: p.base_price, currency: p.currency, moq: p.moq, lead_time_days: p.lead_time_days,
          }))
        );
      } catch {
        setProductResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [productQuery]);

  function addToCart(p: ProductResult) {
    setCart((prev) => [
      ...prev,
      { key: `${p.id}-${Date.now()}`, productId: p.id, productName: p.name, quantity: 1, unit: "pieces", unitPrice: (p.base_price ?? 0) / 100 },
    ]);
    setProductQuery("");
    setProductResults([]);
  }

  function addCustomLine() {
    setCart((prev) => [...prev, { key: `custom-${Date.now()}`, productId: null, productName: "", quantity: 1, unit: "pieces", unitPrice: 0 }]);
  }

  function updateCartItem(key: string, patch: Partial<CartItem>) {
    setCart((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeCartItem(key: string) {
    setCart((prev) => prev.filter((it) => it.key !== key));
  }

  const cartTotal = cart.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

  async function submitAssignment() {
    if (!selectedSupplier || !cart.length) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/rfqs/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier.id,
          mode,
          items: cart.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: Math.round(it.unitPrice * 100),
          })),
          leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : undefined,
          tradeTerm: tradeTerm || undefined,
          notes: notes || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(mode === "binding" ? "Quote submitted on the supplier's behalf" : "RFQ assigned — supplier notified to confirm");
        setSelectedSupplier(null);
        setCart([]);
        setLeadTimeDays(""); setTradeTerm(""); setNotes("");
        await fetchRfq();
      } else {
        toast.error(result.error || "Failed to assign");
      }
    } catch {
      toast.error("Failed to assign");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
      </div>
    );
  }

  if (notFound || !rfq) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <FileText className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>RFQ not found</p>
        <Link href="/admin/quotes" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to quotes pipeline</Link>
      </div>
    );
  }

  const status = statusMeta(rfq.status);
  const StatusIcon = status.icon;
  const quotations = [...rfq.quotations].sort((a, b) => a.total_amount - b.total_amount);

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/admin/quotes" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Quotes pipeline
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {rfq.rfq_number}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {rfq.title} · Submitted {fmtDate(rfq.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Quantity", value: `${rfq.quantity} ${rfq.unit}`, accent: "var(--text-primary)" },
          { label: "Price Estimate", value: rfq.target_price != null ? money(rfq.target_price * rfq.quantity, rfq.currency) : "—", accent: "var(--amber)" },
          { label: "Quote Deadline", value: fmtDate(rfq.deadline), accent: "var(--indigo)" },
          { label: "Quotations", value: `${quotations.length} received`, accent: "var(--success)" },
        ].map((k) => (
          <div key={k.label} className="p-4 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>{k.label}</p>
            <p className="text-sm font-bold truncate" style={{ color: k.accent }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: items + quotations */}
        <div className="lg:col-span-2 space-y-5">
          {/* Requested items */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
              <Package className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Requested Products</h2>
            </div>
            {rfq.rfq_items.length ? (
              <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                {rfq.rfq_items.map((it) => (
                  <div key={it.id} className="px-6 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{it.product_name}</span>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{it.quantity} {it.unit}</span>
                    </div>
                    {it.target_unit_price != null && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>Target: {money(it.target_unit_price, rfq.currency)}/unit</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-6 py-4 text-sm" style={{ color: "var(--text-tertiary)" }}>No line items — single-request RFQ.</p>
            )}
            {rfq.description && (
              <div className="px-6 py-4 border-t text-sm whitespace-pre-wrap" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                {rfq.description}
              </div>
            )}
          </div>

          {/* Quotations received */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
              <FileText className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Quotations Received ({quotations.length})
              </h2>
            </div>
            {quotations.length ? (
              <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                {quotations.map((q) => {
                  const qStatus = QUOTE_STATUS_CONFIG[q.status] ?? { label: q.status, color: "var(--text-tertiary)", bg: "var(--surface-secondary)" };
                  const isAwarded = rfq.awarded_quotation_id === q.id;
                  return (
                    <div key={q.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{q.supplier_name ?? "Unknown supplier"}</span>
                            {isAwarded && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, transparent)" }}>
                                <CheckCircle2 className="w-3 h-3" /> Winning quote
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: qStatus.color, background: qStatus.bg }}>
                              {qStatus.label}
                            </span>
                          </div>
                          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                            {q.quotation_number} · v{q.version}
                            {q.lead_time_days != null ? ` · ${q.lead_time_days}d lead time` : ""}
                            {q.valid_until ? ` · valid until ${fmtDate(q.valid_until)}` : ""}
                          </p>
                        </div>
                        <span className="text-sm font-bold shrink-0" style={{ color: "var(--text-primary)" }}>{money(q.total_amount, q.currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No quotations yet — waiting on invited suppliers to respond.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: buyer, suppliers, lifecycle */}
        <div className="space-y-5">
          {/* Buyer */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Buyer</h2>
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {rfq.buyer_company_name || rfq.buyer?.full_name || "Unknown buyer"}
            </p>
            {rfq.buyer?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{rfq.buyer.email}</span>
              </div>
            )}
            {rfq.buyer?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{rfq.buyer.phone}</span>
              </div>
            )}
            {rfq.delivery_country && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Ship to {[rfq.delivery_city, rfq.delivery_country].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Suppliers */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Suppliers</h2>
            </div>
            {!rfq.supplier_visible_at ? (
              <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--warning)" }}>
                <Clock className="w-3.5 h-3.5 shrink-0" /> Not yet visible to any supplier — awaiting admin assignment below.
              </p>
            ) : rfq.invitedSuppliers.length ? (
              <ul className="space-y-1.5">
                {rfq.invitedSuppliers.map((s) => (
                  <li key={s.id} className="text-xs flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                    <span>{s.name}</span>
                    {s.country_code && <span style={{ color: "var(--text-tertiary)" }}>{s.country_code}</span>}
                  </li>
                ))}
              </ul>
            ) : rfq.is_public ? (
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Public RFQ — visible to all suppliers on the platform.</p>
            ) : (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No suppliers invited.</p>
            )}
          </div>

          {/* Lifecycle */}
          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Lifecycle</h2>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Category</span>
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{rfq.category ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Required by</span>
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{fmtDate(rfq.required_by)}</span>
            </div>
            <div className="flex items-start gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                Publishing, cancelling, and awarding an RFQ are still buyer-only actions. Assigning a supplier or responding directly (below) is the one admin action available.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assign / Respond */}
      {["open", "quoted"].includes(rfq.status) && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
            {mode === "binding" ? <Zap className="w-4 h-4" style={{ color: "var(--amber)" }} /> : <PenLine className="w-4 h-4" style={{ color: "var(--amber)" }} />}
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              {rfq.supplier_visible_at ? "Assign another supplier / add a quote" : "Assign a Supplier or Respond Directly"}
            </h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Supplier picker */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Supplier</label>
              {selectedSupplier ? (
                <div className="mt-1.5 flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)" }}>
                  <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                    <UserCheck className="w-3.5 h-3.5" style={{ color: "var(--success)" }} /> {selectedSupplier.name}
                  </span>
                  <button onClick={() => setSelectedSupplier(null)} className="text-xs" style={{ color: "var(--text-tertiary)" }}>Change</button>
                </div>
              ) : (
                <div className="relative mt-1.5">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
                  <input
                    value={supplierQuery}
                    onChange={(e) => setSupplierQuery(e.target.value)}
                    placeholder="Search suppliers by name or country…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                  {supplierResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border overflow-hidden shadow-lg" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
                      {supplierResults.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setSelectedSupplier(s); setSupplierQuery(""); setSupplierResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:opacity-70 flex items-center justify-between"
                          style={{ color: "var(--text-primary)" }}
                        >
                          <span>{s.name}</span>
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{s.country_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product search */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Suggest Products</label>
              <div className="relative mt-1.5">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
                <input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Search the catalog to add matching products…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
                {productResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border overflow-hidden shadow-lg" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
                    {productResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:opacity-70 flex items-center justify-between"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <span>{p.name}</span>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{money(p.base_price, p.currency)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={addCustomLine} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--amber-dark)" }}>
                <Plus className="w-3.5 h-3.5" /> Add custom line item
              </button>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--surface-secondary)" }}>
                      <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>Product</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold w-20" style={{ color: "var(--text-tertiary)" }}>Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold w-28" style={{ color: "var(--text-tertiary)" }}>Unit Price</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold w-24" style={{ color: "var(--text-tertiary)" }}>Subtotal</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                    {cart.map((it) => (
                      <tr key={it.key}>
                        <td className="px-3 py-2">
                          <input
                            value={it.productName}
                            onChange={(e) => updateCartItem(it.key, { productName: e.target.value })}
                            placeholder="Product name"
                            className="w-full outline-none bg-transparent text-sm"
                            style={{ color: "var(--text-primary)" }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={1} value={it.quantity}
                            onChange={(e) => updateCartItem(it.key, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className="w-full text-center outline-none bg-transparent text-sm"
                            style={{ color: "var(--text-primary)" }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} step="0.01" value={it.unitPrice}
                            onChange={(e) => updateCartItem(it.key, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-full text-right outline-none bg-transparent text-sm"
                            style={{ color: "var(--text-primary)" }}
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {money(Math.round(it.unitPrice * it.quantity * 100), rfq.currency)}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeCartItem(it.key)}><Trash2 className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-3 py-2.5 border-t" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-secondary)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>Total</span>
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{money(Math.round(cartTotal * 100), rfq.currency)}</span>
                </div>
              </div>
            )}

            {/* Terms */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Lead Time (days)</label>
                <input
                  type="number" min={0} value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Trade Term</label>
                <select
                  value={tradeTerm} onChange={(e) => setTradeTerm(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  <option value="">—</option>
                  {["fob", "cif", "exw", "ddp", "dap", "cpt", "fca"].map((t) => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Notes (optional)</label>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>

            {/* Mode + submit */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
                <button
                  onClick={() => setMode("draft")}
                  className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
                  style={{ background: mode === "draft" ? "var(--obsidian)" : "transparent", color: mode === "draft" ? "var(--ivory)" : "var(--text-secondary)" }}
                >
                  <PenLine className="w-3.5 h-3.5" /> Draft — supplier confirms
                </button>
                <button
                  onClick={() => setMode("binding")}
                  className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
                  style={{ background: mode === "binding" ? "var(--obsidian)" : "transparent", color: mode === "binding" ? "var(--ivory)" : "var(--text-secondary)" }}
                >
                  <Zap className="w-3.5 h-3.5" /> Submit now (binding)
                </button>
              </div>
              <button
                onClick={submitAssignment}
                disabled={!selectedSupplier || !cart.length || submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: "var(--amber)", color: "var(--obsidian)" }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "binding" ? "Submit Quote" : "Assign & Notify Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
