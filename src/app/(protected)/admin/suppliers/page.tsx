"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, CheckCircle2, Clock, XCircle, ShieldCheck, Download, Plus,
  Loader2, AlertTriangle, RefreshCw, Trash2, Mail, Eye, Users,
} from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type VerificationStatus = "unverified" | "pending" | "verified" | "rejected" | "expired";
type Tier = "free" | "standard" | "gold" | "verified";

interface SupplierProfile {
  id: string; tier: Tier; commission_rate: number | null; response_rate: number;
  on_time_delivery_rate: number; average_rating: number; total_orders: number;
  total_revenue: number; business_license_url: string | null;
}
interface Supplier {
  id: string; name: string; name_local: string | null; slug: string;
  country_code: string; city: string | null; default_currency: string;
  market_region: string; industry: string | null; verification_status: VerificationStatus;
  is_active: boolean; created_at: string; tax_id: string | null; tax_id_verified: boolean;
  supplier_profiles: SupplierProfile[] | null; productCount: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const tabs = ["All", "Pending", "Verified", "Rejected", "Suspended"] as const;

const TAB_TO_STATUS: Record<string, string | null> = {
  All: null, Pending: "pending", Verified: "verified", Rejected: "rejected", Suspended: "expired",
};

const COUNTRY_FLAGS: Record<string, string> = {
  GH: "🇬🇭", NG: "🇳🇬", KE: "🇰🇪", UG: "🇺🇬", TZ: "🇹🇿", RW: "🇷🇼",
  ET: "🇪🇹", ZA: "🇿🇦", CM: "🇨🇲", SN: "🇸🇳", CI: "🇨🇮", CD: "🇨🇩",
  MZ: "🇲🇿", ZM: "🇿🇲", ZW: "🇿🇼", EG: "🇪🇬", MA: "🇲🇦", CN: "🇨🇳",
  TW: "🇹🇼", US: "🇺🇸", GB: "🇬🇧", JP: "🇯🇵", KR: "🇰🇷", VN: "🇻🇳",
  TH: "🇹🇭", MY: "🇲🇾", ID: "🇮🇩", SG: "🇸🇬", PH: "🇵🇭",
};

const COUNTRY_NAMES: Record<string, string> = {
  GH: "Ghana", NG: "Nigeria", KE: "Kenya", UG: "Uganda", TZ: "Tanzania",
  RW: "Rwanda", ET: "Ethiopia", ZA: "South Africa", CM: "Cameroon",
  SN: "Senegal", CI: "Côte d'Ivoire", CD: "DR Congo", MZ: "Mozambique",
  ZM: "Zambia", ZW: "Zimbabwe", EG: "Egypt", MA: "Morocco", CN: "China",
  TW: "Taiwan", US: "United States", GB: "United Kingdom", JP: "Japan",
  KR: "South Korea", VN: "Vietnam", TH: "Thailand", MY: "Malaysia",
  ID: "Indonesia", SG: "Singapore", PH: "Philippines",
};

const statusConfig: Record<VerificationStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  verified:   { label: "Verified",   color: "var(--success)",       bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending:    { label: "Pending",    color: "var(--warning)",       bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  unverified: { label: "Unverified", color: "var(--text-tertiary)", bg: "var(--surface-secondary)",                            icon: Clock },
  rejected:   { label: "Rejected",   color: "var(--danger)",        bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: XCircle },
  expired:    { label: "Suspended",  color: "var(--danger)",        bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: AlertTriangle },
};

const tierConfig: Record<Tier, { label: string; color: string; bg: string }> = {
  free:     { label: "Free",     color: "var(--text-tertiary)", bg: "var(--surface-secondary)" },
  standard: { label: "Standard", color: "var(--indigo)",        bg: "color-mix(in srgb, var(--indigo) 10%, transparent)" },
  gold:     { label: "Gold",     color: "var(--amber-dark)",    bg: "color-mix(in srgb, var(--amber) 12%, transparent)" },
  verified: { label: "Verified", color: "var(--success)",       bg: "color-mix(in srgb, var(--success) 10%, transparent)" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("All");
  const [search, setSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0, suspended: 0 });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [deleting, setDeleting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [inviteCountry, setInviteCountry] = useState("CN");
  const [inviting, setInviting] = useState(false);

  /* Global stats — one-time fetch for KPI cards */
  useEffect(() => {
    async function loadStats() {
      try {
        const [all, pending, verified, suspended] = await Promise.all([
          fetch("/api/admin/suppliers").then((r) => r.json()),
          fetch("/api/admin/suppliers?status=pending").then((r) => r.json()),
          fetch("/api/admin/suppliers?status=verified").then((r) => r.json()),
          fetch("/api/admin/suppliers?status=expired").then((r) => r.json()),
        ]);
        setStats({
          total: all.total ?? 0, pending: pending.total ?? 0,
          verified: verified.total ?? 0, suspended: suspended.total ?? 0,
        });
      } catch {}
    }
    loadStats();
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    const status = TAB_TO_STATUS[activeTab];
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

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/admin/suppliers/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), companyName: inviteCompany.trim() || undefined, countryCode: inviteCountry.trim().toUpperCase() || "CN" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite failed");
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setInviteOpen(false); setInviteEmail(""); setInviteCompany(""); setInviteCountry("CN");
      await fetchSuppliers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally { setInviting(false); }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/suppliers?id=${deleteDialog.id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast.success(`"${deleteDialog.name}" deactivated`);
        setDeleteDialog({ open: false, id: "", name: "" });
        await fetchSuppliers();
      } else { toast.error(`Delete failed: ${result.error}`); }
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  }

  async function handleAction(supplierId: string, action: string) {
    setActionLoading(supplierId);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, action }),
      });
      const result = await res.json();
      if (result.success) await fetchSuppliers();
      else toast.error(`Action failed: ${result.error}`);
    } catch { toast.error("Action failed"); }
    finally { setActionLoading(null); }
  }

  const kpis = [
    { label: "Total Suppliers", value: stats.total,     icon: Users,         accent: "var(--amber)" },
    { label: "Verified",        value: stats.verified,  icon: ShieldCheck,   accent: "var(--success)" },
    { label: "Pending Review",  value: stats.pending,   icon: Clock,         accent: "var(--warning)" },
    { label: "Suspended",       value: stats.suspended, icon: AlertTriangle, accent: "var(--danger)" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Supplier Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>{total} suppliers in current view</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSuppliers} title="Refresh" className="p-2 rounded-xl transition-colors"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button title="Export" className="p-2 rounded-xl transition-colors"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}>
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => setInviteOpen(true)} className="btn-outline !py-2 !px-4 !text-sm flex items-center gap-2">
            <Mail className="w-4 h-4" /> Invite
          </button>
          <Link href="/admin/suppliers/new" className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Supplier
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="p-5 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}>
              <kpi.icon className="w-4 h-4" style={{ color: kpi.accent }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{kpi.value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{ background: activeTab === tab ? "var(--obsidian)" : "transparent", color: activeTab === tab ? "var(--ivory)" : "var(--text-tertiary)" }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl max-w-md"
        style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
        <input type="text" placeholder="Search by company name, city, or country..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
            <span className="ml-3 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading suppliers...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ShieldCheck className="w-12 h-12 mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No suppliers found</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {search ? "Try a different search term" : "Suppliers will appear here once they register"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Company", "Location", "Tier", "Products", "Revenue", "Rating", "Status", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{h}</th>
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
                    <tr key={s.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{s.name}</span>
                          {s.tax_id_verified && <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "var(--success)" }} />}
                        </div>
                        {s.industry && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{s.industry}</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {COUNTRY_FLAGS[s.country_code] || ""} {COUNTRY_NAMES[s.country_code] || s.country_code}
                          {s.city ? `, ${s.city}` : ""}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: tier.color, background: tier.bg }}>{tier.label}</span>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.productCount}</span></td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {profile?.total_revenue ? `$${(profile.total_revenue / 100).toLocaleString()}` : "$0"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {profile?.average_rating ? `${profile.average_rating.toFixed(1)} / 5` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                          <status.icon className="w-3 h-3" />{status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {isActioning ? (
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--amber)" }} />
                          ) : (
                            <>
                              {(s.verification_status === "pending" || s.verification_status === "unverified") && (<>
                                <button onClick={() => handleAction(s.id, "approve")} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>Approve</button>
                                <button onClick={() => handleAction(s.id, "reject")} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" }}>Reject</button>
                              </>)}
                              {s.verification_status === "verified" && (
                                <button onClick={() => handleAction(s.id, "suspend")} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" }}>Suspend</button>
                              )}
                              {(s.verification_status === "expired" || s.verification_status === "rejected") && (
                                <button onClick={() => handleAction(s.id, "reinstate")} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>Reinstate</button>
                              )}
                              <Link href={`/admin/suppliers/${s.id}`} title="View supplier"
                                className="p-1.5 rounded-lg transition-colors inline-flex items-center" style={{ color: "var(--text-tertiary)" }}>
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button onClick={() => setDeleteDialog({ open: true, id: s.id, name: s.name })} title="Delete supplier"
                                className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--danger)" }}>
                                <Trash2 className="w-4 h-4" />
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
        <div className="flex items-center px-5 py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Showing {suppliers.length} of {total} suppliers</p>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: "Email", field: "email", type: "email", value: inviteEmail, setter: setInviteEmail, required: true, placeholder: "supplier@example.com" },
              { label: "Company Name", field: "company", type: "text", value: inviteCompany, setter: setInviteCompany, required: false, placeholder: "Shenzhen Tech Co." },
              { label: "Country Code", field: "country", type: "text", value: inviteCountry, setter: (v: string) => setInviteCountry(v.toUpperCase()), required: false, placeholder: "CN" },
            ].map(({ label, type, value, setter, required, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
                </label>
                <input type={type} value={value} onChange={(e) => setter(e.target.value)}
                  onKeyDown={label === "Email" ? (e) => e.key === "Enter" && handleInvite() : undefined}
                  placeholder={placeholder} maxLength={label === "Country Code" ? 2 : undefined}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => setInviteOpen(false)} className="btn-outline !py-2 !px-4 !text-sm">Cancel</button>
            <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-2">
              {inviting && <Loader2 className="w-4 h-4 animate-spin" />} Send Invite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: "", name: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Supplier</DialogTitle></DialogHeader>
          <p className="text-sm py-2" style={{ color: "var(--text-secondary)" }}>
            Delete <strong>{deleteDialog.name}</strong>? This will deactivate all their products and cannot be undone.
          </p>
          <DialogFooter>
            <button onClick={() => setDeleteDialog({ open: false, id: "", name: "" })} className="btn-outline !py-2 !px-4 !text-sm">Cancel</button>
            <button onClick={confirmDelete} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--danger)", color: "white" }}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete Supplier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
