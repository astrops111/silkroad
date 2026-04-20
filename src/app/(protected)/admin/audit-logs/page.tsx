"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ScrollText,
  Shield,
  Activity,
  AlertTriangle,
  Clock,
  User,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdminLog {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action_type: string;
  target_entity: string | null;
  target_id: string | null;
  target_label: string | null;
  reason: string | null;
  requires_approval: boolean;
  approval_status: string | null;
  ip_address: string | null;
  created_at: string;
}

interface SystemLog {
  id: string;
  activity_type: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

interface Stats {
  adminActionsThisWeek: number;
  systemEventsThisWeek: number;
  unresolvedErrors: number;
}

type Tab = "admin" | "system";

const ACTION_COLORS: Record<string, string> = {
  product_approved: "var(--success)",
  product_rejected: "var(--danger)",
  supplier_verified: "var(--success)",
  supplier_suspended: "var(--danger)",
  dispute_resolved: "var(--amber)",
  settlement_processed: "var(--indigo)",
  order_cancelled: "var(--danger)",
  feature_toggled: "var(--amber)",
  user_login: "var(--text-tertiary)",
  order_created: "var(--success)",
  rfq_published: "var(--indigo)",
  admin_action: "var(--terracotta)",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AuditLogsPage() {
  const [tab, setTab] = useState<Tab>("admin");
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalAdmin, setTotalAdmin] = useState(0);
  const [totalSystem, setTotalSystem] = useState(0);
  const [filterAction, setFilterAction] = useState("");
  const pageSize = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: tab,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filterAction) params.set("actionType", filterAction);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();

      if (tab === "admin") {
        setAdminLogs(data.adminLogs || []);
        setTotalAdmin(data.adminTotal || 0);
      } else {
        setSystemLogs(data.systemLogs || []);
        setTotalSystem(data.systemTotal || 0);
      }
      setStats(data.stats || null);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [tab, page, filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(
    (tab === "admin" ? totalAdmin : totalSystem) / pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Audit Logs
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Track all admin actions and system events across the platform
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Admin Actions (7d)", value: stats.adminActionsThisWeek, icon: Shield, color: "var(--indigo)" },
            { label: "System Events (7d)", value: stats.systemEventsThisWeek, icon: Activity, color: "var(--success)" },
            { label: "Unresolved Errors", value: stats.unresolvedErrors, icon: AlertTriangle, color: stats.unresolvedErrors > 0 ? "var(--danger)" : "var(--text-tertiary)" },
          ].map((s) => (
            <div key={s.label} className="p-5 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <s.icon className="w-4 h-4 mb-2" style={{ color: s.color }} />
              <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{s.value}</p>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Filter */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface-tertiary)" }}>
          {[
            { id: "admin" as Tab, label: "Admin Actions", icon: Shield },
            { id: "system" as Tab, label: "System Events", icon: Activity },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? "var(--surface-primary)" : "transparent",
                color: tab === t.id ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: tab === t.id ? "var(--shadow-sm)" : "none",
              }}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            placeholder="Filter by action type..."
            className="px-3 py-2 rounded-lg text-xs w-48"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-tertiary)" }} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {(tab === "admin"
                    ? ["Time", "Admin", "Action", "Target", "Reason", "Status"]
                    : ["Time", "Type", "Target", "Description", "IP"]
                  ).map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tab === "admin" ? (
                  adminLogs.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>No audit logs found</td></tr>
                  ) : adminLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="px-5 py-3">
                        <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{log.admin_email || log.admin_id.slice(0, 8)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            background: `color-mix(in srgb, ${ACTION_COLORS[log.action_type] || "var(--text-tertiary)"} 10%, transparent)`,
                            color: ACTION_COLORS[log.action_type] || "var(--text-tertiary)",
                          }}
                        >
                          {log.action_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{log.target_label || log.target_entity || "—"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs truncate max-w-[150px] block" style={{ color: "var(--text-tertiary)" }}>{log.reason || "—"}</span>
                      </td>
                      <td className="px-5 py-3">
                        {log.requires_approval ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{
                            background: log.approval_status === "approved" ? "color-mix(in srgb, var(--success) 10%, transparent)" : "color-mix(in srgb, var(--warning) 10%, transparent)",
                            color: log.approval_status === "approved" ? "var(--success)" : "var(--warning)",
                          }}>
                            {log.approval_status || "pending"}
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>auto</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  systemLogs.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>No system events found</td></tr>
                  ) : systemLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="px-5 py-3">
                        <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            background: `color-mix(in srgb, ${ACTION_COLORS[log.activity_type] || "var(--text-tertiary)"} 10%, transparent)`,
                            color: ACTION_COLORS[log.activity_type] || "var(--text-tertiary)",
                          }}
                        >
                          {log.activity_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{log.target_label || log.target_type || "—"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs truncate max-w-[200px] block" style={{ color: "var(--text-tertiary)" }}>{log.description || "—"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>{log.ip_address || "—"}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg"
                style={{ color: page === 1 ? "var(--text-tertiary)" : "var(--text-primary)" }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg"
                style={{ color: page === totalPages ? "var(--text-tertiary)" : "var(--text-primary)" }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
