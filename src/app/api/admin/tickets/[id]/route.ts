import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { getMailboxPermission, permissionAtLeast } from "@/lib/mail/access";
import { sendMailboxEmail } from "@/lib/mail/smtp";
import { addTicketEvent } from "@/lib/support/tickets";

/**
 * GET /api/admin/tickets/[id] — Ticket + event log + linked email thread.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(`
      id, ticket_number, subject, status, priority, source,
      requester_email, requester_user_id, company_id, assignee_user_id,
      email_thread_id, conversation_id, deal_thread_id, ai_triage,
      sla_due_at, first_response_at, resolved_at, created_at,
      companies ( id, name ),
      assignee:user_profiles!tickets_assignee_user_id_fkey ( id, full_name )
    `)
    .eq("id", id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const [{ data: events }, { data: emailMessages }] = await Promise.all([
    supabase
      .from("ticket_events")
      .select(`
        id, event_type, payload, created_at,
        user_profiles ( full_name )
      `)
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
    ticket.email_thread_id
      ? supabase
          .from("email_messages")
          .select("id, direction, from_address, from_name, subject, text_body, snippet, sent_at")
          .eq("thread_id", ticket.email_thread_id)
          .is("draft_status", null)
          .order("sent_at", { ascending: true, nullsFirst: true })
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    ticket,
    events: events ?? [],
    emailMessages: emailMessages ?? [],
  });
}

const replySchema = z.object({
  body: z.string().min(1).max(100_000),
});

/**
 * POST /api/admin/tickets/[id] — Reply to the requester from the
 * support mailbox; stamps first_response_at on the first reply.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = replySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Reply body required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, requester_email, email_thread_id, first_response_at")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (!ticket.requester_email) {
    return NextResponse.json({ error: "Ticket has no requester email" }, { status: 400 });
  }

  // Reply from the thread's mailbox, or the support@ mailbox as fallback
  let mailboxId: string | null = null;
  let inReplyTo: string | undefined;
  if (ticket.email_thread_id) {
    const { data: thread } = await supabase
      .from("email_threads")
      .select("mailbox_id")
      .eq("id", ticket.email_thread_id)
      .maybeSingle();
    mailboxId = thread?.mailbox_id ?? null;

    const { data: lastInbound } = await supabase
      .from("email_messages")
      .select("message_id")
      .eq("thread_id", ticket.email_thread_id)
      .eq("direction", "inbound")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    inReplyTo = lastInbound?.message_id ?? undefined;
  }
  if (!mailboxId) {
    const { data: supportBox } = await supabase
      .from("mailboxes")
      .select("id")
      .ilike("address", "support@%")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    mailboxId = supportBox?.id ?? null;
  }
  if (!mailboxId) {
    return NextResponse.json({ error: "No support mailbox configured" }, { status: 400 });
  }

  const permission = await getMailboxPermission(supabase, mailboxId, auth.profile.id, auth.role);
  if (!permissionAtLeast(permission, "send")) {
    return NextResponse.json(
      { error: "You do not have send permission on the support mailbox" },
      { status: 403 }
    );
  }

  const body = parsed.data.body;
  const escaped = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const subject = ticket.subject.startsWith("Re:")
    ? `${ticket.subject} [${ticket.ticket_number}]`
    : `Re: ${ticket.subject} [${ticket.ticket_number}]`;

  const result = await sendMailboxEmail(supabase, {
    mailboxId,
    to: [ticket.requester_email],
    subject,
    html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escaped}</div>`,
    text: body,
    inReplyTo,
    references: inReplyTo ? [inReplyTo] : undefined,
    threadId: ticket.email_thread_id ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 502 });
  }

  await addTicketEvent(id, "email_out", { messageId: result.messageId }, auth.profile.id);

  const update: Record<string, unknown> = {
    status: "pending",
    updated_at: new Date().toISOString(),
  };
  if (!ticket.first_response_at) update.first_response_at = new Date().toISOString();
  if (!ticket.email_thread_id && result.threadId) update.email_thread_id = result.threadId;
  await supabase.from("tickets").update(update).eq("id", id);

  return NextResponse.json({ success: true, messageId: result.messageId });
}
