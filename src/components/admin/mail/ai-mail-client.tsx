"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Plus, Trash2, Check, X, Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTION_OPTIONS = [
  { key: "draft_reply", label: "Draft reply (human-approved)" },
  { key: "link_to_rfq", label: "Link to RFQ deal" },
  { key: "create_crm_activity", label: "Log CRM activity" },
  { key: "escalate", label: "Escalate to admins" },
  { key: "create_ticket", label: "Create support ticket" },
] as const;

interface Skill {
  id: string;
  name: string;
  description: string | null;
  mailbox_id: string | null;
  trigger_conditions: { from_pattern?: string; subject_pattern?: string };
  prompt_template: string;
  allowed_actions: string[];
  priority: number;
  is_active: boolean;
  mailboxes: { address: string } | null;
}

interface SkillRun {
  id: string;
  skill_id: string;
  status: string;
  actions_taken: { action: string; detail: string }[];
  error_message: string | null;
  created_at: string;
}

interface Draft {
  id: string;
  subject: string | null;
  text_body: string | null;
  to_addresses: string[];
  created_at: string;
  mailboxes: { address: string } | null;
}

interface Template {
  id: string;
  name: string;
  category: string;
  subject_template: string;
  html_template: string;
  variables: string[];
  is_active: boolean;
}

interface MailboxOption {
  id: string;
  address: string;
}

const EMPTY_SKILL = {
  name: "",
  description: "",
  mailboxId: "",
  subjectPattern: "",
  fromPattern: "",
  promptTemplate: "",
  allowedActions: [] as string[],
};

const inputCls =
  "text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)] w-full";

