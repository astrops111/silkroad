"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, RefreshCw, Ship, Plane, Boxes, Users,
  CheckSquare, Square, Layers, Plus, X,
} from "lucide-react";
import { toast } from "sonner";

const COUNTRY_NAMES: Record<string, string> = {
  CN: "China", TW: "Taiwan", KR: "South Korea", JP: "Japan",
  TH: "Thailand", VN: "Vietnam", MY: "Malaysia", ID: "Indonesia",
  SG: "Singapore", HK: "Hong Kong", IN: "India",
};

const MODE_META: Record<string, { label: string; icon: typeof Ship; container: string }> = {
  sea: { label: "Sea freight", icon: Ship, container: "lcl" },
  air: { label: "Air freight", icon: Plane, container: "air_freight" },
};

// How the group's minimum is met — drives marketplace messaging.
const GROUP_TYPE_OPTIONS = [
  { value: "supplier", label: "Supplier MOA pool — one minimum across this supplier's products" },
  { value: "country", label: "Groupage — minimum combined across suppliers from one origin" },
  { value: "custom", label: "Custom batch" },
];

interface ClusterProduct {
  id: string; name: string; brand: string | null;
  basePrice: number; currency: string; moq: number;
  minOrderAmount: number | null; minOrderGroupedBy: string | null;
  shippingMode: string | null; containerSizeFt: number | null;
  originCountry: string | null; supplierId: string; supplierName: string;
  shippingGroupId: string | null; moderationStatus: string;
}

interface GroupOption {
  id: string; name: string; code: string | null; group_type: string;
  country_code: string | null; preferred_container_type: string | null;
  product_mix: boolean; moq: number | null; min_order_amount: number | null;
}

interface Cluster {
  key: string;
  origin: string | null;
  mode: "sea" | "air";
  products: ClusterProduct[];
  suppliers: { supplierId: string; supplierName: string; products: ClusterProduct[] }[];
}

function countryLabel(code: string | null): string {
  if (!code) return "Unknown origin";
  return COUNTRY_NAMES[code] ?? code;
}

/** Pooled minimum-order value in USD dollars: Σ moq × unit price (USD rows only). */
function pooledMoqValue(products: ClusterProduct[]): { usd: number; nonUsd: number } {
  let usd = 0, nonUsd = 0;
  for (const p of products) {
    if (p.currency === "USD") usd += (p.moq * p.basePrice) / 100;
    else nonUsd++;
  }
  return { usd, nonUsd };
}

