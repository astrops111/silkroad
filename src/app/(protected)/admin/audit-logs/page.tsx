"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Activity,
  AlertTriangle,
  Mail,
  Clock,
  Bot,
  CheckCircle2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
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

interface ErrorLog {
  id: string;
  error_code: string | null;
  message: string;
  source: string;
  severity: string;
  resolved: boolean;
  created_at: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface JobLog {
  id: string;
  job_name: string;
  job_type: string | null;
  status: string;
  duration_ms: number | null;
  rows_affected: number | null;
  error_message: string | null;
  created_at: string;
}

interface AiLog {
  id: string;
  skill_id: string;
  status: string;
  actions_taken: { action: string; detail: string }[] | null;
  error_message: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
  email_skills: { name: string } | null;
}

interface Stats {
  adminActionsThisWeek: number;
  systemEventsThisWeek: number;
  unresolvedErrors: number;
}

type Tab = "admin" | "system" | "errors" | "email" | "jobs" | "ai";

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

const STATUS_COLORS: Record<string, string> = {
  sent: "var(--success)",
  delivered: "var(--success)",
  success: "var(--success)",
  succeeded: "var(--success)",
  pending: "var(--amber)",
  running: "var(--amber)",
  partial: "var(--amber)",
  failed: "var(--danger)",
  bounced: "var(--danger)",
  timeout: "var(--danger)",
  complained: "var(--danger)",
  warning: "var(--amber)",
  error: "var(--danger)",
  critical: "var(--danger)",
};

const TABS: { id: Tab; label: string; icon: typeof Shield; filterHint: string }[] = [
  { id: "admin", label: "Admin Actions", icon: Shield, filterHint: "Filter by action type..." },
  { id: "system", label: "System Events", icon: Activity, filterHint: "Filter by activity type..." },
  { id: "errors", label: "Errors", icon: AlertTriangle, filterHint: "Filter by severity (warning/error/critical)" },
  { id: "email", label: "Email Delivery", icon: Mail, filterHint: "Filter by status (sent/failed/bounced)" },
  { id: "jobs", label: "Job Runs", icon: Clock, filterHint: "Filter by job name..." },
  { id: "ai", label: "AI Runs", icon: Bot, filterHint: "Filter by status (succeeded/failed)" },
];

function StatusBadge({ value }: { value: string }) {
  const color = STATUS_COLORS[value] || "var(--text-tertiary)";
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

function TimeCell({ iso }: { iso: string }) {
  return (
    <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
      {new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AuditLogsPage() {
  const [tab, setTab] = useState<Tab>("admin");
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [jobLogs, setJobLogs] = useState<JobLog[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState("");
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
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
      if (tab === "errors" && unresolvedOnly) params.set("resolved", "false");

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();

      switch (tab) {
        case "admin":
          setAdminLogs(data.adminLogs || []);
          setTotal(data.adminTotal || 0);
          break;
        case "system":
          setSystemLogs(data.systemLogs || []);
          setTotal(data.systemTotal || 0);
          break;
        case "errors":
          setErrorLogs(data.errorLogs || []);
          setTotal(data.errorTotal || 0);
          break;
        case "email":
          setEmailLogs(data.emailLogs || []);
          setTotal(data.emailTotal || 0);
          break;
        case "jobs":
          setJobLogs(data.jobLogs || []);
          setTotal(data.jobTotal || 0);
          break;
        case "ai":
          setAiLogs(data.aiLogs || []);
          setTotal(data.aiTotal || 0);
          break;
      }
      setStats(data.stats || null);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [tab, page, filterAction, unresolvedOnly]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function toggleResolved(log: ErrorLog) {
    const res = await fetch("/api/admin/audit-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errorId: log.id, resolved: !log.resolved }),
    });
    if (res.ok) {
      setErrorLogs((prev) =>
        prev.map((l) => (l.id === log.id ? { ...l, resolved: !log.resolved } : l))
      );
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const activeTab = TABS.find((t) => t.id === tab)!;

  const headers: Record<Tab, string[]> = {
    admin: ["Time", "Admin", "Action", "Target", "Reason", "Status"],
    system: ["Time", "Type", "Target", "Description", "IP"],
    errors: ["Time", "Severity", "Source", "Code", "Message", "Resolved"],
    email: ["Time", "Recipient", "Subject", "Template", "Status", "Error"],
    jobs: ["Time", "Job", "Status", "Duration", "Rows", "Error"],
    ai: ["Time", "Skill", "Status", "Actions", "Tokens", "Error"],
  };

  const emptyMessages: Record<Tab, string> = {
    admin: "No audit logs found",
    system: "No system events found",
    errors: "No errors logged",
    email: "No email deliveries logged",
    jobs: "No job runs recorded",
    ai: "No AI skill runs recorded",
  };

  const rowCount =
    tab === "admin" ? adminLogs.length
    : tab === "system" ? systemLogs.length
    : tab === "errors" ? errorLogs.length
    : tab === "email" ? emailLogs.length
    : tab === "jobs" ? jobLogs.length
    : aiLogs.length;

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
          Admin actions, system events, errors, email delivery, job runs and AI runs — one place
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: "var(--surface-tertiary)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1); setFilterAction(""); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
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
          {tab === "errors" && (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={unresolvedOnly}
                onChange={(e) => { setUnresolvedOnly(e.target.checked); setPage(1); }}
                className="w-3.5 h-3.5 rounded"
              />
              Unresolved only
            </label>
          )}
          <input
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            placeholder={activeTab.filterHint}
            className="px-3 py-2 rounded-lg text-xs w-56"
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
                  {headers[tab].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowCount === 0 && (
                  <tr>
                    <td colSpan={headers[tab].length} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                      {emptyMessages[tab]}
                    </td>
                  </tr>
                )}

                {tab === "admin" && adminLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-5 py-3"><TimeCell iso={log.created_at} /></td>
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
                        <StatusBadge value={log.approval_status || "pending"} />
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>auto</span>
                      )}
                    </td>
                  </tr>
                ))}

                {tab === "system" && systemLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-5 py-3"><TimeCell iso={log.created_at} /></td>
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
                ))}

                {tab === "errors" && errorLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-5 py-3"><TimeCell iso={log.created_at} /></td>
                    <td className="px-5 py-3"><StatusBadge value={log.severity} /></td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{log.source}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>{log.error_code || "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs truncate max-w-[280px] block" style={{ color: "var(--text-secondary)" }} title={log.message}>{log.message}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleResolved(log)}
                        className="flex items-center gap-1 text-[11px] font-medium"
                        style={{ color: log.resolved ? "var(--success)" : "var(--text-tertiary)" }}
                        title={log.resolved ? "Mark unresolved" : "Mark resolved"}
                      >
                        {log.resolved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        {log.resolved ? "Resolved" : "Resolve"}
                      </button>
                    </td>
                  </tr>
                ))}

