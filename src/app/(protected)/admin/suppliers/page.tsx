"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  ChevronDown,
  Download,
  Plus,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type VerificationStatus = "unverified" | "pending" | "verified" | "rejected" | "expired";
type Tier = "free" | "standard" | "gold" | "verified";

interface SupplierProfile {
  id: string;
  tier: Tier;
  commission_rate: number | null;
  response_rate: number;
  on_time_delivery_rate: number;
  average_rating: number;
  total_orders: number;
  total_revenue: number;
  business_license_url: string | null;
}

interface Supplier {
  id: string;
  name: string;
  name_local: string | null;
  slug: string;
  country_code: string;
  city: string | null;
  default_currency: string;
  market_region: string;
  industry: string | null;
  verification_status: VerificationStatus;
  is_active: boolean;
  created_at: string;
  tax_id: string | null;
  tax_id_verified: boolean;
  supplier_profiles: SupplierProfile[] | null;
  productCount: number;
}

const tabs = ["All", "Pending", "Verified", "Rejected", "Suspended"] as const;

const COUNTRY_FLAGS: Record<string, string> = {
  GH: "\uD83C\uDDEC\uD83C\uDDED", NG: "\uD83C\uDDF3\uD83C\uDDEC", KE: "\uD83C\uDDF0\uD83C\uDDEA",
  UG: "\uD83C\uDDFA\uD83C\uDDEC", TZ: "\uD83C\uDDF9\uD83C\uDDFF", RW: "\uD83C\uDDF7\uD83C\uDDFC",
  ET: "\uD83C\uDDEA\uD83C\uDDF9", ZA: "\uD83C\uDDFF\uD83C\uDDE6", CM: "\uD83C\uDDE8\uD83C\uDDF2",
  SN: "\uD83C\uDDF8\uD83C\uDDF3", CI: "\uD83C\uDDE8\uD83C\uDDEE", CD: "\uD83C\uDDE8\uD83C\uDDE9",
  MZ: "\uD83C\uDDF2\uD83C\uDDFF", ZM: "\uD83C\uDDFF\uD83C\uDDF2", ZW: "\uD83C\uDDFF\uD83C\uDDFC",
  EG: "\uD83C\uDDEA\uD83C\uDDEC", MA: "\uD83C\uDDF2\uD83C\uDDE6", CN: "\uD83C\uDDE8\uD83C\uDDF3",
  TW: "\uD83C\uDDF9\uD83C\uDDFC", US: "\uD83C\uDDFA\uD83C\uDDF8", GB: "\uD83C\uDDEC\uD83C\uDDE7",
};

/* ------------------------------------------------------------------ */
/*  Status / Tier Config                                               */
/* ------------------------------------------------------------------ */
const statusConfig: Record<
  VerificationStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  verified: { label: "Verified", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending: { label: "Pending", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  unverified: { label: "Unverified", color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock },
  rejected: { label: "Rejected", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
  expired: { label: "Suspended", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: AlertTriangle },
};

const tierConfig: Record<Tier, { label: string; color: string; bg: string }> = {
  free: { label: "Free", color: "var(--text-tertiary)", bg: "var(--surface-secondary)" },
  standard: { label: "Standard", color: "var(--indigo)", bg: "color-mix(in srgb, var(--indigo) 10%, transparent)" },
  gold: { label: "Gold", color: "var(--amber-dark)", bg: "color-mix(in srgb, var(--amber) 12%, transparent)" },
  verified: { label: "Verified", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("All");
  const [search, setSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tabToStatus: Record<string, string | null> = {
    All: null,
    Pending: "pending",
    Verified: "verified",
    Rejected: "rejected",
    Suspended: "expired",
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    const status = tabToStatus[activeTab];
    if (status) params.set("status", status);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/admin/suppliers?${params}`);
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchSuppliers, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [fetchSuppliers]);

  const handleAction = async (supplierId: string, action: string) => {
    setActionLoading(supplierId);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, action }),
      });
      const result = await res.json();
      if (result.success) {
        await fetchSuppliers(); // Refresh list
      } else {
        alert(`Action failed: ${result.error}`);
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Supplier Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {total} suppliers registered on the platform
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchSuppliers} className="btn-outline !py-2 !px-4 !text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="btn-outline !py-2 !px-4 !text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="btn-primary !py-2 !px-4 !text-sm">
            <Plus className="w-4 h-4" />
            Invite Supplier
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{
              background: activeTab === tab ? "var(--obsidian)" : "transparent",
              color: activeTab === tab ? "var(--ivory)" : "var(--text-tertiary)",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 max-w-md"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search by company name, city, or country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
            <span className="ml-3 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading suppliers...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ShieldCheck className="w-12 h-12 mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              No suppliers found
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {search ? "Try a different search term" : "Suppliers will appear here once they register"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Company", "Country", "Tier", "Products", "Revenue", "Rating", "Status", "Joined", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => {
                  const profile = s.supplier_profiles?.[0];
                  const status = statusConfig[s.verification_status] || statusConfig.unverified;
                  const tier = tierConfig[(profile?.tier as Tier) || "free"];
                  const isActioning = actionLoading === s.id;

                  return (
                    <tr
                      key={s.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {s.name}
                          </span>
                          {s.tax_id_verified && (
                            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "var(--success)" }} />
                          )}
                        </div>
                        {s.industry && (
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{s.industry}</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {COUNTRY_FLAGS[s.country_code] || ""} {s.country_code}
                          {s.city ? `, ${s.city}` : ""}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ color: tier.color, background: tier.bg }}
                        >
                          {tier.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {s.productCount}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {profile?.total_revenue
                            ? `$${(profile.total_revenue / 100).toLocaleString()}`
                            : "$0"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {profile?.average_rating ? `${profile.average_rating.toFixed(1)} / 5` : "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ color: status.color, background: status.bg }}
                        >
                          <status.icon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(s.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {isActioning ? (
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--amber)" }} />
                          ) : (
                            <>
                              {(s.verification_status === "pending" || s.verification_status === "unverified") && (
                                <>
                                  <button
                                    onClick={() => handleAction(s.id, "approve")}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:brightness-110"
                                    style={{
                                      background: "color-mix(in srgb, var(--success) 12%, transparent)",
                                      color: "var(--success)",
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleAction(s.id, "reject")}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:brightness-110"
                                    style={{
                                      background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                                      color: "var(--danger)",
                                    }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {s.verification_status === "verified" && (
                                <button
                                  onClick={() => handleAction(s.id, "suspend")}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:brightness-110"
                                  style={{
                                    background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                                    color: "var(--danger)",
                                  }}
                                >
                                  Suspend
                                </button>
                              )}
                              {(s.verification_status === "expired" || s.verification_status === "rejected") && (
                                <button
                                  onClick={() => handleAction(s.id, "reinstate")}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:brightness-110"
                                  style={{
                                    background: "color-mix(in srgb, var(--success) 12%, transparent)",
                                    color: "var(--success)",
                                  }}
                                >
                                  Reinstate
                                </button>
                              )}
                              <button
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Showing {suppliers.length} of {total} suppliers
          </p>
        </div>
      </div>
    </div>
  );
}
