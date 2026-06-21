"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
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
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function NewSupplierPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", nameLocal: "", email: "", countryCode: "CN", city: "", stateProvince: "",
    industry: "", website: "", description: "", marketRegion: "cn", taxId: "",
    verificationStatus: "unverified",
    factoryCountry: "", moqDefault: "", leadTimeDays: "", tradeTerms: "", commissionRate: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Company name and email are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          name_local: form.nameLocal.trim() || null,
          email: form.email.trim(),
          country_code: form.countryCode,
          city: form.city.trim() || null,
          state_province: form.stateProvince.trim() || null,
          industry: form.industry.trim() || null,
          website: form.website.trim() || null,
          description: form.description.trim() || null,
          market_region: form.marketRegion,
          tax_id: form.taxId.trim() || null,
          verification_status: form.verificationStatus,
          factoryCountry: form.factoryCountry || null,
          moqDefault: form.moqDefault ? Number(form.moqDefault) : null,
          leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : null,
          tradeTerms: form.tradeTerms || null,
          commissionRate: form.commissionRate ? Number(form.commissionRate) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create supplier");
      toast.success("Supplier created");
      router.push(data.supplierId ? `/admin/suppliers/${data.supplierId}` : "/admin/suppliers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create supplier");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = {
    background: "var(--surface-secondary)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/suppliers" className="p-2 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Add Supplier
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Create a new supplier account and trade profile
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/suppliers" className="btn-outline !py-2 !px-4 !text-sm">Cancel</Link>
          <button form="new-supplier-form" type="submit" disabled={saving}
            className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Supplier
          </button>
        </div>
      </div>

      <form id="new-supplier-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Account */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Company Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Guangzhou TechCo Ltd."
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Local Name{" "}
                <span className="text-xs font-normal" style={{ color: "var(--text-tertiary)" }}>
                  (native script, e.g. 深圳科技 / 심플렉스)
                </span>
              </label>
              <input
                value={form.nameLocal}
                onChange={(e) => set("nameLocal", e.target.value)}
                placeholder="Optional"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Contact Email <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="supplier@example.com"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Verification Status</label>
              <select value={form.verificationStatus} onChange={(e) => set("verificationStatus", e.target.value)} className={inputCls} style={inputStyle}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Company Information</h2>
          <div className="grid grid-cols-2 gap-4">
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
              <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Shenzhen" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Province / State</label>
              <input value={form.stateProvince} onChange={(e) => set("stateProvince", e.target.value)} placeholder="e.g. Guangdong" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Industry</label>
              <input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Electronics" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Website</label>
              <input type="url" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tax ID</label>
              <input value={form.taxId} onChange={(e) => set("taxId", e.target.value)} placeholder="Business registration number" className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Brief description of what this supplier sells..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* Trade Profile */}
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
              <input
                type="number" min={1}
                value={form.moqDefault}
                onChange={(e) => set("moqDefault", e.target.value)}
                placeholder="e.g. 100"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Lead Time (days)</label>
              <input
                type="number" min={1}
                value={form.leadTimeDays}
                onChange={(e) => set("leadTimeDays", e.target.value)}
                placeholder="e.g. 30"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Commission Rate (%)</label>
              <input
                type="number" min={0} max={100} step={0.1}
                value={form.commissionRate}
                onChange={(e) => set("commissionRate", e.target.value)}
                placeholder="e.g. 8"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="flex justify-end gap-3 pb-4">
          <Link href="/admin/suppliers" className="btn-outline !py-2.5 !px-5 !text-sm">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-5 !text-sm flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Supplier
          </button>
        </div>
      </form>
    </div>
  );
}
