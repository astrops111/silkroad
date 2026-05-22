"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const MARKET_REGIONS = [
  { value: "cn", label: "China" },
  { value: "sea", label: "Southeast Asia" },
  { value: "africa_west", label: "Africa – West" },
  { value: "africa_east", label: "Africa – East" },
  { value: "africa_south", label: "Africa – South" },
  { value: "global", label: "Global" },
];

const TRADE_TERMS = ["EXW", "FOB", "CIF", "DDP", "DAP", "FCA"];

export default function NewSupplierPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", nameLocal: "", countryCode: "CN", city: "", stateProvince: "",
    industry: "", website: "", description: "", marketRegion: "cn", taxId: "",
    factoryCountry: "CN", moqDefault: "", leadTimeDays: "", tradeTerms: "FOB",
    commissionRate: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.countryCode.trim()) {
      toast.error("Company name and country code are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          nameLocal: form.nameLocal || undefined,
          countryCode: form.countryCode.trim().toUpperCase(),
          city: form.city || undefined,
          stateProvince: form.stateProvince || undefined,
          industry: form.industry || undefined,
          website: form.website || undefined,
          description: form.description || undefined,
          marketRegion: form.marketRegion,
          taxId: form.taxId || undefined,
          factoryCountry: form.factoryCountry || form.countryCode,
          moqDefault: form.moqDefault ? Number(form.moqDefault) : undefined,
          leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
          tradeTerms: form.tradeTerms || undefined,
          commissionRate: form.commissionRate ? Number(form.commissionRate) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create supplier");
      toast.success("Supplier created");
      router.push(`/admin/suppliers/${data.supplierId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/suppliers" className="p-2 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Add Supplier
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Create a new supplier company on the platform
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <section
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Company Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Company Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Shenzhen Tech Manufacturing Co."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Local Name (Chinese / native script)
              </label>
              <input
                value={form.nameLocal}
                onChange={(e) => set("nameLocal", e.target.value)}
                placeholder="深圳科技制造有限公司"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Country Code <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                required
                value={form.countryCode}
                onChange={(e) => set("countryCode", e.target.value.toUpperCase())}
                placeholder="CN"
                maxLength={2}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Market Region</label>
              <select
                value={form.marketRegion}
                onChange={(e) => set("marketRegion", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                {MARKET_REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>City</label>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Shenzhen"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Province / State</label>
              <input value={form.stateProvince} onChange={(e) => set("stateProvince", e.target.value)} placeholder="Guangdong"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Industry</label>
              <input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Electronics Manufacturing"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Website</label>
              <input type="url" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tax ID</label>
              <input value={form.taxId} onChange={(e) => set("taxId", e.target.value)} placeholder="91440300MA5XXXXXX"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea
                value={form.description} onChange={(e) => set("description", e.target.value)}
                rows={3} placeholder="Brief description of the supplier's capabilities..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </section>

        {/* Trade Profile */}
        <section
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Trade Profile
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Factory Country</label>
              <input value={form.factoryCountry} onChange={(e) => set("factoryCountry", e.target.value.toUpperCase())}
                placeholder="CN" maxLength={2}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Default Trade Terms</label>
              <select value={form.tradeTerms} onChange={(e) => set("tradeTerms", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                {TRADE_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Default MOQ</label>
              <input type="number" min={1} value={form.moqDefault} onChange={(e) => set("moqDefault", e.target.value)} placeholder="100"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Lead Time (days)</label>
              <input type="number" min={1} value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} placeholder="30"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Commission Rate (%)</label>
              <input type="number" min={0} max={100} step={0.1} value={form.commissionRate}
                onChange={(e) => set("commissionRate", e.target.value)} placeholder="5"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 justify-end">
          <Link href="/admin/suppliers" className="btn-outline !py-2.5 !px-5 !text-sm">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-5 !text-sm flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Supplier
          </button>
        </div>
      </form>
    </div>
  );
}
