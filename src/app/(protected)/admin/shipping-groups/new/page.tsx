"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const GROUP_TYPES = [
  { value: "custom", label: "Custom" },
  { value: "supplier", label: "Supplier" },
  { value: "supplier_group", label: "Supplier Group" },
  { value: "country", label: "Country" },
];

const CONTAINER_TYPES = [
  { value: "", label: "— None —" },
  { value: "lcl", label: "LCL (Less than Container Load)" },
  { value: "fcl_20", label: "FCL 20'" },
  { value: "fcl_40", label: "FCL 40'" },
  { value: "fcl_40hc", label: "FCL 40' High Cube" },
  { value: "fcl_45", label: "FCL 45'" },
  { value: "air_express", label: "Air Express" },
  { value: "air_freight", label: "Air Freight" },
];

export default function NewShippingGroupPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    group_type: "custom",
    description: "",
    country_code: "",
    preferred_container_type: "",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shipping-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          group_type: form.group_type,
          description: form.description.trim() || undefined,
          country_code: form.country_code.trim() || undefined,
          preferred_container_type: form.preferred_container_type || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Shipping group created");
      router.push(`/admin/shipping-groups/${data.groupId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = { background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/shipping-groups" className="p-2 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            New Shipping Group
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Define a container batch or consolidation group
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Group Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Group Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Shenzhen Electronics Q2" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Reference Code
                <span className="ml-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>auto-uppercased</span>
              </label>
              <input value={form.code} onChange={(e) => set("code", e.target.value)}
                placeholder="SZ-ELEC-Q2" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Group Type</label>
              <select value={form.group_type} onChange={(e) => set("group_type", e.target.value)} className={inputCls} style={inputStyle}>
                {GROUP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
                placeholder="What products belong here and why..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Freight Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Origin Country</label>
              <input value={form.country_code} onChange={(e) => set("country_code", e.target.value.toUpperCase())}
                placeholder="CN" maxLength={2} className={inputCls} style={inputStyle} />
              <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>2-letter ISO code (informational)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Preferred Container</label>
              <select value={form.preferred_container_type} onChange={(e) => set("preferred_container_type", e.target.value)}
                className={inputCls} style={inputStyle}>
                {CONTAINER_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
                placeholder="Forwarder instructions, special handling, consolidation notes..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 justify-end">
          <Link href="/admin/shipping-groups" className="btn-outline !py-2.5 !px-5 !text-sm">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-5 !text-sm flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Group
          </button>
        </div>
      </form>
    </div>
  );
}
