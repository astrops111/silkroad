"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Trash2, Plus, Package, CheckCircle2, Clock,
  XCircle, AlertTriangle, ShieldCheck, Star, Truck, MessageSquare,
  Pencil, ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const COUNTRIES = [
  { code: "CN", name: "China" }, { code: "TW", name: "Taiwan" },
  { code: "JP", name: "Japan" }, { code: "KR", name: "South Korea" },
  { code: "VN", name: "Vietnam" }, { code: "TH", name: "Thailand" },
  { code: "MY", name: "Malaysia" }, { code: "ID", name: "Indonesia" },
  { code: "SG", name: "Singapore" }, { code: "PH", name: "Philippines" },
  { code: "GH", name: "Ghana" }, { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" }, { code: "UG", name: "Uganda" },
  { code: "TZ", name: "Tanzania" }, { code: "RW", name: "Rwanda" },
  { code: "ET", name: "Ethiopia" }, { code: "ZA", name: "South Africa" },
  { code: "CM", name: "Cameroon" }, { code: "SN", name: "Senegal" },
  { code: "CI", name: "Côte d'Ivoire" }, { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" }, { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
];

const MARKET_REGIONS = [
  { value: "cn", label: "China" }, { value: "sea", label: "SE Asia" },
  { value: "africa_west", label: "Africa – West" }, { value: "africa_east", label: "Africa – East" },
  { value: "africa_south", label: "Africa – South" }, { value: "global", label: "Global" },
];

const TRADE_TERMS = ["EXW", "FOB", "CIF", "DDP", "DAP", "FCA"];

const STATUS_OPTIONS = [
  { value: "unverified", label: "Unverified" },
  { value: "pending",    label: "Pending Review" },
  { value: "verified",   label: "Verified" },
  { value: "rejected",   label: "Rejected" },
  { value: "expired",    label: "Suspended" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  verified:   { label: "Verified",       color: "var(--success)",       bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending:    { label: "Pending Review", color: "var(--warning)",       bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  unverified: { label: "Unverified",     color: "var(--text-tertiary)", bg: "var(--surface-secondary)",                            icon: Clock },
  rejected:   { label: "Rejected",       color: "var(--danger)",        bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: XCircle },
  expired:    { label: "Suspended",      color: "var(--danger)",        bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: AlertTriangle },
};

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface SupplierDetail {
  id: string; name: string; name_local: string | null; slug: string | null;
  country_code: string; city: string | null; state_province: string | null;
  industry: string | null; website: string | null; description: string | null;
  market_region: string; tax_id: string | null; tax_id_verified: boolean;
  verification_status: string; is_active: boolean; created_at: string;
  supplier_profiles: Array<{
    factory_country: string | null; moq_default: number | null;
    lead_time_days_default: number | null; trade_terms_default: string | null;
    commission_rate: number | null; average_rating: number; total_orders: number;
    total_revenue: number; response_rate: number; on_time_delivery_rate: number;
  }> | null;
}
interface ProductRow {
  id: string; name: string; base_price: number; currency: string;
  moq: number; moderation_status: string; is_active: boolean; created_at: string;
  categories: { name: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [deleteSupplierOpen, setDeleteSupplierOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProductDialog, setDeleteProductDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [deletingProduct, setDeletingProduct] = useState(false);

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
    } catch { toast.error("Failed to load supplier"); }
    finally { setLoading(false); }
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
          supplierId: id, name: form.name, name_local: form.nameLocal || null,
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
        if (action) await fetch("/api/admin/suppliers", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierId: id, action }),
        });
      }
      toast.success("Supplier saved");
      setEditing(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function confirmDeleteSupplier() {
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

  async function confirmDeleteProduct() {
    setDeletingProduct(true);
    try {
      const res = await fetch(`/api/admin/products?id=${deleteProductDialog.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Product removed");
        setProducts((prev) => prev.filter((x) => x.id !== deleteProductDialog.id));
        setDeleteProductDialog({ open: false, id: "", name: "" });
      } else { toast.error("Failed to remove product"); }
    } catch { toast.error("Failed to remove product"); }
    finally { setDeletingProduct(false); }
  }

  async function handleQuickAction(action: string) {
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: id, action }),
      });
      const result = await res.json();
      if (result.success) { toast.success("Status updated"); await load(); }
      else toast.error(`Failed: ${result.error}`);
    } catch { toast.error("Action failed"); }
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
  const statusCfg = statusConfig[supplier.verification_status] || statusConfig.unverified;
  const StatusIcon = statusCfg.icon;
  const countryName = COUNTRIES.find((c) => c.code === supplier.country_code)?.name || supplier.country_code;
  const factoryName = COUNTRIES.find((c) => c.code === (profile?.factory_country ?? ""))?.name || profile?.factory_country;
  const regionLabel = MARKET_REGIONS.find((r) => r.value === supplier.market_region)?.label || supplier.market_region;

  /* ── EDIT MODE ──────────────────────────────────────────────────── */
  if (editing) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(false)} className="p-2 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Edit — {supplier.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="btn-outline !py-2 !px-4 !text-sm">Cancel</button>
            <button form="supplier-form" type="submit" disabled={saving}
              className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
            </button>
          </div>
        </div>

        <form id="supplier-form" onSubmit={handleSave} className="space-y-6">
          <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Company Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Company Name</label>
                <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Local Name <span className="text-xs font-normal" style={{ color: "var(--text-tertiary)" }}>(native script)</span>
                </label>
                <input value={form.nameLocal} onChange={(e) => set("nameLocal", e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Country</label>
                <select value={form.countryCode} onChange={(e) => set("countryCode", e.target.value)} className={inputCls} style={inputStyle}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
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
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Trade Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Factory Country</label>
                <select value={form.factoryCountry} onChange={(e) => set("factoryCountry", e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">— None —</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
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
        </form>

        <ProductsTable products={products} supplierId={id as string}
          onDelete={(pid, pname) => setDeleteProductDialog({ open: true, id: pid, name: pname })} />

        <DeleteProductDialog open={deleteProductDialog.open} name={deleteProductDialog.name}
          deleting={deletingProduct} onCancel={() => setDeleteProductDialog({ open: false, id: "", name: "" })}
          onConfirm={confirmDeleteProduct} />
      </div>
    );
  }

  /* ── READ MODE ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/suppliers" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Suppliers
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {supplier.name}
              </h1>
              {supplier.tax_id_verified && <ShieldCheck className="w-5 h-5" style={{ color: "var(--success)" }} />}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                <StatusIcon className="w-3.5 h-3.5" />{statusCfg.label}
              </span>
            </div>
            {supplier.name_local && <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>{supplier.name_local}</p>}
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Joined {new Date(supplier.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="btn-outline !py-2 !px-4 !text-sm flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit
            </button>
            <button onClick={() => setDeleteSupplierOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
              style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Orders",     value: profile?.total_orders ?? 0,                                                                   accent: "var(--amber)" },
          { label: "Revenue",          value: profile?.total_revenue ? `$${(profile.total_revenue / 100).toLocaleString()}` : "$0",         accent: "var(--text-primary)" },
          { label: "Avg Rating",       value: profile?.average_rating ? `${profile.average_rating.toFixed(1)} / 5` : "—",                   accent: "var(--amber)" },
          { label: "Response Rate",    value: profile?.response_rate ? `${Math.round(profile.response_rate * 100)}%` : "—",                 accent: profile?.response_rate && profile.response_rate >= 0.8 ? "var(--success)" : "var(--warning)" },
          { label: "On-time Delivery", value: profile?.on_time_delivery_rate ? `${Math.round(profile.on_time_delivery_rate * 100)}%` : "—", accent: profile?.on_time_delivery_rate && profile.on_time_delivery_rate >= 0.8 ? "var(--success)" : "var(--warning)" },
        ].map((kpi) => (
          <div key={kpi.label} className="p-4 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
            <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: kpi.accent }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border p-6 space-y-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Company Information</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Country" value={countryName} />
              <Field label="Market Region" value={regionLabel} />
              <Field label="City" value={supplier.city ?? undefined} />
              <Field label="Province / State" value={supplier.state_province ?? undefined} />
              <Field label="Industry" value={supplier.industry ?? undefined} />
              <Field label="Tax ID" value={supplier.tax_id ?? undefined} />
              {supplier.name_local && <Field label="Local Name" value={supplier.name_local} />}
              {supplier.website && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>Website</p>
                  <a href={supplier.website} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium inline-flex items-center gap-1 hover:opacity-70"
                    style={{ color: "var(--indigo)" }}>
                    {supplier.website.replace(/^https?:\/\//, "")} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
            {supplier.description && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Description</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{supplier.description}</p>
              </div>
            )}
          </div>

          {profile && (
            <div className="rounded-2xl border p-6 space-y-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Trade Profile</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Factory Country" value={factoryName ?? undefined} />
                <Field label="Default Trade Terms" value={profile.trade_terms_default ?? undefined} />
                <Field label="Default MOQ" value={profile.moq_default ? `${profile.moq_default.toLocaleString()} units` : undefined} />
                <Field label="Lead Time" value={profile.lead_time_days_default ? `${profile.lead_time_days_default} days` : undefined} />
                <Field label="Commission Rate" value={profile.commission_rate != null ? `${profile.commission_rate}%` : undefined} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Verification</h2>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold" style={{ color: statusCfg.color, background: statusCfg.bg }}>
              <StatusIcon className="w-4 h-4" />{statusCfg.label}
            </div>
            <div className="space-y-2 pt-1">
              {(supplier.verification_status === "pending" || supplier.verification_status === "unverified") && (<>
                <button onClick={() => handleQuickAction("approve")} className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--success)", color: "white" }}>Approve</button>
                <button onClick={() => handleQuickAction("reject")} className="w-full py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
                  Reject
                </button>
              </>)}
              {supplier.verification_status === "verified" && (
                <button onClick={() => handleQuickAction("suspend")} className="w-full py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
                  Suspend
                </button>
              )}
              {(supplier.verification_status === "expired" || supplier.verification_status === "rejected") && (
                <button onClick={() => handleQuickAction("reinstate")} className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--success)", color: "white" }}>Reinstate</button>
              )}
            </div>
          </div>

          {profile && (
            <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Performance</h2>
              {[
                { icon: Star,          label: "Avg Rating",       value: profile.average_rating ? `${profile.average_rating.toFixed(1)} / 5.0` : "No ratings yet" },
                { icon: MessageSquare, label: "Response Rate",    value: profile.response_rate ? `${Math.round(profile.response_rate * 100)}%` : "—" },
                { icon: Truck,         label: "On-time Delivery", value: profile.on_time_delivery_rate ? `${Math.round(profile.on_time_delivery_rate * 100)}%` : "—" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Quick Links</h2>
            {supplier.slug && (
              <Link href={`/suppliers/${supplier.slug}`} target="_blank"
                className="flex items-center justify-between w-full py-2 px-3 rounded-xl text-sm transition-colors hover:opacity-80"
                style={{ background: "var(--surface-secondary)", color: "var(--text-primary)" }}>
                Public Listing <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
              </Link>
            )}
            <Link href={`/admin/products?supplierId=${supplier.id}`}
              className="flex items-center justify-between w-full py-2 px-3 rounded-xl text-sm transition-colors hover:opacity-80"
              style={{ background: "var(--surface-secondary)", color: "var(--text-primary)" }}>
              All Products ({products.length}) <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
            </Link>
          </div>
        </div>
      </div>

      <ProductsTable products={products} supplierId={id as string}
        onDelete={(pid, pname) => setDeleteProductDialog({ open: true, id: pid, name: pname })} />

      <Dialog open={deleteSupplierOpen} onOpenChange={setDeleteSupplierOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Supplier</DialogTitle></DialogHeader>
          <p className="text-sm py-2" style={{ color: "var(--text-secondary)" }}>
            Delete <strong>{supplier.name}</strong>? This will deactivate all their products and cannot be undone.
          </p>
          <DialogFooter>
            <button onClick={() => setDeleteSupplierOpen(false)} className="btn-outline !py-2 !px-4 !text-sm">Cancel</button>
            <button onClick={confirmDeleteSupplier} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--danger)", color: "white" }}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete Supplier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteProductDialog open={deleteProductDialog.open} name={deleteProductDialog.name}
        deleting={deletingProduct} onCancel={() => setDeleteProductDialog({ open: false, id: "", name: "" })}
        onConfirm={confirmDeleteProduct} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */
function ProductsTable({ products, supplierId, onDelete }: {
  products: ProductRow[]; supplierId: string; onDelete: (id: string, name: string) => void;
}) {
  return (
    <section className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          Products ({products.length})
        </h2>
        <Link href={`/admin/products/new?supplierId=${supplierId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "var(--obsidian)", color: "var(--ivory)" }}>
          <Plus className="w-3.5 h-3.5" /> Add Product
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
                <td className="px-5 py-3.5"><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span></td>
                <td className="px-5 py-3.5"><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.categories?.name ?? "—"}</span></td>
                <td className="px-5 py-3.5"><span className="text-sm" style={{ color: "var(--text-primary)" }}>${(p.base_price / 100).toFixed(2)}</span></td>
                <td className="px-5 py-3.5"><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.moq}</span></td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: p.moderation_status === "approved" ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--warning) 12%, transparent)",
                      color: p.moderation_status === "approved" ? "var(--success)" : "var(--warning)",
                    }}>{p.moderation_status}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/products/${p.id}`} className="p-1.5 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button onClick={() => onDelete(p.id, p.name)} className="p-1.5 rounded-lg" style={{ color: "var(--danger)" }}>
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
  );
}

function DeleteProductDialog({ open, name, deleting, onCancel, onConfirm }: {
  open: boolean; name: string; deleting: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Remove Product</DialogTitle></DialogHeader>
        <p className="text-sm py-2" style={{ color: "var(--text-secondary)" }}>Remove <strong>{name}</strong> from this supplier?</p>
        <DialogFooter>
          <button onClick={onCancel} className="btn-outline !py-2 !px-4 !text-sm">Cancel</button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--danger)", color: "white" }}>
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Remove
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
