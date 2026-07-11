"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Inbox,
  RefreshCw,
  Search,
  Send,
  Reply,
  PenSquare,
  Paperclip,
  X,
  Users,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Mailbox {
  id: string;
  address: string;
  display_name: string;
  mailbox_type: string;
  is_active: boolean;
  myPermission: "read" | "send" | "manage" | null;
}

interface ThreadListItem {
  id: string;
  mailbox_id: string;
  subject_normalized: string | null;
  last_message_at: string | null;
  message_count: number;
  unreadCount: number;
  latestMessage: {
    from_address: string;
    from_name: string | null;
    subject: string | null;
    snippet: string | null;
    direction: string;
    sent_at: string | null;
  } | null;
}

interface Attachment {
  id: string;
  filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
}

interface Message {
  id: string;
  direction: string;
  message_id: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[] | null;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  is_read: boolean;
  sent_at: string | null;
  email_attachments: Attachment[];
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function MailClient() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sendForm, setSendForm] = useState({ to: "", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const currentMailbox = mailboxes.find((m) => m.id === selectedMailbox) ?? null;
  const canSend =
    currentMailbox?.myPermission === "send" || currentMailbox?.myPermission === "manage";

  const [processedTick, setProcessedTick] = useState(0);

  useEffect(() => {
    fetch("/api/admin/mail/mailboxes")
      .then((r) => r.json())
      .then((data) => {
        const boxes: Mailbox[] = data.mailboxes ?? [];
        setMailboxes(boxes);
        if (boxes.length > 0) setSelectedMailbox(boxes[0].id);
      })
      .catch(() => {});
  }, []);

  // Crons are paused by choice — opening the mail section triggers one
  // queue pass (IMAP sync + AI skills + due sequences; freshness-guarded
  // server-side). Fire-and-forget; refresh the list if mail arrived.
  useEffect(() => {
    fetch("/api/admin/mail/process", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if ((data?.fetched ?? 0) > 0) setProcessedTick((t) => t + 1);
      })
      .catch(() => {});
  }, []);

  const loadThreads = useCallback(async () => {
    if (!selectedMailbox) return;
    setThreadsLoading(true);
    try {
      const params = new URLSearchParams({ mailboxId: selectedMailbox });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/mail/threads?${params}`);
      const data = await res.json();
      setThreads(data.threads ?? []);
    } finally {
      setThreadsLoading(false);
    }
  }, [selectedMailbox, search]);

  useEffect(() => {
    setSelectedThread(null);
    setMessages([]);
    void loadThreads();
  }, [loadThreads]);

  // New mail arrived from the on-load pass — refresh the list without
  // deselecting whatever thread the admin is reading.
  useEffect(() => {
    if (processedTick > 0) void loadThreads();
  }, [processedTick, loadThreads]);

  async function openThread(threadId: string) {
    setSelectedThread(threadId);
    setReplyTo(null);
    setComposeOpen(false);
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/admin/mail/threads/${threadId}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
      // Mark read + clear badge locally
      void fetch(`/api/admin/mail/threads/${threadId}`, { method: "PATCH" });
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
      );
    } finally {
      setMessagesLoading(false);
    }
  }

  function startReply(message: Message) {
    setReplyTo(message);
    setComposeOpen(true);
    setSendForm({
      to: message.direction === "inbound" ? message.from_address : message.to_addresses.join(", "),
      subject: message.subject?.startsWith("Re:") ? message.subject : `Re: ${message.subject ?? ""}`,
      body: "",
    });
  }

  function startCompose() {
    setReplyTo(null);
    setComposeOpen(true);
    setSendForm({ to: "", subject: "", body: "" });
  }

  async function handleSend() {
    if (!selectedMailbox) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/admin/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxId: selectedMailbox,
          to: sendForm.to.split(",").map((s) => s.trim()).filter(Boolean),
          subject: sendForm.subject,
          html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${sendForm.body
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</div>`,
          text: sendForm.body,
          ...(replyTo?.message_id && {
            inReplyTo: replyTo.message_id,
            references: [replyTo.message_id],
          }),
          ...(replyTo && selectedThread && { threadId: selectedThread }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? "Send failed");
      } else {
        setComposeOpen(false);
        setReplyTo(null);
        if (selectedThread && replyTo) void openThread(selectedThread);
        void loadThreads();
      }
    } catch {
      setSendError("Network error");
    } finally {
      setSending(false);
    }
  }

  async function downloadAttachment(att: Attachment) {
    const res = await fetch(`/api/admin/mail/attachments/${att.id}`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      {/* Pane 1 — mailboxes */}
      <div className="w-56 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-secondary)] flex flex-col">
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <Button size="sm" className="w-full" onClick={startCompose} disabled={!canSend}>
            <PenSquare className="w-3.5 h-3.5" />
            Compose
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {mailboxes.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMailbox(m.id)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                selectedMailbox === m.id
                  ? "bg-[var(--surface-primary)] text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)]/60"
              }`}
            >
              {m.mailbox_type === "personal" ? (
                <UserCircle2 className="w-4 h-4 shrink-0 text-[var(--text-tertiary)]" />
              ) : (
                <Users className="w-4 h-4 shrink-0 text-[var(--text-tertiary)]" />
              )}
              <span className="truncate">{m.address}</span>
            </button>
          ))}
          {mailboxes.length === 0 && (
            <p className="px-3 py-4 text-xs text-[var(--text-tertiary)]">
              No accessible mailboxes. Ask a super admin for access.
            </p>
          )}
        </div>
      </div>

      {/* Pane 2 — thread list */}
      <div className="w-80 shrink-0 border-r border-[var(--border-subtle)] flex flex-col">
        <div className="p-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject…"
              className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)]"
            />
          </div>
          <button
            onClick={() => void loadThreads()}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${threadsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => void openThread(t.id)}
              className={`w-full text-left px-3 py-3 transition-colors ${
                selectedThread === t.id
                  ? "bg-[var(--surface-secondary)]"
                  : "hover:bg-[var(--surface-secondary)]/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm truncate ${
                    t.unreadCount > 0
                      ? "font-semibold text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {t.latestMessage?.from_name || t.latestMessage?.from_address || "—"}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)] shrink-0">
                  {formatTime(t.last_message_at)}
                </span>
              </div>
              <p className="text-xs truncate mt-0.5 text-[var(--text-secondary)]">
                {t.latestMessage?.subject || t.subject_normalized || "(no subject)"}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[11px] truncate text-[var(--text-tertiary)]">
                  {t.latestMessage?.snippet ?? ""}
                </p>
                {t.unreadCount > 0 && (
                  <span className="ml-2 shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--amber)] text-[var(--obsidian)] text-[10px] font-bold flex items-center justify-center">
                    {t.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
          {!threadsLoading && threads.length === 0 && (
            <div className="p-8 text-center">
              <Inbox className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-2" />
              <p className="text-xs text-[var(--text-tertiary)]">No threads yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Pane 3 — thread view / composer */}
      <div className="flex-1 flex flex-col min-w-0">
        {composeOpen ? (
          <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {replyTo ? "Reply" : "New message"} — from {currentMailbox?.address}
              </h2>
              <button
                onClick={() => setComposeOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              value={sendForm.to}
              onChange={(e) => setSendForm((f) => ({ ...f, to: e.target.value }))}
              placeholder="To (comma-separated)"
              className="text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)]"
            />
            <input
              value={sendForm.subject}
              onChange={(e) => setSendForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Subject"
              className="text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)]"
            />
            <textarea
              value={sendForm.body}
              onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Write your message…"
              rows={12}
              className="flex-1 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)]"
            />
            {sendError && <p className="text-xs text-red-600">{sendError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setComposeOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSend()}
                disabled={sending || !sendForm.to || !sendForm.subject || !sendForm.body}
              >
                {sending ? "Sending…" : (<><Send className="w-3.5 h-3.5" /> Send</>)}
              </Button>
            </div>
          </div>
        ) : selectedThread ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messagesLoading && (
              <p className="text-xs text-[var(--text-tertiary)]">Loading…</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border p-4 ${
                  m.direction === "outbound"
                    ? "border-[var(--amber)]/30 bg-[var(--amber)]/5"
                    : "border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {m.from_name || m.from_address}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-2">
                      to {m.to_addresses.join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {m.sent_at ? new Date(m.sent_at).toLocaleString() : ""}
                    </span>
                    {canSend && (
                      <button
                        onClick={() => startReply(m)}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                  {m.subject ?? "(no subject)"}
                </p>
                {m.text_body ? (
                  <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">
                    {m.text_body}
                  </div>
                ) : m.html_body ? (
                  // sandbox (no allow-scripts) keeps remote HTML inert
                  <iframe
                    sandbox=""
                    srcDoc={m.html_body}
                    className="w-full min-h-[200px] rounded-lg border border-[var(--border-subtle)] bg-white"
                    title={`message-${m.id}`}
                  />
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)]">(empty body)</p>
                )}
                {m.email_attachments?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.email_attachments.map((att) => (
                      <button
                        key={att.id}
                        onClick={() => void downloadAttachment(att)}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--amber)] transition-colors"
                      >
                        <Paperclip className="w-3 h-3" />
                        {att.filename ?? "attachment"}
                        {att.size_bytes ? (
                          <span className="text-[var(--text-tertiary)]">
                            ({Math.ceil(att.size_bytes / 1024)} KB)
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-3" />
              <p className="text-sm text-[var(--text-tertiary)]">
                Select a thread to read, or compose a new message
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
