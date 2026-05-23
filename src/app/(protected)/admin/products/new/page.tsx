"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TRADE_TERMS = ["exw", "fob", "cif", "ddp", "dap", "fca"];
const CURRENCIES = ["USD", "CNY", "EUR", "GBP"];
const CONTAINER_SIZES = [20, 40] as const;

interface Supplier { id: string; name: string; country_code: string; }
interface Category { id: string; name: string; level: number; }
interface ShippingGroup { id: string; name: string; code: string | null; }

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledSupplierId = searchParams.get("supplierId") ?? "";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<ShippingGroup[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    supplierId: prefilledSupplierId,
    primaryCategoryId: "", additionalCategoryIds: [] as string[], shippingGroupId: "",
    name: "", nameLocal: "", description: "",
    basePriceDollars: "", comparePriceDollars: "", currency: "USD",
    moq: "1", leadTimeDays: "", tradeTerm: "fob",
    originCountry: "", hsCode: "",
    sampleAvailable: false, samplePriceDollars: "",
    allowMixShipping: false, minOrderAmountDollars: "",
    containerSizeFt: "" as "" | "20" | "40",
    minOrderGroupedBy: "shipping_group",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/suppliers?limit=200").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/shipping-groups").then((r) => r.json()),
    ]).then(([sData, cData, gData]) => {
      setSuppliers(sData.suppliers ?? []);
      setCategories(cData.categories ?? []);
      setGroups(gData.groups ?? []);
    }).catch(() => toast.error("Failed to load form data"));
  }, []);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplierId || !form.name || !form.basePriceDollars) {
      toast.error("Supplier, name, and price are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: form.supplierId,
          categoryIds: [form.primaryCategoryId, ...form.additionalCategoryIds].filter(Boolean),
          shippingGroupId: form.shippingGroupId || undefined,
          name: form.name.trim(),
          nameLocal: form.nameLocal || undefined,
          description: form.description || undefined,
          basePriceDollars: Number(form.basePriceDollars),
          comparePriceDollars: form.comparePriceDollars ? Number(form.comparePriceDollars) : undefined,
          currency: form.currency,
          moq: Number(form.moq) || 1,
          leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
          tradeTerm: form.tradeTerm,
          originCountry: form.originCountry || undefined,
          hsCode: form.hsCode || undefined,
          sampleAvailable: form.sampleAvailable,
          samplePriceDollars: form.samplePriceDollars ? Number(form.samplePriceDollars) : undefined,
          allowMixShipping: form.allowMixShipping,
          minOrderAmountDollars: form.minOrderAmountDollars || undefined,
          containerSizeFt: form.containerSizeFt ? Number(form.containerSizeFt) : undefined,
          minOrderGroupedBy: form.minOrderGroupedBy || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Product created");
      router.push(prefilledSupplierId ? `/admin/suppliers/${prefilledSupplierId}` : `/admin/products/${data.productId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = { background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" };
  const backHref = prefilledSupplierId ? `/admin/suppliers/${prefilledSupplierId}` : "/admin/products";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={backHref} className="p-2 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Add Product
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>Admin-created products are auto-approved</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Assignment */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Assignment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Supplier <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select required value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.country_code})</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
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
                  <option key={c.id} value={c.id}>{"  ".repeat(c.level)}{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Additional Subcategories</label>
                {form.additionalCategoryIds.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--amber) 15%, transparent)", color: "var(--amber)" }}>
                    {form.additionalCategoryIds.length} selected
                  </span>
                )}
              </div>
              <div className="overflow-y-auto rounded-xl" style={{ maxHeight: 160, border: "1px solid var(--border-subtle)", background: "var(--surface-secondary)" }}>
                {categories.filter((c) => c.id !== form.primaryCategoryId).map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:opacity-80 border-b last:border-b-0"
                    style={{ paddingLeft: `${c.level * 16 + 12}px`, paddingRight: 12, borderColor: "var(--border-subtle)" }}
                  >
                    <input
                      type="checkbox"
                      checked={form.additionalCategoryIds.includes(c.id)}
                      onChange={() => setForm((f) => {
                        const ids = f.additionalCategoryIds.includes(c.id)
                          ? f.additionalCategoryIds.filter((cid) => cid !== c.id)
                          : [...f.additionalCategoryIds, c.id];
                        return { ...f, additionalCategoryIds: ids };
                      })}
                      className="w-4 h-4 rounded flex-shrink-0"
                    />
                    <span className="text-sm" style={{ color: c.level === 0 ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: c.level === 0 ? 500 : 400 }}>
                      {c.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Product Info */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Product Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Product Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Wireless Bluetooth Earbuds" className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Local Name</label>
              <input value={form.nameLocal} onChange={(e) => set("nameLocal", e.target.value)} placeholder="蓝牙耳机" className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4}
                placeholder="Product details, specifications, features..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Unit Price <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input required type="number" min={0} step={0.01} value={form.basePriceDollars} onChange={(e) => set("basePriceDollars", e.target.value)} placeholder="12.50" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Compare-at Price</label>
              <input type="number" min={0} step={0.01} value={form.comparePriceDollars} onChange={(e) => set("comparePriceDollars", e.target.value)} placeholder="15.00" className={inputCls} style={inputStyle} />
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
              <input type="number" min={1} value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} placeholder="30" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Trade Term</label>
              <select value={form.tradeTerm} onChange={(e) => set("tradeTerm", e.target.value)} className={inputCls} style={inputStyle}>
                {TRADE_TERMS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Origin Country</label>
              <input value={form.originCountry} onChange={(e) => set("originCountry", e.target.value.toUpperCase())} placeholder="CN" maxLength={2} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>HS Code</label>
              <input value={form.hsCode} onChange={(e) => set("hsCode", e.target.value)} placeholder="8518300000" className={inputCls} style={inputStyle} />
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
                <input type="number" min={0} step={0.01} value={form.samplePriceDollars} onChange={(e) => set("samplePriceDollars", e.target.value)} placeholder="25.00" className={inputCls} style={inputStyle} />
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
                <input type="number" min={1} value={form.moq} onChange={(e) => set("moq", e.target.value)} placeholder="100" className={inputCls} style={inputStyle} />
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

        <div className="flex items-center gap-3 justify-end">
          <Link href={backHref} className="btn-outline !py-2.5 !px-5 !text-sm">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-5 !text-sm flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Product
          </button>
        </div>
      </form>
    </div>
  );
}
