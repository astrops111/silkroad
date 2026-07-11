import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { isAIFeatureEnabled } from "@/lib/ai/feature-flags";
import { sendMailboxEmail } from "@/lib/mail/smtp";
import { logActivity } from "@/lib/crm/activities";
import { logError } from "@/lib/logging/activity";
import { resolveContact } from "@/lib/crm/contacts";
import type { Json } from "@/lib/supabase/database.types";

// ============================================================
// Support ticketing — intake from support@ email, in-app
// requests, and the AI create_ticket skill action.
// ============================================================

const DEFAULT_SLA_HOURS = 24;

export async function addTicketEvent(
  ticketId: string,
  eventType:
    | "created"
    | "status_changed"
    | "assigned"
    | "priority_changed"
    | "comment"
    | "email_in"
    | "email_out"
    | "ai_triage",
  payload: Record<string, unknown> = {},
  actorUserId?: string | null
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("ticket_events").insert({
    ticket_id: ticketId,
    event_type: eventType,
    actor_user_id: actorUserId ?? null,
    payload: payload as Json,
  });
}

interface EmailIntakeInput {
  emailMessageId: string;
  threadId: string | null;
  mailboxId: string;
  fromAddress: string;
  fromName: string | null;
  subject: string | null;
  textBody: string | null;
}

/** Senders/subjects we must never auto-ack (mail loop protection). */
function isAutoMail(fromAddress: string, subject: string | null): boolean {
  const from = fromAddress.toLowerCase();
  if (/mailer-daemon|postmaster|no-?reply|donotreply|auto@/.test(from)) return true;
  if (subject && /^(auto|automatic|out of office|undeliver|delivery status)/i.test(subject)) return true;
  return false;
}

/**
 * Inbound support@ email → ticket. If the email thread already has an
 * open ticket, append an email_in event (reopening resolved tickets);
 * otherwise create a ticket, AI-triage it, and send exactly one
 * auto-acknowledgement from the support mailbox.
 */
export async function ensureSupportTicketForEmail(input: EmailIntakeInput): Promise<string | null> {
  const supabase = createServiceClient();

  try {
    // Existing ticket on this thread?
    if (input.threadId) {
      const { data: existing } = await supabase
        .from("tickets")
        .select("id, status")
        .eq("email_thread_id", input.threadId)
        .maybeSingle();

      if (existing) {
        await addTicketEvent(existing.id, "email_in", {
          emailMessageId: input.emailMessageId,
          from: input.fromAddress,
          subject: input.subject,
        });
        if (existing.status === "resolved" || existing.status === "closed") {
          await supabase
            .from("tickets")
            .update({ status: "open", resolved_at: null, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          await addTicketEvent(existing.id, "status_changed", { from: existing.status, to: "open", reason: "new reply" });
        }
        return existing.id;
      }
    }

    if (isAutoMail(input.fromAddress, input.subject)) return null;

    // Link requester to platform user / CRM contact when possible
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .eq("email", input.fromAddress)
      .maybeSingle();

    const contactId = await resolveContact({
      email: input.fromAddress,
      fullName: input.fromName,
      source: "email",
    });

    let companyId: string | null = null;
    if (contactId) {
      const { data: contact } = await supabase
        .from("crm_contacts")
        .select("company_id")
        .eq("id", contactId)
        .maybeSingle();
      companyId = contact?.company_id ?? null;
    }

    const triage = await triageTicket(input.subject, input.textBody);

    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        subject: input.subject ?? "(no subject)",
        source: "email",
        priority: triage?.priority ?? "normal",
        requester_email: input.fromAddress,
        requester_user_id: profile?.id ?? null,
        company_id: companyId,
        email_thread_id: input.threadId,
        ai_triage: (triage ?? null) as Json,
        sla_due_at: new Date(Date.now() + DEFAULT_SLA_HOURS * 3600 * 1000).toISOString(),
      })
      .select("id, ticket_number")
      .single();

    if (error || !ticket) {
      console.error("[support/tickets] create failed:", error?.message);
      return null;
    }

    await addTicketEvent(ticket.id, "created", {
      source: "email",
      emailMessageId: input.emailMessageId,
      from: input.fromAddress,
    });
    if (triage) await addTicketEvent(ticket.id, "ai_triage", triage);

    await logActivity({
      activityType: "ticket_created",
      companyId,
      contactId,
      referenceType: "ticket",
      referenceId: ticket.id,
      metadata: { ticketNumber: ticket.ticket_number, subject: input.subject },
    });

    // Auto-acknowledgement — exactly one, from the support mailbox
    await sendAutoAck(input.mailboxId, input.fromAddress, input.fromName, ticket.id, ticket.ticket_number);

    return ticket.id;
  } catch (err) {
    console.error("[support/tickets] ensureSupportTicketForEmail error:", err);
    await logError({
      errorCode: "ticket_intake_failed",
      message: err instanceof Error ? err.message : String(err),
      source: "support-tickets",
      metadata: { from: input.fromAddress, subject: input.subject },
    }).catch(() => {});
    return null;
  }
}

