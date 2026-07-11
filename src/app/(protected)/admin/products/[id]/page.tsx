"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TRADE_TERMS = ["exw", "fob", "cif", "ddp", "dap", "fca"];
const CURRENCIES = ["USD", "CNY", "EUR", "GBP"];
const MOD_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
const CONTAINER_SIZES = [20, 40] as const;

interface Category { id: string; name: string; level: number; }
interface ShippingGroup { id: string; name: string; code: string | null; }

interface DemandStats {
  rfq_count: number | null; quoted_count: number | null; ordered_count: number | null;
  units_ordered: number | null; revenue_minor: number | null;
  last_rfq_at: string | null; last_order_at: string | null;
}
interface DemandActivity {
  id: string; activity_type: string; actor_type: string; occurred_at: string;
  metadata: Record<string, unknown> | null;
}

interface ProductDetail {
  id: string; name: string; name_local: string | null; brand: string | null;
  description: string | null; base_price: number; compare_price: number | null;
  currency: string; moq: number; lead_time_days: number | null;
  trade_term: string | null; origin_country: string | null; hs_code: string | null;
  category_id: string | null; category_ids: string[] | null;
  moderation_status: string; is_active: boolean;
  is_featured: boolean; sample_available: boolean; sample_price: number | null;
  allow_mix_shipping: boolean; min_order_amount: number | null;
  container_size_ft: number | null; min_order_grouped_by: string | null;
  supplier_id: string; shipping_group_id: string | null; created_at: string;
  companies: { name: string; country_code: string } | null;
  categories: { name: string } | null;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<ShippingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [demand, setDemand] = useState<DemandStats | null>(null);
  const [demandActivities, setDemandActivities] = useState<DemandActivity[]>([]);

