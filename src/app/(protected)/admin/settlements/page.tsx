"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Landmark,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Search,
  ChevronDown,
  Smartphone,
  CreditCard,
  Building,
  Loader2,
  RefreshCw,
  AlertCircle,
  Ban,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types — matches GET /api/admin/settlements                         */
/* ------------------------------------------------------------------ */
interface SettlementRow {
  id: string;
  settlement_number: string;
  period_start: string;
  period_end: string;
  gross_sales: number;
  total_commission: number;
  total_tax_on_commission: number | null;
  logistics_charges: number | null;
  net_payout: number;
  currency: string;
  status: string | null;
  payout_method: string | null;
  payout_reference: string | null;
  mobile_money_phone: string | null;
  mobile_money_provider: string | null;
  stripe_transfer_id: string | null;
  paid_at: string | null;
  created_at: string;
  supplier_id: string;
  companies: { name: string; country_code: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Config — mirrors settlement_status enum                            */
/* ------------------------------------------------------------------ */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending:    { label: "Pending",    color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  calculating:{ label: "Calculating",color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",  icon: Clock },
  ready:      { label: "Ready",      color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",  icon: CheckCircle2 },
  processing: { label: "Processing",color: "var(--amber-dark)",bg: "color-mix(in srgb, var(--amber) 12%, transparent)", icon: AlertCircle },
  paid:       { label: "Paid",       color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)",icon: CheckCircle2 },
  failed:     { label: "Failed",     color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
  disputed:   { label: "Disputed",   color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: AlertCircle },
  cancelled:  { label: "Cancelled",  color: "var(--text-tertiary)", bg: "var(--surface-secondary)",                     icon: Ban },
};

function statusMeta(status: string | null) {
  return status ? STATUS_CONFIG[status] ?? { label: status, color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock } : { label: "Unknown", color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock };
}

function payoutMethodMeta(method: string | null) {
  if (!method) return { label: "Not set", icon: Building };
  const m = method.toLowerCase();
  if (m.includes("momo") || m.includes("mobile") || m.includes("mpesa") || m.includes("airtel")) return { label: method, icon: Smartphone };
  if (m.includes("stripe") || m.includes("card")) return { label: method, icon: CreditCard };
  return { label: method, icon: Building };
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", minimumFractionDigits: 0 }).format((cents || 0) / 100);
}

const LIMIT = 25;

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function SettlementsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [stats, setStats] = useState({ totalPending: 0, commissionThisMonth: 0, settlementCount: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", String(LIMIT));
    params.set("offset", String(offset));
    try {
      const res = await fetch(`/api/admin/settlements?${params}`);
      const data = await res.json();
      setSettlements(data.settlements || []);
      setTotal(data.total || 0);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("Failed to fetch settlements:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, offset]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);
  useEffect(() => { setOffset(0); }, [statusFilter]);

  // GET /api/admin/settlements has no search param — filter the current page client-side.
  const filtered = useMemo(() => {
    if (!search.trim()) return settlements;
    const q = search.toLowerCase();
    return settlements.filter((s) => s.companies?.name?.toLowerCase().includes(q) || s.settlement_number.toLowerCase().includes(q));
  }, [settlements, search]);

  async function handlePayoutAction(settlementId: string, action: "process" | "mark_paid" | "fail") {
    setActionLoading(settlementId);
    try {
      const res = await fetch("/api/admin/settlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId, action }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(action === "process" ? "Payout initiated" : action === "mark_paid" ? "Marked as paid" : "Marked as failed");
        await fetchSettlements();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  function exportReport() {
    const header = ["Settlement", "Supplier", "Period Start", "Period End", "Gross Sales", "Commission", "Net Payout", "Currency", "Payout Method", "Status"];
    const lines = filtered.map((s) => [
      s.settlement_number, s.companies?.name || "", s.period_start, s.period_end,
      (s.gross_sales / 100).toFixed(2), (s.total_commission / 100).toFixed(2), (s.net_payout / 100).toFixed(2),
      s.currency, s.payout_method || "", s.status || "",
    ]);
    const csv = [header, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settlements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: "Pending Payouts", value: money(stats.totalPending, "USD"), icon: Clock, accent: "var(--warning)" },
    { label: "Commission This Month", value: money(stats.commissionThisMonth, "USD"), icon: TrendingUp, accent: "var(--success)" },
    { label: "Settlement Count", value: String(stats.settlementCount), icon: Landmark, accent: "var(--indigo)" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Financial Settlements
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Commission tracking and supplier payout management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSettlements} title="Refresh" className="p-2 rounded-xl transition-colors"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportReport} disabled={filtered.length === 0} className="btn-outline !py-2 !px-4 !text-sm">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="p-6 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}>
                <kpi.icon className="w-5 h-5" style={{ color: kpi.accent }} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{kpi.value}</p>
            <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 max-w-md" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search by supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-medium cursor-pointer outline-none"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>

      {/* Settlements Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
            <span className="ml-3 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading settlements...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <DollarSign className="w-12 h-12 mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No settlements found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Supplier", "Period", "Gross Sales", "Commission", "Net Payout", "Payout Method", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const status = statusMeta(s.status);
                  const StatusIcon = status.icon;
                  const payout = payoutMethodMeta(s.payout_method);
                  const PayoutIcon = payout.icon;
                  const isActioning = actionLoading === s.id;
                  const canProcess = s.status === "pending" || s.status === "ready" || s.status === "calculating";
                  const canRetry = s.status === "failed";

                  return (
                    <tr key={s.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-5 py-4">
                        <div>
                          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{s.companies?.name || "Unknown Supplier"}</span>
                          <br />
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{s.settlement_number}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {new Date(s.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(s.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{money(s.gross_sales, s.currency)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium" style={{ color: "var(--amber-dark)" }}>{money(s.total_commission, s.currency)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{money(s.net_payout, s.currency)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <PayoutIcon className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{payout.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {isActioning ? (
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--amber)" }} />
                          ) : (
                            <>
                              {canProcess && (
                                <button onClick={() => handlePayoutAction(s.id, "process")}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                  style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>
                                  Process Payout
                                </button>
                              )}
                              {canRetry && (
                                <button onClick={() => handlePayoutAction(s.id, "process")}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                  style={{ background: "color-mix(in srgb, var(--warning) 10%, transparent)", color: "var(--warning)" }}>
                                  Retry
                                </button>
                              )}
                            </>
                          )}
                          <Link href={`/admin/settlements/${s.id}`} className="p-1.5 rounded-lg transition-colors inline-flex items-center" style={{ color: "var(--text-tertiary)" }} title="View settlement">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary footer */}
        <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div className="flex gap-8">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>Total Gross (page)</span>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{money(filtered.reduce((a, s) => a + s.gross_sales, 0), "USD")}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>Total Commission (page)</span>
              <p className="text-sm font-bold" style={{ color: "var(--amber-dark)" }}>{money(filtered.reduce((a, s) => a + s.total_commission, 0), "USD")}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>Total Net Payouts (page)</span>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{money(filtered.reduce((a, s) => a + s.net_payout, 0), "USD")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{offset + 1}-{Math.min(offset + LIMIT, total)} of {total}</p>
            <div className="flex gap-1">
              <button onClick={() => setOffset((o) => Math.max(0, o - LIMIT))} disabled={offset === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: "var(--text-tertiary)" }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setOffset((o) => o + LIMIT)} disabled={offset + LIMIT >= total}
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ color: "var(--text-tertiary)" }}>
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
