"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  FileText,
  AlertTriangle,
  BarChart3,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Building2,
  ShoppingCart,
  CreditCard,
  Filter,
  Eye,
  Shield,
  Terminal,
  Flame,
  Bug,
  Zap,
  TrendingUp,
  Server,
  Wrench,
} from "lucide-react";
import {
  getSystemActivities,
  getSystemLogs,
  getErrorLogs,
  getSystemAnalytics,
  resolveError,
  type ActivityFilter,
  type LogFilter,
  type ErrorFilter,
} from "@/lib/actions/system-logs";
import { MaintenanceTab } from "./maintenance-tab";

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const tabs = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "activities", label: "Activities", icon: Activity },
  { id: "logs", label: "Logs", icon: Terminal },
  { id: "errors", label: "Errors", icon: AlertTriangle },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const activityColors: Record<string, string> = {
  user_login: "var(--indigo)",
  user_registered: "var(--success)",
  company_verified: "var(--success)",
  company_rejected: "var(--danger)",
  product_approved: "var(--success)",
  product_rejected: "var(--danger)",
  product_created: "var(--amber)",
  order_created: "var(--indigo)",
  order_status_changed: "var(--amber)",
  payment_received: "var(--success)",
  payment_failed: "var(--danger)",
  dispute_opened: "var(--danger)",
  dispute_resolved: "var(--success)",
  settlement_processed: "var(--amber)",
  admin_action: "var(--indigo)",
  system_event: "var(--text-tertiary)",
};

const severityConfig = {
  warning: { color: "var(--warning)", label: "Warning" },
  error: { color: "var(--danger)", label: "Error" },
  critical: { color: "#ef4444", label: "Critical" },
};

const logLevelConfig: Record<string, { color: string; bg: string }> = {
  debug: { color: "var(--text-tertiary)", bg: "var(--surface-secondary)" },
  info: { color: "var(--indigo)", bg: "color-mix(in srgb, var(--indigo) 10%, transparent)" },
  warn: { color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)" },
  error: { color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)" },
  fatal: { color: "#ef4444", bg: "color-mix(in srgb, #ef4444 15%, transparent)" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SuperAdminSystemPage() {
  const [activeTab, setActiveTab] = useState<TabId>("analytics");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5" style={{ color: "var(--amber)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--amber)" }}>
              Super Admin
            </span>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            System Monitor
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            View system activities, logs, error tracking and platform analytics
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: isActive ? "var(--surface-primary)" : "transparent",
                color: isActive ? "var(--amber)" : "var(--text-tertiary)",
                boxShadow: isActive ? "var(--shadow-sm)" : "none",
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "analytics" && <AnalyticsTab />}
      {activeTab === "maintenance" && <MaintenanceTab />}
      {activeTab === "activities" && <ActivitiesTab />}
      {activeTab === "logs" && <LogsTab />}
      {activeTab === "errors" && <ErrorsTab />}
    </div>
  );
}

/* ================================================================== */
/*  Analytics Tab                                                      */
/* ================================================================== */

function AnalyticsTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getSystemAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSystemAnalytics();
    setData(result);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <LoadingState />;
  }

  const kpis = [
    { label: "Total Users", value: data.totalUsers.toLocaleString(), icon: Users, color: "var(--indigo)" },
    { label: "Active Companies", value: data.totalCompanies.toLocaleString(), icon: Building2, color: "var(--amber)" },
    { label: "Active Orders", value: data.activeOrders.toLocaleString(), icon: ShoppingCart, color: "var(--success)" },
    { label: "Payments Today", value: data.paymentsToday.toLocaleString(), icon: CreditCard, color: "var(--amber)" },
  ];

  const systemHealth = [
    { label: "Activities Today", value: data.activitiesToday.toLocaleString(), sub: `${data.activitiesThisWeek.toLocaleString()} this week`, icon: Activity, color: "var(--indigo)" },
    { label: "Errors Today", value: data.errorsToday.toLocaleString(), sub: `${data.errorsThisWeek.toLocaleString()} this week`, icon: AlertTriangle, color: "var(--danger)" },
    { label: "Unresolved Errors", value: data.unresolvedErrors.toLocaleString(), sub: "needs attention", icon: Bug, color: data.unresolvedErrors > 0 ? "var(--danger)" : "var(--success)" },
    { label: "Payments This Week", value: data.paymentsThisWeek.toLocaleString(), sub: "successful", icon: Zap, color: "var(--success)" },
  ];

  return (
    <div className="space-y-6">
      {/* Platform KPIs */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
          Platform Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="p-5 rounded-2xl border"
              style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `color-mix(in srgb, ${kpi.color} 12%, transparent)` }}
                >
                  <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {kpi.value}
              </p>
              <p className="text-xs font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
          System Health
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemHealth.map((item) => (
            <div
              key={item.label}
              className="p-5 rounded-2xl border"
              style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}
                >
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>{item.label}</p>
              </div>
              <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {item.value}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Log Level + Top Error Sources */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Log Level Distribution */}
        <div
          className="p-6 rounded-2xl border"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <h2
            className="text-lg font-bold mb-5"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Log Level Distribution
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Last 7 days</p>
          <div className="space-y-3">
            {Object.entries(data.logLevelDistribution).map(([level, count]) => {
              const total = Object.values(data.logLevelDistribution).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              const cfg = logLevelConfig[level] ?? logLevelConfig.info;
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-12 uppercase" style={{ color: cfg.color }}>{level}</span>
                  <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: "var(--surface-secondary)" }}>
                    <div
                      className="h-full rounded-lg flex items-center px-2 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%`, background: cfg.bg }}
                    >
                      <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{count}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono w-12 text-right" style={{ color: "var(--text-tertiary)" }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Error Sources */}
        <div
          className="p-6 rounded-2xl border"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <h2
            className="text-lg font-bold mb-5"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Top Error Sources
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Last 7 days</p>
          {data.topErrorSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="w-10 h-10 mb-3" style={{ color: "var(--success)", opacity: 0.4 }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>No errors recorded</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.topErrorSources.map((src) => (
                <div key={src.source} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "var(--surface-secondary)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Server className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--danger)" }} />
                    <span className="text-sm font-mono truncate" style={{ color: "var(--text-primary)" }}>{src.source}</span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2"
                    style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
                  >
                    {src.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Activities Tab                                                     */
/* ================================================================== */

function ActivitiesTab() {
  const [data, setData] = useState<{ data: Record<string, unknown>[]; count: number }>({ data: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActivityFilter>({ page: 1, pageSize: 30 });
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSystemActivities(filters);
    setData({ data: result.data as Record<string, unknown>[], count: result.count });
    setLoading(false);
  }, [filters]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(data.count / (filters.pageSize ?? 30));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
        style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Filter className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <select
            className="bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            value={filters.activityType ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, activityType: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All Activities</option>
            <option value="user_login">User Login</option>
            <option value="user_registered">User Registered</option>
            <option value="company_verified">Company Verified</option>
            <option value="product_created">Product Created</option>
            <option value="product_approved">Product Approved</option>
            <option value="order_created">Order Created</option>
            <option value="payment_received">Payment Received</option>
            <option value="payment_failed">Payment Failed</option>
            <option value="dispute_opened">Dispute Opened</option>
            <option value="dispute_resolved">Dispute Resolved</option>
            <option value="admin_action">Admin Action</option>
            <option value="system_event">System Event</option>
          </select>
        </div>
        <select
          className="bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
          value={filters.targetType ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, targetType: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Targets</option>
          <option value="user">User</option>
          <option value="company">Company</option>
          <option value="product">Product</option>
          <option value="order">Order</option>
          <option value="payment">Payment</option>
          <option value="dispute">Dispute</option>
          <option value="shipment">Shipment</option>
        </select>
        <button
          onClick={load}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: "var(--text-tertiary)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
          {data.count.toLocaleString()} activities found
        </p>
      </div>

      {/* Activity List */}
      {loading ? (
        <LoadingState />
      ) : data.data.length === 0 ? (
        <EmptyState message="No activities recorded yet" />
      ) : (
        <div className="space-y-2">
          {data.data.map((item) => {
            const actType = item.activity_type as string;
            const color = activityColors[actType] ?? "var(--text-tertiary)";
            return (
              <div
                key={item.id as string}
                className="flex items-start gap-4 p-4 rounded-xl border transition-colors"
                style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                >
                  <Activity className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                      style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
                    >
                      {(actType as string).replace(/_/g, " ")}
                    </span>
                    {item.target_label ? (
                      <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {String(item.target_label)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>
                    {item.description as string}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    {item.actor_email ? (
                      <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        by {String(item.actor_email)}
                      </span>
                    ) : null}
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                      <Clock className="w-3 h-3" />
                      {relativeTime(String(item.created_at))}
                    </span>
                    {item.ip_address ? (
                      <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {String(item.ip_address)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={filters.page ?? 1} totalPages={totalPages} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
    </div>
  );
}

/* ================================================================== */
/*  Logs Tab                                                           */
/* ================================================================== */

function LogsTab() {
  const [data, setData] = useState<{ data: Record<string, unknown>[]; count: number }>({ data: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LogFilter>({ page: 1, pageSize: 50 });
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSystemLogs(filters);
    setData({ data: result.data as Record<string, unknown>[], count: result.count });
    setLoading(false);
  }, [filters]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(data.count / (filters.pageSize ?? 50));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
        style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-1.5 rounded-lg" style={{ background: "var(--surface-secondary)" }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search logs..."
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: "var(--text-primary)" }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
              }
            }}
          />
        </div>
        <select
          className="bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
          value={filters.level ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Levels</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="fatal">Fatal</option>
        </select>
        <button
          onClick={load}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: "var(--text-tertiary)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
        {data.count.toLocaleString()} log entries
      </p>

      {/* Log Table */}
      {loading ? (
        <LoadingState />
      ) : data.data.length === 0 ? (
        <EmptyState message="No log entries found" />
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-secondary)" }}>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Level</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Timestamp</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Source</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Message</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Request ID</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => {
                  const lvl = log.level as string;
                  const cfg = logLevelConfig[lvl] ?? logLevelConfig.info;
                  return (
                    <tr key={log.id as string} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                      <td className="px-4 py-3">
                        <span
                          className="text-[11px] font-bold uppercase px-2 py-0.5 rounded"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {lvl}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>
                        {formatDate(log.created_at as string)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {log.source as string}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-md truncate" style={{ color: "var(--text-primary)" }}>
                        {log.message as string}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {(log.request_id as string) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={filters.page ?? 1} totalPages={totalPages} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
    </div>
  );
}

/* ================================================================== */
/*  Errors Tab                                                         */
/* ================================================================== */

function ErrorsTab() {
  const [data, setData] = useState<{ data: Record<string, unknown>[]; count: number }>({ data: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ErrorFilter>({ page: 1, pageSize: 30, resolved: null });
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getErrorLogs(filters);
    setData({ data: result.data as Record<string, unknown>[], count: result.count });
    setLoading(false);
  }, [filters]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(data.count / (filters.pageSize ?? 30));

  async function handleResolve(errorId: string) {
    await resolveError(errorId, "current-user");
    load();
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
        style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-1.5 rounded-lg" style={{ background: "var(--surface-secondary)" }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search errors..."
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: "var(--text-primary)" }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
              }
            }}
          />
        </div>
        <select
          className="bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
          value={filters.severity ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Severities</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
        <select
          className="bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
          value={filters.resolved === null ? "" : filters.resolved ? "true" : "false"}
          onChange={(e) => {
            const val = e.target.value;
            setFilters((f) => ({ ...f, resolved: val === "" ? null : val === "true", page: 1 }));
          }}
        >
          <option value="">All Status</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>
        <button
          onClick={load}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: "var(--text-tertiary)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
        {data.count.toLocaleString()} errors found
      </p>

      {/* Error List */}
      {loading ? (
        <LoadingState />
      ) : data.data.length === 0 ? (
        <EmptyState message="No errors found" />
      ) : (
        <div className="space-y-2">
          {data.data.map((err) => {
            const sev = err.severity as "warning" | "error" | "critical";
            const cfg = severityConfig[sev] ?? severityConfig.error;
            const isExpanded = expandedId === (err.id as string);
            const isResolved = err.resolved as boolean;

            return (
              <div
                key={err.id as string}
                className="rounded-xl border overflow-hidden"
                style={{ background: "var(--surface-primary)", borderColor: isResolved ? "var(--border-subtle)" : `color-mix(in srgb, ${cfg.color} 30%, var(--border-subtle))` }}
              >
                <div className="flex items-start gap-4 p-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `color-mix(in srgb, ${cfg.color} 12%, transparent)` }}
                  >
                    {sev === "critical" ? (
                      <Flame className="w-4 h-4" style={{ color: cfg.color }} />
                    ) : sev === "error" ? (
                      <XCircle className="w-4 h-4" style={{ color: cfg.color }} />
                    ) : (
                      <AlertTriangle className="w-4 h-4" style={{ color: cfg.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                        style={{ background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      {err.error_code ? (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>
                          {String(err.error_code)}
                        </span>
                      ) : null}
                      {isResolved && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", color: "var(--success)" }}>
                          Resolved
                        </span>
                      )}
                      <span className="text-xs font-mono ml-auto" style={{ color: "var(--text-tertiary)" }}>
                        {err.source as string}
                      </span>
                    </div>
                    <p className="text-sm mt-1.5" style={{ color: "var(--text-primary)" }}>
                      {err.message as string}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                        <Clock className="w-3 h-3" />
                        {relativeTime(err.created_at as string)}
                      </span>
                      {err.request_id ? (
                        <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                          req:{String(err.request_id).slice(0, 8)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isResolved && (
                      <button
                        onClick={() => handleResolve(err.id as string)}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", color: "var(--success)" }}
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : (err.id as string))}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div
                      className="p-4 rounded-lg space-y-3"
                      style={{ background: "var(--surface-secondary)" }}
                    >
                      {err.stack_trace ? (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>Stack Trace</p>
                          <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-3 rounded-lg max-h-48 overflow-y-auto" style={{ background: "var(--obsidian)", color: "var(--ivory)" }}>
                            {String(err.stack_trace)}
                          </pre>
                        </div>
                      ) : null}
                      {err.metadata && Object.keys(err.metadata as Record<string, unknown>).length > 0 ? (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>Metadata</p>
                          <pre className="text-xs font-mono whitespace-pre-wrap p-3 rounded-lg" style={{ background: "var(--obsidian)", color: "var(--ivory)" }}>
                            {JSON.stringify(err.metadata, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                      {isResolved && err.resolution_note ? (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>Resolution Note</p>
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{String(err.resolution_note)}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={filters.page ?? 1} totalPages={totalPages} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
    </div>
  );
}


/* ================================================================== */
/*  Shared Components                                                  */
/* ================================================================== */

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="p-2 rounded-lg transition-colors disabled:opacity-30"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-medium px-3" style={{ color: "var(--text-secondary)" }}>
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="p-2 rounded-lg transition-colors disabled:opacity-30"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <RefreshCw className="w-8 h-8 animate-spin mb-3" style={{ color: "var(--amber)", opacity: 0.5 }} />
      <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>Loading...</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-xl border"
      style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
    >
      <FileText className="w-10 h-10 mb-3" style={{ color: "var(--text-tertiary)", opacity: 0.3 }} />
      <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>{message}</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
        Data will appear here once the system starts logging
      </p>
    </div>
  );
}