export function AiMailClient() {
  const [tab, setTab] = useState<"skills" | "drafts" | "templates">("skills");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [runs, setRuns] = useState<SkillRun[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mailboxes, setMailboxes] = useState<MailboxOption[]>([]);
  const [skillForm, setSkillForm] = useState(EMPTY_SKILL);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<{ id: string; subject: string; body: string } | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [skillsRes, draftsRes, templatesRes, mailboxesRes] = await Promise.all([
      fetch("/api/admin/mail/skills").then((r) => r.json()),
      fetch("/api/admin/mail/drafts").then((r) => r.json()),
      fetch("/api/admin/mail/templates").then((r) => r.json()),
      fetch("/api/admin/mail/mailboxes").then((r) => r.json()),
    ]);
    setSkills(skillsRes.skills ?? []);
    setRuns(skillsRes.recentRuns ?? []);
    setDrafts(draftsRes.drafts ?? []);
    setTemplates(templatesRes.templates ?? []);
    setMailboxes((mailboxesRes.mailboxes ?? []).map((m: MailboxOption) => ({ id: m.id, address: m.address })));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSkill() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mail/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skillForm.name,
          description: skillForm.description || null,
          mailboxId: skillForm.mailboxId || null,
          triggerConditions: {
            ...(skillForm.fromPattern && { from_pattern: skillForm.fromPattern }),
            ...(skillForm.subjectPattern && { subject_pattern: skillForm.subjectPattern }),
          },
          promptTemplate: skillForm.promptTemplate,
          allowedActions: skillForm.allowedActions,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Save failed");
      else {
        setFormOpen(false);
        setSkillForm(EMPTY_SKILL);
        void load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleSkill(skill: Skill) {
    await fetch("/api/admin/mail/skills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: skill.id, isActive: !skill.is_active }),
    });
    void load();
  }

  async function deleteSkill(skill: Skill) {
    if (!window.confirm(`Delete skill "${skill.name}"?`)) return;
    await fetch("/api/admin/mail/skills", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: skill.id }),
    });
    void load();
  }

  async function draftAction(draftId: string, action: "approve" | "discard", edits?: { subject: string; bodyText: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mail/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action, ...(edits && { edits }) }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Action failed");
      else {
        setEditingDraft(null);
        void load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mail/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTemplate.id,
          subjectTemplate: editingTemplate.subject_template,
          htmlTemplate: editingTemplate.html_template,
          isActive: editingTemplate.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Save failed");
      else {
        setEditingTemplate(null);
        void load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-subtle)]">
        {(
          [
            ["skills", `Skills (${skills.length})`],
            ["drafts", `AI Drafts (${drafts.length})`],
            ["templates", `Templates (${templates.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? "border-[var(--amber)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Skills */}
      {tab === "skills" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setFormOpen((v) => !v)}>
              <Plus className="w-3.5 h-3.5" /> New skill
            </Button>
          </div>

          {formOpen && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="Skill name" value={skillForm.name}
                  onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))} />
                <select className={inputCls} value={skillForm.mailboxId}
                  onChange={(e) => setSkillForm((f) => ({ ...f, mailboxId: e.target.value }))}>
                  <option value="">All mailboxes</option>
                  {mailboxes.map((m) => (
                    <option key={m.id} value={m.id}>{m.address}</option>
                  ))}
                </select>
                <input className={inputCls} placeholder="Subject matches (regex, optional)" value={skillForm.subjectPattern}
                  onChange={(e) => setSkillForm((f) => ({ ...f, subjectPattern: e.target.value }))} />
                <input className={inputCls} placeholder="Sender matches (regex, optional)" value={skillForm.fromPattern}
                  onChange={(e) => setSkillForm((f) => ({ ...f, fromPattern: e.target.value }))} />
              </div>
              <textarea className={`${inputCls} resize-none`} rows={5}
                placeholder="Skill instructions for the AI — e.g. 'Triage quote requests from buyers: summarize what they want, link any referenced RFQ, and draft a friendly reply asking for quantities and destination port.'"
                value={skillForm.promptTemplate}
                onChange={(e) => setSkillForm((f) => ({ ...f, promptTemplate: e.target.value }))} />
              <div className="flex flex-wrap gap-3">
                {ACTION_OPTIONS.map((a) => (
                  <label key={a.key} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={skillForm.allowedActions.includes(a.key)}
                      onChange={(e) =>
                        setSkillForm((f) => ({
                          ...f,
                          allowedActions: e.target.checked
                            ? [...f.allowedActions, a.key]
                            : f.allowedActions.filter((x) => x !== a.key),
                        }))
                      }
                    />
                    {a.label}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={() => void saveSkill()}
                  disabled={busy || !skillForm.name || skillForm.promptTemplate.length < 10 || skillForm.allowedActions.length === 0}>
                  {busy ? "Saving…" : "Create skill"}
                </Button>
              </div>
            </div>
          )}

          {skills.map((s) => (
            <div key={s.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-purple-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {s.mailboxes?.address ?? "All mailboxes"} · actions: {s.allowed_actions.join(", ")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void toggleSkill(s)}>
                  {s.is_active ? "Disable" : "Enable"}
                </Button>
                <button onClick={() => void deleteSkill(s)}
                  className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger)]">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{s.prompt_template}</p>
            </div>
          ))}
          {skills.length === 0 && !formOpen && (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
              No skills yet — create one to start AI-processing inbound email.
            </p>
          )}

          {runs.length > 0 && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                Recent runs
              </h3>
              {runs.slice(0, 10).map((r) => (
                <p key={r.id} className="text-xs text-[var(--text-secondary)] py-0.5">
                  <span className={r.status === "succeeded" ? "text-emerald-600" : "text-red-500"}>
                    {r.status}
                  </span>{" "}
                  · {(r.actions_taken ?? []).map((a) => a.action).join(", ") || "no actions"}
                  {r.error_message ? ` · ${r.error_message.slice(0, 80)}` : ""} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Drafts — human approval queue */}
      {tab === "drafts" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-tertiary)]">
            AI-drafted replies wait here — nothing is sent until you approve it. Edit before sending if needed.
          </p>
          {drafts.map((d) => (
            <div key={d.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-2">
              {editingDraft?.id === d.id ? (
                <>
                  <input className={inputCls} value={editingDraft.subject}
                    onChange={(e) => setEditingDraft((v) => v && { ...v, subject: e.target.value })} />
                  <textarea className={`${inputCls} resize-none`} rows={8} value={editingDraft.body}
                    onChange={(e) => setEditingDraft((v) => v && { ...v, body: e.target.value })} />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingDraft(null)}>Cancel</Button>
                    <Button size="sm" disabled={busy}
                      onClick={() => void draftAction(d.id, "approve", { subject: editingDraft.subject, bodyText: editingDraft.body })}>
                      <Check className="w-3.5 h-3.5" /> Send edited
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{d.subject}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        from {d.mailboxes?.address} to {d.to_addresses.join(", ")} ·{" "}
                        {new Date(d.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" disabled={busy} onClick={() => void draftAction(d.id, "approve")}>
                        <Check className="w-3.5 h-3.5" /> Approve & send
                      </Button>
                      <Button variant="ghost" size="sm"
                        onClick={() => setEditingDraft({ id: d.id, subject: d.subject ?? "", body: d.text_body ?? "" })}>
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <button onClick={() => void draftAction(d.id, "discard")}
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger)]" title="Discard">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap line-clamp-6">
                    {d.text_body}
                  </p>
                </>
              )}
            </div>
          ))}
          {drafts.length === 0 && (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-8">No drafts awaiting review</p>
          )}
        </div>
      )}

      {/* Templates */}
      {tab === "templates" && (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-2">
              {editingTemplate?.id === t.id ? (
                <>
                  <input className={inputCls} value={editingTemplate.subject_template}
                    onChange={(e) => setEditingTemplate((v) => v && { ...v, subject_template: e.target.value })} />
                  <textarea className={`${inputCls} resize-none font-mono text-xs`} rows={8}
                    value={editingTemplate.html_template}
                    onChange={(e) => setEditingTemplate((v) => v && { ...v, html_template: e.target.value })} />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                    <Button size="sm" disabled={busy} onClick={() => void saveTemplate()}>
                      {busy ? "Saving…" : "Save template"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[var(--text-tertiary)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {t.name}
                      <span className="ml-2 text-[10px] uppercase text-[var(--text-tertiary)]">{t.category}</span>
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">{t.subject_template}</p>
                    {t.variables.length > 0 && (
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        Variables: {t.variables.map((v) => `{{${v}}}`).join(" ")}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(t)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                </div>
              )}
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-8">No templates</p>
          )}
        </div>
      )}
    </div>
  );
}
