"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TRADE_TERMS = ["EXW", "FOB", "CIF", "DDP", "DAP", "FCA"];
const CURRENCIES = ["USD", "CNY", "EUR", "GBP"];
const MOD_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;

interface Category { id: string; name: string; level: number; }
interface ShippingGroup { id: string; name: string; code: string | null; }

interface ProductDetail {
  id: string; name: string; name_local: string | null;
  description: string | null; base_price: number; compare_price: number | null;
  currency: string; moq: number; lead_time_days: number | null;
  trade_term: string | null; origin_country: string | null; hs_code: string | null;
  category_id: string | null; moderation_status: string; is_active: boolean;
  is_featured: boolean; sample_available: boolean; sample_price: number | null;
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

  const [form, setForm] = useState({
    name: "", nameLocal: "", description: "",
    basePriceDollars: "", comparePriceDollars: "", currency: "USD",
    moq: "1", leadTimeDays: "", tradeTerm: "FOB",
    originCountry: "", hsCode: "", categoryId: "", shippingGroupId: "",
    moderationStatus: "approved", isActive: true, isFeatured: false,
    sampleAvailable: false, samplePriceDollars: "",
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

      setProduct(p);
      setCategories(cData.categories ?? []);
      setGroups(gData.groups ?? []);
      setForm({
        name: p.name, nameLocal: p.name_local ?? "", description: p.description ?? "",
        basePriceDollars: (p.base_price / 100).toFixed(2),
        comparePriceDollars: p.compare_price != null ? (p.compare_price / 100).toFixed(2) : "",
        currency: p.currency, moq: p.moq.toString(),
        leadTimeDays: p.lead_time_days?.toString() ?? "",
        tradeTerm: p.trade_term ?? "FOB",
        originCountry: p.origin_country ?? "", hsCode: p.hs_code ?? "",
        categoryId: p.category_id ?? "",
        shippingGroupId: p.shipping_group_id ?? "",
        moderationStatus: p.moderation_status, isActive: p.is_active,
        isFeatured: p.is_featured, sampleAvailable: p.sample_available,
        samplePriceDollars: p.sample_price != null ? (p.sample_price / 100).toFixed(2) : "",
      });
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
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
          description: form.description || null,
          basePriceDollars: Number(form.basePriceDollars),
          comparePriceDollars: form.comparePriceDollars ? Number(form.comparePriceDollars) : null,
          currency: form.currency, moq: Number(form.moq),
          lead_time_days: form.leadTimeDays ? Number(form.leadTimeDays) : null,
          trade_term: form.tradeTerm, origin_country: form.originCountry || null,
          hs_code: form.hsCode || null, category_id: form.categoryId || null,
          shipping_group_id: form.shippingGroupId || null,
          is_active: form.isActive, is_featured: form.isFeatured,
          sample_available: form.sampleAvailable,
          samplePriceDollars: form.samplePriceDollars ? Number(form.samplePriceDollars) : null,
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
        <button
          onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" }}
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
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
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Category</label>
              <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{"  ".repeat(Math.max(0, c.level - 1))}{c.name}</option>
                ))}
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
            <div className="flex items-center gap-6">
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>MOQ</label>
              <input type="number" min={1} value={form.moq} onChange={(e) => set("moq", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Lead Time (days)</label>
              <input type="number" min={1} value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Trade Term</label>
              <select value={form.tradeTerm} onChange={(e) => set("tradeTerm", e.target.value)} className={inputCls} style={inputStyle}>
                {TRADE_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
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
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Sample Price</label>
                <input type="number" min={0} step={0.01} value={form.samplePriceDollars} onChange={(e) => set("samplePriceDollars", e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            )}
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
