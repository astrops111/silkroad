"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2, X, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
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

const STATUS_CONFIG = {
  approved: { icon: CheckCircle2, color: "var(--success)" },
  pending: { icon: Clock, color: "var(--warning)" },
  rejected: { icon: XCircle, color: "var(--danger)" },
  suspended: { icon: AlertTriangle, color: "var(--danger)" },
};

interface GroupDetail {
  id: string; name: string; code: string | null; group_type: string;
  description: string | null; country_code: string | null;
  preferred_container_type: string | null; notes: string | null; is_active: boolean;
  product_mix: boolean; moq: number | null; min_order_amount: number | null;
}

interface ProductInGroup {
  id: string; name: string; base_price: number; currency: string;
  moq: number; moderation_status: string; is_active: boolean; supplier_id: string;
  companies: { name: string } | null;
  categories: { name: string } | null;
}

export default function ShippingGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [products, setProducts] = useState<ProductInGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", code: "", group_type: "custom", description: "",
    country_code: "", preferred_container_type: "", notes: "", is_active: true,
    product_mix: false, moq: "", min_order_amount: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/shipping-groups?id=${id}`);
      if (!res.ok) { toast.error("Group not found"); router.push("/admin/shipping-groups"); return; }
      const data = await res.json();
      const g: GroupDetail = data.group;
      setGroup(g);
      setProducts(data.products ?? []);
      setForm({
        name: g.name,
        code: g.code ?? "",
        group_type: g.group_type,
        description: g.description ?? "",
        country_code: g.country_code ?? "",
        preferred_container_type: g.preferred_container_type ?? "",
        notes: g.notes ?? "",
        is_active: g.is_active,
        product_mix: g.product_mix ?? false,
        moq: g.moq != null ? String(g.moq) : "",
        min_order_amount: g.min_order_amount != null ? String(g.min_order_amount) : "",
      });
    } catch {
      toast.error("Failed to load group");
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
      const res = await fetch("/api/admin/shipping-groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: id,
          name: form.name.trim(),
          code: form.code.trim() || null,
          group_type: form.group_type,
          description: form.description.trim() || null,
          country_code: form.country_code.trim() || null,
          preferred_container_type: form.preferred_container_type || null,
          notes: form.notes.trim() || null,
          is_active: form.is_active,
          product_mix: form.product_mix,
          moq: form.moq !== "" ? Number(form.moq) : null,
          min_order_amount: form.min_order_amount !== "" ? Number(form.min_order_amount) : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Group saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${group?.name}"? All ${products.length} products will be unassigned.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/shipping-groups?id=${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Group deleted");
      router.push("/admin/shipping-groups");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function handleRemoveProduct(productId: string) {
    setRemovingId(productId);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, shipping_group_id: null }),
      });
      if (!res.ok) throw new Error("Failed");
      setProducts((p) => p.filter((x) => x.id !== productId));
      toast.success("Product removed from group");
    } catch {
      toast.error("Failed to remove product");
    } finally {
      setRemovingId(null);
    }
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = { background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
    </div>
  );

  if (!group) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/shipping-groups" className="p-2 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {group.name}
            </h1>
            {group.code && (
              <p className="text-sm font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>{group.code}</p>
            )}
          </div>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" }}>
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Group Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Group Name</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Reference Code
                <span className="ml-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>auto-uppercased</span>
              </label>
              <input value={form.code} onChange={(e) => set("code", e.target.value)} className={inputCls} style={inputStyle} />
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
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 rounded" />
                Active
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Freight Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Origin Country</label>
              <input value={form.country_code} onChange={(e) => set("country_code", e.target.value.toUpperCase())}
                maxLength={2} className={inputCls} style={inputStyle} />
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
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Order Rules</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Product Mix</label>
              <div className="flex gap-3">
                {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map(({ val, label }) => (
                  <button key={label} type="button" onClick={() => set("product_mix", val)}
                    className="px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: form.product_mix === val ? "var(--amber)" : "var(--surface-secondary)",
                      color: form.product_mix === val ? "#000" : "var(--text-secondary)",
                      border: "1px solid var(--border-subtle)",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>Allow mixed product types in this shipping group</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>MOQ</label>
              <input type="number" min="1" value={form.moq} onChange={(e) => set("moq", e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>Minimum order quantity (units)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Min Order Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-tertiary)" }}>$</span>
                <input type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(e) => set("min_order_amount", e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>Minimum total order value (USD)</p>
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

      {/* Products in this group */}
      <section className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Products in this group
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-tertiary)" }}>({products.length})</span>
          </h2>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Assign via product edit page →
          </span>
        </div>
        {products.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No products assigned to this group yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Open a product's edit page and select this group</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Product", "Supplier", "Price", "Status", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const sc = STATUS_CONFIG[p.moderation_status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                const isRemoving = removingId === p.id;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-5 py-3">
                      <Link href={`/admin/products/${p.id}`} className="text-sm font-medium hover:underline" style={{ color: "var(--text-primary)" }}>
                        {p.name}
                      </Link>
                      {p.categories?.name && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{p.categories.name}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.companies?.name ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        ${(p.base_price / 100).toFixed(2)}{p.currency !== "USD" ? ` ${p.currency}` : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <sc.icon className="w-3.5 h-3.5 inline mr-1" style={{ color: sc.color }} />
                      <span className="text-xs" style={{ color: sc.color }}>{p.moderation_status}</span>
                    </td>
                    <td className="px-5 py-3">
                      {isRemoving ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--amber)" }} />
                      ) : (
                        <button onClick={() => handleRemoveProduct(p.id)} title="Remove from group"
                          className="p-1 rounded hover:opacity-70"
                          style={{ color: "var(--text-tertiary)" }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
