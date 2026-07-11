"use client";

import { useCallback, useEffect, useState } from "react";
import { Ticket, Send, RefreshCw, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketRow {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  source: string;
  requester_email: string | null;
  sla_due_at: string | null;
  first_response_at: string | null;
  created_at: string;
  ai_triage: { intent?: string; summary?: string } | null;
  companies: { id: string; name: string } | null;
  assignee: { id: string; full_name: string | null } | null;
}

interface TicketDetail {
  ticket: TicketRow & { deal_thread_id: string | null };
  events: {
    id: string;
    event_type: string;
    payload: Record<string, unknown>;
    created_at: string;
    user_profiles: { full_name: string | null } | null;
  }[];
  emailMessages: {
    id: string;
    direction: string;
    from_address: string;
    text_body: string | null;
    snippet: string | null;
    sent_at: string | null;
  }[];
}

const STATUS_TONE: Record<string, string> = {
  open: "bg-red-50 text-red-600 border-red-200",
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-600 border-emerald-200",
  closed: "bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] border-[var(--border-subtle)]",
};

const PRIORITY_TONE: Record<string, string> = {
  urgent: "text-red-600 font-bold",
  high: "text-amber-600 font-semibold",
  normal: "text-[var(--text-secondary)]",
  low: "text-[var(--text-tertiary)]",
};

const inputCls =
  "text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)]";

export function TicketsClient() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/tickets?${params}`);
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openTicket(id: string) {
    const res = await fetch(`/api/admin/tickets/${id}`);
    const data = await res.json();
    if (!data.error) setDetail(data);
  }

  async function updateTicket(id: string, patch: Record<string, unknown>) {
    await fetch("/api/admin/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    void load();
    if (detail?.ticket.id === id) void openTicket(id);
  }

  async function sendReply() {
    if (!detail || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${detail.ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Reply failed");
      else {
        setReply("");
        void openTicket(detail.ticket.id);
        void load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-11rem)]">
      {/* Queue */}
      <div className="w-[420px] shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <select
            className={`${inputCls} flex-1`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => void openTicket(t.id)}
              className={`w-full text-left px-3 py-3 transition-colors ${
                detail?.ticket.id === t.id
                  ? "bg-[var(--surface-secondary)]"
                  : "hover:bg-[var(--surface-secondary)]/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-[var(--text-tertiary)]">
                  {t.ticket_number}
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_TONE[t.status] ?? ""}`}
                >
                  {t.status}
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
                {t.subject}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-[var(--text-tertiary)] truncate">
                  {t.requester_email ?? t.companies?.name ?? "—"}
                </p>
                <span className={`text-[11px] uppercase ${PRIORITY_TONE[t.priority] ?? ""}`}>
                  {t.priority}
                </span>
              </div>
            </button>
          ))}
          {!loading && tickets.length === 0 && (
            <div className="p-8 text-center">
              <Ticket className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-2" />
              <p className="text-xs text-[var(--text-tertiary)]">No tickets</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-y-auto">
        {detail ? (
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {detail.ticket.subject}
                </h2>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  {detail.ticket.ticket_number} · {detail.ticket.source} ·{" "}
                  {detail.ticket.requester_email ?? "no email"} · opened{" "}
                  {new Date(detail.ticket.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  className={inputCls}
                  value={detail.ticket.status}
                  onChange={(e) => void updateTicket(detail.ticket.id, { status: e.target.value })}
                >
                  {["open", "pending", "resolved", "closed"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  className={inputCls}
                  value={detail.ticket.priority}
                  onChange={(e) => void updateTicket(detail.ticket.id, { priority: e.target.value })}
                >
                  {["low", "normal", "high", "urgent"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {detail.ticket.ai_triage?.summary && (
              <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2 text-xs text-purple-800 flex items-start gap-2">
                <Bot className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>AI triage:</strong> {detail.ticket.ai_triage.summary}
                  {detail.ticket.ai_triage.intent && ` (intent: ${detail.ticket.ai_triage.intent})`}
                </span>
              </div>
            )}

            {/* Email conversation */}
            <div className="space-y-2">
              {detail.emailMessages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg border p-3 ${
                    m.direction === "outbound"
                      ? "border-[var(--amber)]/30 bg-[var(--amber)]/5"
                      : "border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
                  }`}
                >
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">
                    {m.direction === "outbound" ? "→" : "←"} {m.from_address} ·{" "}
                    {m.sent_at ? new Date(m.sent_at).toLocaleString() : ""}
                  </p>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                    {(m.text_body ?? m.snippet ?? "").slice(0, 2000)}
                  </p>
                </div>
              ))}
            </div>

            {/* Reply */}
            {detail.ticket.requester_email && (
              <div className="space-y-2">
                {error && <p className="text-xs text-red-600">{error}</p>}
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder={`Reply to ${detail.ticket.requester_email}…`}
                  className={`${inputCls} w-full resize-none`}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => void sendReply()} disabled={busy || !reply.trim()}>
                    {busy ? "Sending…" : (<><Send className="w-3.5 h-3.5" /> Send reply</>)}
                  </Button>
                </div>
              </div>
            )}

            {/* Event log */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                Event log
              </h3>
              {detail.events.map((e) => (
                <p key={e.id} className="text-xs text-[var(--text-secondary)] py-0.5">
                  <span className="font-medium">{e.event_type}</span>
                  {e.user_profiles?.full_name ? ` · ${e.user_profiles.full_name}` : ""} ·{" "}
                  {new Date(e.created_at).toLocaleString()}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[var(--text-tertiary)]">Select a ticket</p>
          </div>
        )}
      </div>
    </div>
  );
}
