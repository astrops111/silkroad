"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Trash2, Plus, Package } from "lucide-react";
import { toast } from "sonner";

const MARKET_REGIONS = [
  { value: "cn", label: "China" }, { value: "sea", label: "SE Asia" },
  { value: "africa_west", label: "Africa – West" }, { value: "africa_east", label: "Africa – East" },
  { value: "africa_south", label: "Africa – South" }, { value: "global", label: "Global" },
];
const TRADE_TERMS = ["EXW", "FOB", "CIF", "DDP", "DAP", "FCA"];
const STATUSES = ["unverified", "pending", "verified", "rejected", "expired"] as const;

interface SupplierDetail {
  id: string; name: string; name_local: string | null; country_code: string;
  city: string | null; state_province: string | null; industry: string | null;
  website: string | null; description: string | null; market_region: string;
  tax_id: string | null; tax_id_verified: boolean; verification_status: string;
  is_active: boolean; created_at: string;
  supplier_profiles: Array<{
    factory_country: string | null; moq_default: number | null;
    lead_time_days_default: number | null; trade_terms_default: string | null;
    commission_rate: number | null; average_rating: number;
    total_orders: number; total_revenue: number;
  }> | null;
}

interface ProductRow {
  id: string; name: string; base_price: number; currency: string;
  moq: number; moderation_status: string; is_active: boolean; created_at: string;
  categories: { name: string } | null;
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "", nameLocal: "", countryCode: "", city: "", stateProvince: "",
    industry: "", website: "", description: "", marketRegion: "", taxId: "",
    taxIdVerified: false, factoryCountry: "", moqDefault: "", leadTimeDays: "",
    tradeTerms: "", commissionRate: "", verificationStatus: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`/api/admin/suppliers?id=${id}&limit=1`),
        fetch(`/api/admin/products?supplierId=${id}&limit=200`),
      ]);
      const sData = await sRes.json();
      const pData = await pRes.json();

      const s: SupplierDetail = sData.suppliers?.[0];
      if (!s) { toast.error("Supplier not found"); router.push("/admin/suppliers"); return; }

      setSupplier(s);
      setProducts(pData.products ?? []);

      const p = s.supplier_profiles?.[0];
      setForm({
        name: s.name, nameLocal: s.name_local ?? "", countryCode: s.country_code,
        city: s.city ?? "", stateProvince: s.state_province ?? "",
        industry: s.industry ?? "", website: s.website ?? "",
        description: s.description ?? "", marketRegion: s.market_region,
        taxId: s.tax_id ?? "", taxIdVerified: s.tax_id_verified,
        factoryCountry: p?.factory_country ?? "",
        moqDefault: p?.moq_default?.toString() ?? "",
        leadTimeDays: p?.lead_time_days_default?.toString() ?? "",
        tradeTerms: p?.trade_terms_default ?? "",
        commissionRate: p?.commission_rate?.toString() ?? "",
        verificationStatus: s.verification_status,
      });
    } catch {
      toast.error("Failed to load supplier");
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
      const res = await fetch("/api/admin/suppliers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: id,
          name: form.name, name_local: form.nameLocal || null,
          country_code: form.countryCode.toUpperCase(), city: form.city || null,
          state_province: form.stateProvince || null, industry: form.industry || null,
          website: form.website || null, description: form.description || null,
          market_region: form.marketRegion, tax_id: form.taxId || null,
          tax_id_verified: form.taxIdVerified,
          factoryCountry: form.factoryCountry || null,
          moqDefault: form.moqDefault ? Number(form.moqDefault) : null,
          leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : null,
          tradeTerms: form.tradeTerms || null,
          commissionRate: form.commissionRate ? Number(form.commissionRate) : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }

      if (form.verificationStatus !== supplier?.verification_status) {
        const actionMap: Record<string, string> = {
          verified: "approve", rejected: "reject", expired: "suspend",
          pending: "reinstate", unverified: "reinstate",
        };
        const action = actionMap[form.verificationStatus];
        if (action) {
          await fetch("/api/admin/suppliers", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supplierId: id, action }),
          });
        }
      }

      toast.success("Supplier saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${supplier?.name}"? This will deactivate all their products.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/suppliers?id=${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Supplier deactivated");
      router.push("/admin/suppliers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function handleDeleteProduct(productId: string, productName: string) {
    if (!confirm(`Remove "${productName}"?`)) return;
    const res = await fetch(`/api/admin/products?id=${productId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product removed");
      setProducts((prev) => prev.filter((x) => x.id !== productId));
    } else {
      toast.error("Failed to remove product");
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

  if (!supplier) return null;

  const profile = supplier.supplier_profiles?.[0];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/suppliers" className="p-2 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {supplier.name}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Joined {new Date(supplier.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {profile && ` · ${profile.total_orders} orders · $${(profile.total_revenue / 100).toLocaleString()} revenue`}
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
        {/* Company Info */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Company Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Company Name</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Local Name</label>
              <input value={form.nameLocal} onChange={(e) => set("nameLocal", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Country Code</label>
              <input required value={form.countryCode} onChange={(e) => set("countryCode", e.target.value.toUpperCase())} maxLength={2} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Market Region</label>
              <select value={form.marketRegion} onChange={(e) => set("marketRegion", e.target.value)} className={inputCls} style={inputStyle}>
                {MARKET_REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>City</label>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Province / State</label>
              <input value={form.stateProvince} onChange={(e) => set("stateProvince", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Industry</label>
              <input value={form.industry} onChange={(e) => set("industry", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Website</label>
              <input type="url" value={form.website} onChange={(e) => set("website", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tax ID</label>
              <input value={form.taxId} onChange={(e) => set("taxId", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={form.taxIdVerified} onChange={(e) => set("taxIdVerified", e.target.checked)} className="w-4 h-4 rounded" />
                Tax ID Verified
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Verification Status</label>
              <select value={form.verificationStatus} onChange={(e) => set("verificationStatus", e.target.value)} className={inputCls} style={inputStyle}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            </div>
          </div>
        </section>

        {/* Trade Profile */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Trade Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Factory Country</label>
              <input value={form.factoryCountry} onChange={(e) => set("factoryCountry", e.target.value.toUpperCase())} maxLength={2} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Default Trade Terms</label>
              <select value={form.tradeTerms} onChange={(e) => set("tradeTerms", e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">— None —</option>
                {TRADE_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Default MOQ</label>
              <input type="number" min={1} value={form.moqDefault} onChange={(e) => set("moqDefault", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Lead Time (days)</label>
              <input type="number" min={1} value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Commission Rate (%)</label>
              <input type="number" min={0} max={100} step={0.1} value={form.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} className={inputCls} style={inputStyle} />
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

      {/* Products table */}
      <section className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Products ({products.length})
          </h2>
          <Link
            href={`/admin/products/new?supplierId=${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--obsidian)", color: "var(--ivory)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <Package className="w-10 h-10 mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No products yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Product", "Category", "Price", "MOQ", "Status", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.categories?.name ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>${(p.base_price / 100).toFixed(2)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.moq}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: p.moderation_status === "approved"
                          ? "color-mix(in srgb, var(--success) 12%, transparent)"
                          : "color-mix(in srgb, var(--warning) 12%, transparent)",
                        color: p.moderation_status === "approved" ? "var(--success)" : "var(--warning)",
                      }}>
                      {p.moderation_status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/products/${p.id}`} className="p-1.5 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => handleDeleteProduct(p.id, p.name)} className="p-1.5 rounded-lg" style={{ color: "var(--danger)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