async function sendAutoAck(
  mailboxId: string,
  toAddress: string,
  toName: string | null,
  ticketId: string,
  ticketNumber: string
): Promise<void> {
  const supabase = createServiceClient();
  const { data: template } = await supabase
    .from("email_templates")
    .select("subject_template, html_template")
    .eq("name", "support_auto_ack")
    .eq("is_active", true)
    .maybeSingle();

  if (!template) return;

  const vars: Record<string, string> = {
    requesterName: toName ?? "there",
    ticketNumber,
  };
  const substitute = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");

  const result = await sendMailboxEmail(supabase, {
    mailboxId,
    to: [toAddress],
    subject: substitute(template.subject_template),
    html: substitute(template.html_template),
  });

  if (result.success) {
    await addTicketEvent(ticketId, "email_out", { autoAck: true, messageId: result.messageId });
  }
}

interface TriageResult {
  intent: string;
  priority: "low" | "normal" | "high" | "urgent";
  summary: string;
  [key: string]: unknown;
}

/** Lightweight AI triage — gated by the existing support-agent flag. */
async function triageTicket(
  subject: string | null,
  body: string | null
): Promise<TriageResult | null> {
  try {
    if (!(await isAIFeatureEnabled("ai_support_agent"))) return null;

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system:
        'Triage a B2B marketplace support email. Respond with ONLY a JSON object: {"intent": string, "priority": "low"|"normal"|"high"|"urgent", "summary": string}. Escalate priority for payment failures, legal threats, or shipment emergencies.',
      messages: [
        {
          role: "user",
          content: `Subject: ${subject ?? "(none)"}\n\n${(body ?? "").slice(0, 3000)}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as TriageResult;
  } catch {
    return null;
  }
}

export interface CreateTicketInput {
  subject: string;
  source: "in_app" | "ai";
  requesterUserId?: string | null;
  requesterEmail?: string | null;
  companyId?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  emailThreadId?: string | null;
  dealThreadId?: string | null;
  body?: string | null;
}

/** Create a ticket from in-app or AI-skill intake. */
export async function createTicket(input: CreateTicketInput): Promise<{ id: string; ticketNumber: string } | null> {
  const supabase = createServiceClient();
  try {
    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        subject: input.subject,
        source: input.source,
        priority: input.priority ?? "normal",
        requester_user_id: input.requesterUserId ?? null,
        requester_email: input.requesterEmail ?? null,
        company_id: input.companyId ?? null,
        email_thread_id: input.emailThreadId ?? null,
        deal_thread_id: input.dealThreadId ?? null,
        sla_due_at: new Date(Date.now() + DEFAULT_SLA_HOURS * 3600 * 1000).toISOString(),
      })
      .select("id, ticket_number")
      .single();

    if (error || !ticket) return null;

    await addTicketEvent(ticket.id, "created", {
      source: input.source,
      ...(input.body && { body: input.body.slice(0, 2000) }),
    }, input.requesterUserId ?? null);

    await logActivity({
      activityType: "ticket_created",
      actorType: input.source === "ai" ? "ai" : "user",
      actorUserId: input.requesterUserId ?? null,
      companyId: input.companyId ?? null,
      dealThreadId: input.dealThreadId ?? null,
      referenceType: "ticket",
      referenceId: ticket.id,
      metadata: { ticketNumber: ticket.ticket_number, subject: input.subject },
    });

    return { id: ticket.id, ticketNumber: ticket.ticket_number };
  } catch (err) {
    console.error("[support/tickets] createTicket error:", err);
    await logError({
      errorCode: "ticket_create_failed",
      message: err instanceof Error ? err.message : String(err),
      source: "support-tickets",
      metadata: { subject: input.subject, source: input.source },
    }).catch(() => {});
    return null;
  }
}
