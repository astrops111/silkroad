"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  CreditCard,
  Ship,
  Mail,
  MessageSquare,
  Ticket,
  StickyNote,
  Bot,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTIVITY_META: Record<string, { label: string; icon: typeof FileText; tone: string }> = {
  rfq_submitted: { label: "RFQ submitted", icon: FileText, tone: "text-blue-600" },
  quote_submitted: { label: "Quote submitted", icon: FileText, tone: "text-indigo-600" },
  quote_accepted: { label: "Quote accepted", icon: CheckCircle2, tone: "text-emerald-600" },
  quote_rejected: { label: "Quote not selected", icon: XCircle, tone: "text-[var(--text-tertiary)]" },
  order_created: { label: "Order created", icon: ShoppingCart, tone: "text-emerald-600" },
  payment_confirmed: { label: "Payment confirmed", icon: CreditCard, tone: "text-emerald-600" },
  shipment_milestone: { label: "Shipment milestone", icon: Ship, tone: "text-cyan-600" },
  email_inbound: { label: "Email received", icon: Mail, tone: "text-amber-600" },
  email_outbound: { label: "Email sent", icon: Mail, tone: "text-[var(--text-secondary)]" },
  message_inbound: { label: "Message received", icon: MessageSquare, tone: "text-amber-600" },
  message_outbound: { label: "Message sent", icon: MessageSquare, tone: "text-[var(--text-secondary)]" },
  ticket_created: { label: "Ticket opened", icon: Ticket, tone: "text-red-500" },
  ticket_resolved: { label: "Ticket resolved", icon: Ticket, tone: "text-emerald-600" },
  note: { label: "Note", icon: StickyNote, tone: "text-[var(--text-secondary)]" },
  task: { label: "Task", icon: CheckCircle2, tone: "text-[var(--text-secondary)]" },
  ai_action: { label: "AI action", icon: Bot, tone: "text-purple-600" },
};

export interface TimelineActivity {
  id: string;
  activity_type: string;
  actor_type: string;
  occurred_at: string;
  reference_type: string | null;
  metadata: Record<string, unknown> | null;
  user_profiles?: { full_name: string | null } | null;
  crm_contacts?: { full_name: string | null; email: string | null } | null;
}

interface ActivityTimelineProps {
  /** Exactly one filter — passed straight to the activities API */
  filter: {
    companyId?: string;
    dealThreadId?: string;
    opportunityId?: string;
    contactId?: string;
  };
  /** Pre-fetched activities (skips the initial fetch) */
  initialActivities?: TimelineActivity[];
  /** Show the add-note form */
  allowNotes?: boolean;
}

export function ActivityTimeline({ filter, initialActivities, allowNotes }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<TimelineActivity[]>(initialActivities ?? []);
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter.companyId) params.set("companyId", filter.companyId);
    if (filter.dealThreadId) params.set("dealThreadId", filter.dealThreadId);
    if (filter.opportunityId) params.set("opportunityId", filter.opportunityId);
    if (filter.contactId) params.set("contactId", filter.contactId);
    const res = await fetch(`/api/admin/crm/activities?${params}`);
    const data = await res.json();
    setActivities(data.activities ?? []);
  }, [filter.companyId, filter.dealThreadId, filter.opportunityId, filter.contactId]);

  useEffect(() => {
    if (!initialActivities) void load();
  }, [load, initialActivities]);

  async function addNote() {
    if (!noteBody.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/admin/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: noteBody,
          companyId: filter.companyId ?? null,
          contactId: filter.contactId ?? null,
          opportunityId: filter.opportunityId ?? null,
          dealThreadId: filter.dealThreadId ?? null,
        }),
      });
      setNoteBody("");
      void load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {allowNotes && (
        <div className="flex gap-2">
          <input
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)]"
            onKeyDown={(e) => e.key === "Enter" && void addNote()}
          />
          <Button size="sm" onClick={() => void addNote()} disabled={saving || !noteBody.trim()}>
            {saving ? "Saving…" : "Add note"}
          </Button>
        </div>
      )}

      <div className="relative pl-5">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[var(--border-subtle)]" />
        {activities.map((a) => {
          const meta = ACTIVITY_META[a.activity_type] ?? {
            label: a.activity_type,
            icon: Activity,
            tone: "text-[var(--text-tertiary)]",
          };
          const Icon = meta.icon;
          const actor =
            a.user_profiles?.full_name ??
            a.crm_contacts?.full_name ??
            a.crm_contacts?.email ??
            (a.actor_type === "ai" ? "AI" : a.actor_type === "system" ? "System" : "");
          const preview =
            (a.metadata?.preview as string | undefined) ??
            (a.metadata?.subject as string | undefined) ??
            (a.metadata?.rfqNumber as string | undefined) ??
            (a.metadata?.orderNumber as string | undefined) ??
            (a.metadata?.quotationNumber as string | undefined);

          return (
            <div key={a.id} className="relative mb-4 last:mb-0">
              <div className="absolute -left-5 top-0.5 w-[15px] h-[15px] rounded-full bg-[var(--surface-primary)] border border-[var(--border-default)] flex items-center justify-center">
                <Icon className={`w-2.5 h-2.5 ${meta.tone}`} />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">{meta.label}</span>
                  {actor && <span className="text-[var(--text-tertiary)]"> · {actor}</span>}
                </p>
                <span className="text-[11px] text-[var(--text-tertiary)] shrink-0">
                  {new Date(a.occurred_at).toLocaleString()}
                </span>
              </div>
              {preview && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{preview}</p>
              )}
            </div>
          );
        })}
        {activities.length === 0 && (
          <p className="text-xs text-[var(--text-tertiary)] py-2">No activity yet</p>
        )}
      </div>
    </div>
  );
}