                {tab === "email" && emailLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-5 py-3"><TimeCell iso={log.created_at} /></td>
                    <td className="px-5 py-3">
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{log.recipient_email}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs truncate max-w-[220px] block" style={{ color: "var(--text-secondary)" }} title={log.subject}>{log.subject}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>{log.template || "—"}</span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge value={log.status} /></td>
                    <td className="px-5 py-3">
                      <span className="text-xs truncate max-w-[160px] block" style={{ color: "var(--danger)" }}>{log.error_message || ""}</span>
                    </td>
                  </tr>
                ))}

                {tab === "jobs" && jobLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-5 py-3"><TimeCell iso={log.created_at} /></td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{log.job_name}</span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge value={log.status} /></td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{log.rows_affected ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs truncate max-w-[200px] block" style={{ color: "var(--danger)" }} title={log.error_message ?? undefined}>{log.error_message || ""}</span>
                    </td>
                  </tr>
                ))}

                {tab === "ai" && aiLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-5 py-3"><TimeCell iso={log.created_at} /></td>
                    <td className="px-5 py-3">
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{log.email_skills?.name ?? log.skill_id.slice(0, 8)}</span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge value={log.status} /></td>
                    <td className="px-5 py-3">
                      <span className="text-xs truncate max-w-[200px] block" style={{ color: "var(--text-secondary)" }}>
                        {(log.actions_taken ?? []).map((a) => a.action).join(", ") || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {log.input_tokens != null ? `${log.input_tokens}/${log.output_tokens ?? 0}` : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs truncate max-w-[180px] block" style={{ color: "var(--danger)" }} title={log.error_message ?? undefined}>{log.error_message || ""}</span>
                    </td>
                  </tr>
                ))}
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
