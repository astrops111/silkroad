"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, Loader2, Package, CheckCircle2, Clock,
  XCircle, AlertTriangle, Pencil, Trash2, RefreshCw, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type ModerationStatus = "pending" | "approved" | "rejected" | "suspended";

interface ProductRow {
  id: string; name: string; base_price: number; currency: string;
  moq: number; moderation_status: ModerationStatus; is_active: boolean;
  is_featured: boolean; supplier_id: string; created_at: string;
  companies: { name: string; country_code: string } | null;
  categories: { name: string } | null;
  product_images: { url: string; is_primary: boolean }[];
}

const tabs = ["All", "Pending", "Approved", "Rejected", "Suspended"] as const;

const statusConfig: Record<ModerationStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  approved: { label: "Approved", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending: { label: "Pending", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  rejected: { label: "Rejected", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
  suspended: { label: "Suspended", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: AlertTriangle },
};

interface SupplierOption { id: string; name: string; country_code: string | null; }
interface ShippingGroupOption { id: string; name: string; }

const COUNTRY_NAMES: Record<string, string> = {
  CN: "China", KR: "South Korea", JP: "Japan", TH: "Thailand",
  VN: "Vietnam", MY: "Malaysia", ID: "Indonesia", IN: "India",
  PH: "Philippines", TW: "Taiwan", SG: "Singapore", HK: "Hong Kong",
};

export default function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("All");
  const [search, setSearch] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [filterShippingGroupId, setFilterShippingGroupId] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [shippingGroups, setShippingGroups] = useState<ShippingGroupOption[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tabToStatus: Record<string, string | null> = {
    All: null, Pending: "pending", Approved: "approved",
    Rejected: "rejected", Suspended: "suspended",
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/suppliers?limit=200").then((r) => r.json()),
      fetch("/api/admin/shipping-groups").then((r) => r.json()),
    ]).then(([sData, sgData]) => {
      const supplierList: SupplierOption[] = (sData.suppliers ?? []).map(
        (s: { id: string; name: string; country_code: string | null }) => ({ id: s.id, name: s.name, country_code: s.country_code })
      );
      setSuppliers(supplierList);
      const uniqueCountries = [...new Set(supplierList.map((s) => s.country_code).filter(Boolean))] as string[];
      setCountries(uniqueCountries.sort());
      setShippingGroups(
        (sgData.groups ?? []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }))
      );
    }).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    const status = tabToStatus[activeTab];
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (filterSupplierId) params.set("supplierId", filterSupplierId);
    if (filterShippingGroupId) params.set("shippingGroupId", filterShippingGroupId);
    if (filterCountry) params.set("country", filterCountry);
    params.set("limit", "100");

    try {
      const res = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, filterSupplierId, filterShippingGroupId, filterCountry]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  async function handleModerate(productId: string, action: string) {
    setActionLoading(productId);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action }),
      });
      const data = await res.json();
      if (data.success) { await fetchProducts(); toast.success(`Product ${action}d`); }
      else toast.error(data.error ?? "Action failed");
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(productId: string, productName: string) {
    if (!confirm(`Remove "${productName}"?`)) return;
    setActionLoading(productId);
    try {
      const res = await fetch(`/api/admin/products?id=${productId}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((p) => p.filter((x) => x.id !== productId));
        setTotal((t) => t - 1);
        toast.success("Product removed");
      } else {
        toast.error("Failed");
      }
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Product Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>{total} products on the platform</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchProducts} className="btn-outline !py-2 !px-4 !text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link href="/admin/products/new" className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Product
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{ background: activeTab === tab ? "var(--obsidian)" : "transparent", color: activeTab === tab ? "var(--ivory)" : "var(--text-tertiary)" }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", minWidth: 240 }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input type="text" placeholder="Search by product name..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
        </div>

        {/* Supplier filter */}
        <div className="relative">
          <select value={filterSupplierId} onChange={(e) => setFilterSupplierId(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: filterSupplierId ? "var(--text-primary)" : "var(--text-tertiary)", minWidth: 160 }}>
            <option value="">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
        </div>

        {/* Shipping group filter */}
        <div className="relative">
          <select value={filterShippingGroupId} onChange={(e) => setFilterShippingGroupId(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: filterShippingGroupId ? "var(--text-primary)" : "var(--text-tertiary)", minWidth: 180 }}>
            <option value="">All Shipping Groups</option>
            {shippingGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
        </div>

        {/* Country filter */}
        <div className="relative">
          <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: filterCountry ? "var(--text-primary)" : "var(--text-tertiary)", minWidth: 140 }}>
            <option value="">All Countries</option>
            {countries.map((c) => <option key={c} value={c}>{COUNTRY_NAMES[c] ?? c}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
        </div>

        {(filterSupplierId || filterShippingGroupId || filterCountry) && (
          <button onClick={() => { setFilterSupplierId(""); setFilterShippingGroupId(""); setFilterCountry(""); }}
            className="text-xs px-3 py-2 rounded-xl"
            style={{ color: "var(--text-tertiary)", border: "1px solid var(--border-subtle)" }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
            <span className="ml-3 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading products...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <Package className="w-12 h-12 mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No products found</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {search ? "Try a different search term" : "Products will appear here once submitted"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Product", "Supplier", "Category", "Price", "MOQ", "Status", "Submitted", ""].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const status = statusConfig[p.moderation_status] ?? statusConfig.pending;
                  const isActioning = actionLoading === p.id;
                  return (
                    <tr key={p.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                        {p.is_featured && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: "color-mix(in srgb, var(--amber) 15%, transparent)", color: "var(--amber-dark)" }}>
                            Featured
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/admin/suppliers/${p.supplier_id}`} className="text-sm hover:underline" style={{ color: "var(--text-secondary)" }}>
                          {p.companies?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>{p.categories?.name ?? "—"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          ${(p.base_price / 100).toFixed(2)}{p.currency !== "USD" ? ` ${p.currency}` : ""}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.moq}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ color: status.color, background: status.bg }}>
                          <status.icon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isActioning ? (
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--amber)" }} />
                        ) : (
                          <div className="flex items-center gap-2">
                            {p.moderation_status === "pending" && (
                              <>
                                <button onClick={() => handleModerate(p.id, "approve")}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                                  style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>
                                  Approve
                                </button>
                                <button onClick={() => handleModerate(p.id, "reject")}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                                  style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" }}>
                                  Reject
                                </button>
                              </>
                            )}
                            <Link href={`/admin/products/${p.id}`} className="p-1.5 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded-lg" style={{ color: "var(--danger)" }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Showing {products.length} of {total} products</p>
        </div>
      </div>
    </div>
  );
}