export default function ShippingGroupClustersPage() {
  const [products, setProducts] = useState<ClusterProduct[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [onlyUngrouped, setOnlyUngrouped] = useState(false);
  const [search, setSearch] = useState("");

  // Assignment UI
  const [targetGroupId, setTargetGroupId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [markGroupedMinimum, setMarkGroupedMinimum] = useState(true);
  const [newGroup, setNewGroup] = useState({
    name: "", code: "", group_type: "custom", country_code: "",
    preferred_container_type: "lcl", moq: "", min_order_amount: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shipping-groups/clusters");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(data.products ?? []);
      setGroups(data.groups ?? []);
      if (data.truncated) toast.warning("Product list truncated at 5,000 — refine filters in DB if needed");
    } catch {
      toast.error("Failed to load clusters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const groupNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const g of groups) m[g.id] = g.name;
    return m;
  }, [groups]);

  const origins = useMemo(
    () => Array.from(new Set(products.map((p) => p.originCountry).filter(Boolean))).sort() as string[],
    [products]
  );

  // Build clusters: key = origin + mode. Products with mode 'either'/null are
  // groupage-flexible and appear under both sea and air for their origin.
  const clusters = useMemo<Cluster[]>(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Cluster>();

    for (const p of products) {
      if (onlyUngrouped && p.shippingGroupId) continue;
      if (filterOrigin && p.originCountry !== filterOrigin) continue;
      if (q && !`${p.name} ${p.brand ?? ""} ${p.supplierName}`.toLowerCase().includes(q)) continue;

      const modes: ("sea" | "air")[] =
        p.shippingMode === "sea" ? ["sea"] :
        p.shippingMode === "air" ? ["air"] : ["sea", "air"];

      for (const mode of modes) {
        if (filterMode && mode !== filterMode) continue;
        const key = `${p.originCountry ?? "??"}::${mode}`;
        let c = map.get(key);
        if (!c) {
          c = { key, origin: p.originCountry, mode, products: [], suppliers: [] };
          map.set(key, c);
        }
        c.products.push(p);
      }
    }

    for (const c of map.values()) {
      const bySupplier = new Map<string, { supplierId: string; supplierName: string; products: ClusterProduct[] }>();
      for (const p of c.products) {
        let s = bySupplier.get(p.supplierId);
        if (!s) {
          s = { supplierId: p.supplierId, supplierName: p.supplierName, products: [] };
          bySupplier.set(p.supplierId, s);
        }
        s.products.push(p);
      }
      c.suppliers = Array.from(bySupplier.values()).sort((a, b) => b.products.length - a.products.length);
    }

    return Array.from(map.values()).sort((a, b) => b.products.length - a.products.length);
  }, [products, filterOrigin, filterMode, onlyUngrouped, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleMany(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) { if (on) next.add(id); else next.delete(id); }
      return next;
    });
  }

  /** Groupage group prefill (origin + mode cluster). */
  function openCreateGroupage(cluster?: Cluster) {
    const origin = cluster?.origin ?? filterOrigin ?? "";
    const mode = cluster?.mode ?? (filterMode as "sea" | "air") ?? "sea";
    const meta = MODE_META[mode] ?? MODE_META.sea;
    setNewGroup({
      name: origin ? `${countryLabel(origin)} · ${meta.label} groupage` : "",
      code: origin ? `${origin}-${mode.toUpperCase()}` : "",
      group_type: "country",
      country_code: origin ?? "",
      preferred_container_type: meta.container,
      moq: "", min_order_amount: "",
    });
    setCreateOpen(true);
  }

  /** Supplier MOA-pool prefill: whole supplier listing counts toward one minimum. */
  function openCreateSupplierPool(supplierName: string, origin: string | null, mode: "sea" | "air") {
    const meta = MODE_META[mode] ?? MODE_META.sea;
    setNewGroup({
      name: `${supplierName} · MOA pool`,
      code: "",
      group_type: "supplier",
      country_code: origin ?? "",
      preferred_container_type: meta.container,
      moq: "", min_order_amount: "",
    });
    setCreateOpen(true);
  }

  async function assign(createNew: boolean) {
    if (selected.size === 0) { toast.error("Select at least one product"); return; }
    if (!createNew && !targetGroupId) { toast.error("Choose a group"); return; }
    if (createNew && !newGroup.name.trim()) { toast.error("Group name required"); return; }

    setAssigning(true);
    try {
      const res = await fetch("/api/admin/shipping-groups/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: Array.from(selected),
          groupId: createNew ? undefined : targetGroupId,
          createGroup: createNew
            ? {
                name: newGroup.name.trim(),
                code: newGroup.code.trim() || undefined,
                group_type: newGroup.group_type,
                country_code: newGroup.country_code.trim() || undefined,
                preferred_container_type: newGroup.preferred_container_type || undefined,
                product_mix: true,
                moq: newGroup.moq || undefined,
                min_order_amount: newGroup.min_order_amount || undefined,
              }
            : undefined,
          markGroupedMinimum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.assigned} product${data.assigned !== 1 ? "s" : ""} assigned`);
      setSelected(new Set());
      setCreateOpen(false);
      setTargetGroupId("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  const inputCls = "px-3 py-2 rounded-xl text-sm outline-none";
  const inputStyle = { background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
      <span className="ml-3 text-sm" style={{ color: "var(--text-tertiary)" }}>Computing clusters…</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/shipping-groups" className="p-2 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Cluster Explorer
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Products grouped by origin + freight mode (groupage candidates); supplier rows inside each
              cluster can pool toward a single MOA
            </p>
          </div>
        </div>
        <button onClick={load} className="btn-outline !py-2 !px-4 !text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, brand, supplier…"
          className={`${inputCls} w-64`} style={inputStyle} />
        <select value={filterOrigin} onChange={(e) => setFilterOrigin(e.target.value)} className={inputCls} style={inputStyle}>
          <option value="">All origins</option>
          {origins.map((o) => <option key={o} value={o}>{countryLabel(o)}</option>)}
        </select>
        <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className={inputCls} style={inputStyle}>
          <option value="">Sea + Air</option>
          <option value="sea">Sea</option>
          <option value="air">Air</option>
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={onlyUngrouped} onChange={(e) => setOnlyUngrouped(e.target.checked)} className="w-4 h-4 rounded" />
          Ungrouped only
        </label>
      </div>

      {/* Clusters */}
      {clusters.length === 0 ? (
        <div className="rounded-2xl border py-20 flex flex-col items-center" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <Boxes className="w-12 h-12 mb-3" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No clusters match the current filters</p>
        </div>
      ) : (
        clusters.map((c) => {
          const meta = MODE_META[c.mode];
          const ModeIcon = meta.icon;
          const ungrouped = c.products.filter((p) => !p.shippingGroupId);
          const pool = pooledMoqValue(c.products);
          const clusterIds = c.products.map((p) => p.id);
          const allSelected = clusterIds.length > 0 && clusterIds.every((id) => selected.has(id));

          return (
            <section key={c.key} className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              {/* Cluster header */}
              <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl" style={{ background: "var(--surface-secondary)" }}>
                    <ModeIcon className="w-4 h-4" style={{ color: "var(--amber)" }} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {countryLabel(c.origin)} · {meta.label}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {c.products.length} products · {c.suppliers.length} supplier{c.suppliers.length !== 1 ? "s" : ""} ·{" "}
                      {ungrouped.length} ungrouped
                      {pool.usd > 0 && <> · pooled MOA value ≈ ${Math.round(pool.usd).toLocaleString()}</>}
                      {pool.nonUsd > 0 && <> (+{pool.nonUsd} non-USD)</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleMany(ungrouped.map((p) => p.id), true)}
                    className="btn-outline !py-1.5 !px-3 !text-xs">
                    Select ungrouped
                  </button>
                  <button onClick={() => toggleMany(clusterIds, !allSelected)}
                    className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
                    {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                  <button onClick={() => { toggleMany(ungrouped.map((p) => p.id), true); openCreateGroupage(c); }}
                    className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Groupage from cluster
                  </button>
                </div>
              </div>

              {/* Supplier sub-groups */}
              {c.suppliers.map((s) => {
                const sPool = pooledMoqValue(s.products);
                return (
                  <div key={s.supplierId}>
                    <div className="px-5 py-2 flex items-center gap-2 flex-wrap" style={{ background: "var(--surface-secondary)" }}>
                      <Users className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{s.supplierName}</span>
                      <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {s.products.length} product{s.products.length !== 1 ? "s" : ""}
                      </span>
                      {s.products.length > 1 && (
                        <>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "color-mix(in srgb, var(--amber) 12%, transparent)", color: "var(--amber)" }}>
                            Single-MOA pool candidate
                            {sPool.usd > 0 && <> · ≈ ${Math.round(sPool.usd).toLocaleString()}</>}
                          </span>
                          <button
                            onClick={() => {
                              toggleMany(s.products.map((p) => p.id), true);
                              openCreateSupplierPool(s.supplierName, c.origin, c.mode);
                            }}
                            className="btn-outline !py-0.5 !px-2 !text-[11px] ml-auto">
                            Pool as single MOA →
                          </button>
                        </>
                      )}
                    </div>
                    {s.products.map((p) => {
                      const isSel = selected.has(p.id);
                      const flexible = p.shippingMode !== "sea" && p.shippingMode !== "air";
                      return (
                        <div key={`${c.key}-${p.id}`}
                          className="px-5 py-2.5 flex items-center gap-3 cursor-pointer"
                          style={{ borderBottom: "1px solid var(--border-subtle)", background: isSel ? "color-mix(in srgb, var(--amber) 6%, transparent)" : "transparent" }}
                          onClick={() => toggle(p.id)}>
                          {isSel
                            ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: "var(--amber)" }} />
                            : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />}
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium truncate block" style={{ color: "var(--text-primary)" }}>
                              {p.name}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                              {p.brand ? `${p.brand} · ` : ""}MOQ {p.moq.toLocaleString()} · ${(p.basePrice / 100).toFixed(2)}
                              {p.currency !== "USD" ? ` ${p.currency}` : ""}
                              {p.minOrderAmount != null && <> · min ${(p.minOrderAmount / 100).toLocaleString()}</>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {flexible && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--surface-secondary)", color: "var(--text-tertiary)" }}>
                                sea/air flexible
                              </span>
                            )}
                            {p.shippingGroupId ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", color: "var(--success)" }}>
                                <Layers className="w-2.5 h-2.5 inline mr-0.5" />
                                {groupNameById[p.shippingGroupId] ?? "Grouped"}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--surface-secondary)", color: "var(--text-tertiary)" }}>
                                ungrouped
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </section>
          );
        })
      )}

      {/* Sticky selection toolbar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-2xl border shadow-xl px-5 py-3 flex items-center gap-3 flex-wrap"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {selected.size} selected
          </span>
          <select value={targetGroupId} onChange={(e) => setTargetGroupId(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Add to existing group…</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ""}</option>)}
          </select>
          <button onClick={() => assign(false)} disabled={assigning || !targetGroupId}
            className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-2">
            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            Assign
          </button>
          <button onClick={() => openCreateGroupage()} className="btn-outline !py-2 !px-4 !text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> New group
          </button>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={markGroupedMinimum} onChange={(e) => setMarkGroupedMinimum(e.target.checked)} className="w-3.5 h-3.5 rounded" />
            Mark min. order as group-combined
          </label>
          <button onClick={() => setSelected(new Set())} className="p-1.5 rounded-lg" style={{ color: "var(--text-tertiary)" }} title="Clear selection">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create-group panel */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setCreateOpen(false)}>
          <div className="rounded-2xl border w-full max-w-md p-6 space-y-4"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                New group from {selected.size} product{selected.size !== 1 ? "s" : ""}
              </h2>
              <button onClick={() => setCreateOpen(false)} className="p-1.5 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Pooling model</label>
                <select value={newGroup.group_type}
                  onChange={(e) => setNewGroup((g) => ({ ...g, group_type: e.target.value }))}
                  className={`${inputCls} w-full`} style={inputStyle}>
                  {GROUP_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Group name</label>
                <input value={newGroup.name} onChange={(e) => setNewGroup((g) => ({ ...g, name: e.target.value }))}
                  className={`${inputCls} w-full`} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Code</label>
                  <input value={newGroup.code} onChange={(e) => setNewGroup((g) => ({ ...g, code: e.target.value }))}
                    className={`${inputCls} w-full`} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Origin country</label>
                  <input value={newGroup.country_code} maxLength={2}
                    onChange={(e) => setNewGroup((g) => ({ ...g, country_code: e.target.value.toUpperCase() }))}
                    className={`${inputCls} w-full`} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Container</label>
                  <select value={newGroup.preferred_container_type}
                    onChange={(e) => setNewGroup((g) => ({ ...g, preferred_container_type: e.target.value }))}
                    className={`${inputCls} w-full`} style={inputStyle}>
                    <option value="lcl">LCL</option>
                    <option value="fcl_20">FCL 20&apos;</option>
                    <option value="fcl_40">FCL 40&apos;</option>
                    <option value="fcl_40hc">FCL 40&apos; HC</option>
                    <option value="air_express">Air Express</option>
                    <option value="air_freight">Air Freight</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Group MOQ (units)</label>
                  <input type="number" min="1" value={newGroup.moq}
                    onChange={(e) => setNewGroup((g) => ({ ...g, moq: e.target.value }))}
                    placeholder="optional" className={`${inputCls} w-full`} style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Group min. order amount (USD)</label>
                  <input type="number" min="0" step="0.01" value={newGroup.min_order_amount}
                    onChange={(e) => setNewGroup((g) => ({ ...g, min_order_amount: e.target.value }))}
                    placeholder="optional — combined minimum across the group" className={`${inputCls} w-full`} style={inputStyle} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={markGroupedMinimum} onChange={(e) => setMarkGroupedMinimum(e.target.checked)} className="w-4 h-4 rounded" />
                Mark each product&apos;s min. order as group-combined
              </label>
            </div>
            <button onClick={() => assign(true)} disabled={assigning}
              className="btn-primary w-full !py-2.5 !text-sm flex items-center justify-center gap-2">
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create group &amp; assign {selected.size} product{selected.size !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
