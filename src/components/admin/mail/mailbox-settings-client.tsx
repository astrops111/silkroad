"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Users,
  UserCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { listUsers, type UserListRow } from "@/lib/actions/admin-users-list";

interface SyncState {
  folder: string;
  uidvalidity: number | null;
  last_uid: number;
  last_synced_at: string | null;
}

interface Mailbox {
  id: string;
  address: string;
  display_name: string;
  mailbox_type: string;
  owner_user_id: string | null;
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
  username: string;
  credential_ref: string;
  is_active: boolean;
  mailbox_sync_state: SyncState[];
  myPermission: string | null;
}

interface Grant {
  id: string;
  permission: string;
  granted_at: string;
  user_profiles: { id: string; full_name: string | null; email: string | null } | null;
}

const EMPTY_FORM = {
  address: "",
  displayName: "",
  mailboxType: "shared" as "shared" | "personal",
  ownerUserId: "",
  username: "",
  credentialRef: "",
};

export function MailboxSettingsClient() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserListRow[]>([]);
  const [grants, setGrants] = useState<Record<string, Grant[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grantForm, setGrantForm] = useState({ userId: "", permission: "read" });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/mail/mailboxes");
    const data = await res.json();
    setMailboxes(data.mailboxes ?? []);
  }, []);

  useEffect(() => {
    void load();
    listUsers(1, 200)
      .then((r) => setAdminUsers(r.users.filter((u) => u.hasAdmin)))
      .catch(() => {});
  }, [load]);

  async function loadGrants(mailboxId: string) {
    const res = await fetch(`/api/admin/mail/mailboxes/${mailboxId}/permissions`);
    const data = await res.json();
    setGrants((g) => ({ ...g, [mailboxId]: data.permissions ?? [] }));
  }

  function toggleExpand(id: string) {
    const next = expanded === id ? null : id;
    setExpanded(next);
    if (next) void loadGrants(next);
  }

  async function handleCreate() {
    setBusy("create");
    setError(null);
    try {
      const res = await fetch("/api/admin/mail/mailboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          displayName: form.displayName,
          mailboxType: form.mailboxType,
          ownerUserId: form.mailboxType === "personal" && form.ownerUserId ? form.ownerUserId : null,
          username: form.username || form.address,
          credentialRef: form.credentialRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Create failed");
      } else {
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        void load();
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleSync(id: string) {
    setBusy(`sync-${id}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mail/mailboxes/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.errors?.length) {
        setError((data.errors ?? [data.error]).join("; ") || "Sync failed");
      }
      void load();
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleActive(m: Mailbox) {
    await fetch(`/api/admin/mail/mailboxes/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !m.is_active }),
    });
    void load();
  }

  async function handleDelete(m: Mailbox) {
    if (!window.confirm(`Delete mailbox ${m.address} and all synced messages?`)) return;
    await fetch(`/api/admin/mail/mailboxes/${m.id}`, { method: "DELETE" });
    void load();
  }

  async function handleGrant(mailboxId: string) {
    if (!grantForm.userId) return;
    await fetch(`/api/admin/mail/mailboxes/${mailboxId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(grantForm),
    });
    setGrantForm({ userId: "", permission: "read" });
    void loadGrants(mailboxId);
  }

  async function handleRevoke(mailboxId: string, userId: string) {
    await fetch(`/api/admin/mail/mailboxes/${mailboxId}/permissions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    void loadGrants(mailboxId);
  }

  const inputCls =
    "text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)]";

  return (
    <div className="space-y-4 max-w-4xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen((v) => !v)}>
          <Plus className="w-3.5 h-3.5" />
          Add mailbox
        </Button>
      </div>

      {createOpen && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">New mailbox</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="Address (e.g. jane@silkroad.africa)"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
            <input
              className={inputCls}
              placeholder="Display name"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
            <select
              className={inputCls}
              value={form.mailboxType}
              onChange={(e) =>
                setForm((f) => ({ ...f, mailboxType: e.target.value as "shared" | "personal" }))
              }
            >
              <option value="shared">Shared (team mailbox)</option>
              <option value="personal">Personal (owned by one admin)</option>
            </select>
            {form.mailboxType === "personal" && (
              <select
                className={inputCls}
                value={form.ownerUserId}
                onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))}
              >
                <option value="">Select owner…</option>
                {adminUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.fullName ?? u.email}
                  </option>
                ))}
              </select>
            )}
            <input
              className={inputCls}
              placeholder="IMAP/SMTP username (defaults to address)"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
            <input
              className={inputCls}
              placeholder="Password env var (e.g. MAIL_PW_JANE)"
              value={form.credentialRef}
              onChange={(e) => setForm((f) => ({ ...f, credentialRef: e.target.value.toUpperCase() }))}
            />
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Host defaults to mail.privateemail.com (IMAP 993 / SMTP 465). The mailbox
            password is read from the named environment variable — set it in Vercel
            before activating the mailbox.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleCreate()}
              disabled={busy === "create" || !form.address || !form.displayName || !form.credentialRef}
            >
              {busy === "create" ? "Creating…" : "Create mailbox"}
            </Button>
          </div>
        </div>
      )}

      {mailboxes.map((m) => (
        <div
          key={m.id}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden"
        >
          <button
            onClick={() => toggleExpand(m.id)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface-secondary)]/50 transition-colors text-left"
          >
            {m.mailbox_type === "personal" ? (
              <UserCircle2 className="w-5 h-5 text-[var(--text-tertiary)]" />
            ) : (
              <Users className="w-5 h-5 text-[var(--text-tertiary)]" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{m.address}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {m.display_name} · {m.mailbox_type} · env {m.credential_ref}
              </p>
            </div>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                m.is_active
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]"
              }`}
            >
              {m.is_active ? "Active" : "Paused"}
            </span>
          </button>

          {expanded === m.id && (
            <div className="border-t border-[var(--border-subtle)] p-4 space-y-4">
              {/* Sync state */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                  Sync status
                </h4>
                {m.mailbox_sync_state.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)]">Never synced</p>
                ) : (
                  <div className="space-y-1">
                    {m.mailbox_sync_state.map((s) => (
                      <p key={s.folder} className="text-xs text-[var(--text-secondary)]">
                        <span className="font-mono">{s.folder}</span> — up to UID {s.last_uid},
                        last sync{" "}
                        {s.last_synced_at ? new Date(s.last_synced_at).toLocaleString() : "never"}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
                  Access grants
                </h4>
                <div className="space-y-1.5 mb-2">
                  {(grants[m.id] ?? []).map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between text-sm bg-[var(--surface-secondary)] rounded-lg px-3 py-1.5"
                    >
                      <span className="text-[var(--text-primary)]">
                        {g.user_profiles?.full_name ?? g.user_profiles?.email ?? "Unknown user"}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)] uppercase">
                          {g.permission}
                        </span>
                        <button
                          onClick={() =>
                            g.user_profiles && void handleRevoke(m.id, g.user_profiles.id)
                          }
                          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                  {(grants[m.id] ?? []).length === 0 && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      No explicit grants — only super admins{m.owner_user_id ? " and the owner" : ""} can access.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    className={`${inputCls} flex-1`}
                    value={grantForm.userId}
                    onChange={(e) => setGrantForm((f) => ({ ...f, userId: e.target.value }))}
                  >
                    <option value="">Grant access to…</option>
                    {adminUsers.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.fullName ?? u.email}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputCls}
                    value={grantForm.permission}
                    onChange={(e) => setGrantForm((f) => ({ ...f, permission: e.target.value }))}
                  >
                    <option value="read">Read</option>
                    <option value="send">Send</option>
                    <option value="manage">Manage</option>
                  </select>
                  <Button size="sm" onClick={() => void handleGrant(m.id)} disabled={!grantForm.userId}>
                    Grant
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleSync(m.id)}
                  disabled={busy === `sync-${m.id}`}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${busy === `sync-${m.id}` ? "animate-spin" : ""}`}
                  />
                  {busy === `sync-${m.id}` ? "Syncing…" : "Sync now"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleToggleActive(m)}>
                  {m.is_active ? "Pause syncing" : "Activate"}
                </Button>
                <button
                  onClick={() => void handleDelete(m)}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete mailbox
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {mailboxes.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border-default)] p-10 text-center">
          <Mail className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-2" />
          <p className="text-sm text-[var(--text-tertiary)]">No mailboxes configured yet</p>
        </div>
      )}
    </div>
  );
}