  const [form, setForm] = useState({
    name: "", nameLocal: "", brand: "", description: "",
    basePriceDollars: "", comparePriceDollars: "", currency: "USD",
    moq: "1", leadTimeDays: "", tradeTerm: "fob",
    originCountry: "", hsCode: "",
    primaryCategoryId: "",
    additionalCategoryIds: [] as string[],
    shippingGroupId: "",
    moderationStatus: "approved", isActive: true, isFeatured: false,
    sampleAvailable: false, samplePriceDollars: "",
    allowMixShipping: false, minOrderAmountDollars: "",
    containerSizeFt: "" as "" | "20" | "40",
    minOrderGroupedBy: "shipping_group",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, gRes] = await Promise.all([
        fetch(`/api/admin/products?id=${id}&limit=1`),
        fetch("/api/admin/categories"),
        fetch("/api/admin/shipping-groups"),
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      const gData = await gRes.json();

      const p: ProductDetail = pData.products?.[0];
      if (!p) { toast.error("Product not found"); router.push("/admin/products"); return; }

      const resolvedCategoryIds =
        p.category_ids && p.category_ids.length > 0
          ? p.category_ids
          : p.category_id
          ? [p.category_id]
          : [];

      setProduct(p);
      setCategories(cData.categories ?? []);
      setGroups(gData.groups ?? []);
      setForm({
        name: p.name, nameLocal: p.name_local ?? "", brand: p.brand ?? "",
        description: p.description ?? "",
        basePriceDollars: (p.base_price / 100).toFixed(2),
        comparePriceDollars: p.compare_price != null ? (p.compare_price / 100).toFixed(2) : "",
        currency: p.currency, moq: p.moq.toString(),
        leadTimeDays: p.lead_time_days?.toString() ?? "",
        tradeTerm: p.trade_term ?? "fob",
        originCountry: p.origin_country ?? "", hsCode: p.hs_code ?? "",
        primaryCategoryId: resolvedCategoryIds[0] ?? "",
        additionalCategoryIds: resolvedCategoryIds.slice(1),
        shippingGroupId: p.shipping_group_id ?? "",
        moderationStatus: p.moderation_status, isActive: p.is_active,
        isFeatured: p.is_featured, sampleAvailable: p.sample_available,
        samplePriceDollars: p.sample_price != null ? (p.sample_price / 100).toFixed(2) : "",
        allowMixShipping: p.allow_mix_shipping ?? false,
        minOrderAmountDollars: p.min_order_amount != null ? (p.min_order_amount / 100).toFixed(2) : "",
        containerSizeFt: p.container_size_ft != null ? String(p.container_size_ft) as "20" | "40" : "",
        minOrderGroupedBy: p.min_order_grouped_by ?? "shipping_group",
      });
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }

    // Demand stats are auxiliary — load separately, never block the form
    try {
      const dRes = await fetch(`/api/admin/products/${id}/demand`);
      if (dRes.ok) {
        const dData = await dRes.json();
        setDemand(dData.stats ?? null);
        setDemandActivities(dData.activities ?? []);
      }
    } catch {
      // panel simply stays empty
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleAdditional(catId: string) {
    setForm((f) => {
      const ids = f.additionalCategoryIds.includes(catId)
        ? f.additionalCategoryIds.filter((c) => c !== catId)
        : [...f.additionalCategoryIds, catId];
      return { ...f, additionalCategoryIds: ids };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          name: form.name, name_local: form.nameLocal || null,
          brand: form.brand || null,
          description: form.description || null,
          basePriceDollars: Number(form.basePriceDollars),
          comparePriceDollars: form.comparePriceDollars ? Number(form.comparePriceDollars) : null,
          currency: form.currency, moq: Number(form.moq),
          lead_time_days: form.leadTimeDays ? Number(form.leadTimeDays) : null,
          trade_term: form.tradeTerm, origin_country: form.originCountry || null,
          hs_code: form.hsCode || null,
          categoryIds: [form.primaryCategoryId, ...form.additionalCategoryIds].filter(Boolean),
          shipping_group_id: form.shippingGroupId || null,
          is_active: form.isActive, is_featured: form.isFeatured,
          sample_available: form.sampleAvailable,
          samplePriceDollars: form.samplePriceDollars ? Number(form.samplePriceDollars) : null,
          allow_mix_shipping: form.allowMixShipping,
          minOrderAmountDollars: form.minOrderAmountDollars || "",
          container_size_ft: form.containerSizeFt ? Number(form.containerSizeFt) : null,
          min_order_grouped_by: form.minOrderGroupedBy || null,
        }),
      });

      if (product && form.moderationStatus !== product.moderation_status) {
        await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id, action: form.moderationStatus }),
        });
      }

      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Product saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${product?.name}"? This suspends the product.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Product removed");
      router.push(product?.supplier_id ? `/admin/suppliers/${product.supplier_id}` : "/admin/products");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = { background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={product.supplier_id ? `/admin/suppliers/${product.supplier_id}` : "/admin/products"}
            className="p-2 rounded-lg" style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {product.name}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {product.companies?.name ?? "Unknown supplier"} · {product.categories?.name ?? "Uncategorized"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit" form="product-form" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--amber)", color: "#000" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" }}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>

      {/* Demand — RFQ/quote/order rollup from product_deal_stats */}
      {demand && (
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Demand</h2>
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {demand.last_rfq_at && `Last RFQ ${new Date(demand.last_rfq_at).toLocaleDateString()}`}
              {demand.last_rfq_at && demand.last_order_at && " · "}
              {demand.last_order_at && `Last order ${new Date(demand.last_order_at).toLocaleDateString()}`}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "RFQs", value: demand.rfq_count ?? 0 },
              { label: "Quoted", value: demand.quoted_count ?? 0 },
              { label: "Orders", value: demand.ordered_count ?? 0 },
              { label: "Units ordered", value: demand.units_ordered ?? 0 },
              { label: "Revenue", value: `$${(((demand.revenue_minor ?? 0) as number) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: "var(--surface-secondary)" }}>
                <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{s.value}</p>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{s.label}</p>
              </div>
            ))}
          </div>
          {demandActivities.length > 0 && (
            <div className="space-y-1.5 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Recent activity</p>
              {demandActivities.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>
                    {a.activity_type.replace(/_/g, " ")}
                    {typeof a.metadata?.rfqNumber === "string" && (
                      <span style={{ color: "var(--text-tertiary)" }}> · {a.metadata.rfqNumber}</span>
                    )}
                  </span>
                  <span className="font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {new Date(a.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <form id="product-form" onSubmit={handleSave} className="space-y-6">
        {/* Status */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Status & Visibility</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Moderation Status</label>
              <select value={form.moderationStatus} onChange={(e) => set("moderationStatus", e.target.value)} className={inputCls} style={inputStyle}>
                {MOD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 rounded" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="w-4 h-4 rounded" />
                Featured
              </label>
            </div>
          </div>
        </section>

        {/* Product Info */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Product Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Product Name</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Local Name</label>
              <input value={form.nameLocal} onChange={(e) => set("nameLocal", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Brand</label>
              <input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. ANUA, COSRX" className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Categories</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Primary Category</label>
            <select
              value={form.primaryCategoryId}
              onChange={(e) => setForm((f) => ({
                ...f,
                primaryCategoryId: e.target.value,
                additionalCategoryIds: f.additionalCategoryIds.filter((cid) => cid !== e.target.value),
              }))}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">— Select primary category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{"..".repeat(c.level) + " " + c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Additional Categories</label>
              {form.additionalCategoryIds.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--amber) 15%, transparent)", color: "var(--amber)" }}>
                  {form.additionalCategoryIds.length} selected
                </span>
              )}
            </div>
            <div className="overflow-y-auto rounded-xl" style={{ maxHeight: 240, border: "1px solid var(--border-subtle)", background: "var(--surface-secondary)" }}>
              {categories
                .filter((c) => c.id !== form.primaryCategoryId)
                .map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 py-2.5 cursor-pointer hover:opacity-80 transition-opacity border-b last:border-b-0"
                    style={{ paddingLeft: `${c.level * 16 + 16}px`, paddingRight: 16, borderColor: "var(--border-subtle)" }}
                  >
                    <input
                      type="checkbox"
                      checked={form.additionalCategoryIds.includes(c.id)}
                      onChange={() => toggleAdditional(c.id)}
                      className="w-4 h-4 rounded flex-shrink-0"
                    />
                    <span className="text-sm" style={{ color: c.level === 0 ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: c.level === 0 ? 500 : 400 }}>
                      {c.name}
                    </span>
                  </label>
                ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Unit Price</label>
              <input required type="number" min={0} step={0.01} value={form.basePriceDollars} onChange={(e) => set("basePriceDollars", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Compare-at Price</label>
              <input type="number" min={0} step={0.01} value={form.comparePriceDollars} onChange={(e) => set("comparePriceDollars", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Currency</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls} style={inputStyle}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Trade */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Trade Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Lead Time (days)</label>
              <input type="number" min={1} value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Trade Term</label>
              <select value={form.tradeTerm} onChange={(e) => set("tradeTerm", e.target.value)} className={inputCls} style={inputStyle}>
                {TRADE_TERMS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Origin Country</label>
              <input value={form.originCountry} onChange={(e) => set("originCountry", e.target.value.toUpperCase())} maxLength={2} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>HS Code</label>
              <input value={form.hsCode} onChange={(e) => set("hsCode", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={form.sampleAvailable} onChange={(e) => set("sampleAvailable", e.target.checked)} className="w-4 h-4 rounded" />
                Sample Available
              </label>
            </div>
            {form.sampleAvailable && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Sample Price</label>
                <input type="number" min={0} step={0.01} value={form.samplePriceDollars} onChange={(e) => set("samplePriceDollars", e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            )}
          </div>

          {/* Minimum Order Requirement subsection */}
          <div className="pt-4 space-y-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Minimum Order Requirement
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Grouped By</label>
                <select value={form.minOrderGroupedBy} onChange={(e) => set("minOrderGroupedBy", e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="shipping_group">Shipping Group</option>
                  <option value="other">Other Option</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Shipping Group</label>
                <select value={form.shippingGroupId} onChange={(e) => set("shippingGroupId", e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">— No group —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>MOQ</label>
                <input type="number" min={1} value={form.moq} onChange={(e) => set("moq", e.target.value)} className={inputCls} style={inputStyle} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Min Purchase Amount (USD)</label>
                <input type="number" min={0} step={0.01} value={form.minOrderAmountDollars} onChange={(e) => set("minOrderAmountDollars", e.target.value)} placeholder="0.00" className={inputCls} style={inputStyle} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Container Size</label>
                <select value={form.containerSizeFt} onChange={(e) => set("containerSizeFt", e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">— None —</option>
                  {CONTAINER_SIZES.map((s) => <option key={s} value={s}>{s}ft</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                  <input type="checkbox" checked={form.allowMixShipping} onChange={(e) => set("allowMixShipping", e.target.checked)} className="w-4 h-4 rounded" />
                  Mix Shipping
                </label>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-6 !text-sm flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
