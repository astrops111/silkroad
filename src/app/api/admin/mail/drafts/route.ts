import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { getMailboxPermission, permissionAtLeast } from "@/lib/mail/access";
import { sendMailboxEmail } from "@/lib/mail/smtp";
import { logActivity } from "@/lib/crm/activities";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * GET /api/admin/mail/drafts — AI drafts awaiting human review.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { data: drafts, error } = await supabase
    .from("email_messages")
    .select(`
      id, mailbox_id, thread_id, subject, text_body, to_addresses,
      in_reply_to, references_header, created_at, draft_source_message_id,
      mailboxes ( address, display_name )
    `)
    .eq("draft_status", "pending_review")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin/mail/drafts]", error);
    return NextResponse.json({ error: "Failed to load drafts" }, { status: 500 });
  }

  return NextResponse.json({ drafts: drafts ?? [] });
}

const actionSchema = z.object({
  draftId: z.string().uuid(),
  action: z.enum(["approve", "discard"]),
  edits: z
    .object({
      subject: z.string().min(1).max(500),
      bodyText: z.string().min(1).max(100_000),
    })
    .optional(),
});

/**
 * POST /api/admin/mail/drafts — Approve (optionally edited) & send, or
 * discard. AI drafts NEVER leave without this explicit human action.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { draftId, action, edits } = parsed.data;
  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("email_messages")
    .select("id, mailbox_id, thread_id, subject, text_body, to_addresses, in_reply_to, references_header, draft_status")
    .eq("id", draftId)
    .maybeSingle();

  if (!draft || draft.draft_status !== "pending_review") {
    return NextResponse.json({ error: "Draft not found or already handled" }, { status: 404 });
  }

  if (action === "discard") {
    await supabase
      .from("email_messages")
      .update({
        draft_status: "discarded",
        approved_by: auth.profile.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", draftId);
    await logAdminAction({
      adminId: auth.profile.id,
      actionType: "ai_draft_discarded",
      targetEntity: "email_message",
      targetId: draftId,
      targetLabel: draft.subject ?? undefined,
    });
    return NextResponse.json({ success: true, action: "discard" });
  }

  // Approve & send — requires send permission on the mailbox
  const permission = await getMailboxPermission(
    supabase,
    draft.mailbox_id,
    auth.profile.id,
    auth.role
  );
  if (!permissionAtLeast(permission, "send")) {
    return NextResponse.json(
      { error: "You do not have send permission on this mailbox" },
      { status: 403 }
    );
  }

  const subject = edits?.subject ?? draft.subject ?? "(no subject)";
  const bodyText = edits?.bodyText ?? draft.text_body ?? "";
  const escaped = bodyText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const result = await sendMailboxEmail(supabase, {
    mailboxId: draft.mailbox_id,
    to: draft.to_addresses,
    subject,
    html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escaped}</div>`,
    text: bodyText,
    inReplyTo: draft.in_reply_to ?? undefined,
    references: draft.references_header ?? undefined,
    threadId: draft.thread_id ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 502 });
  }

  await supabase
    .from("email_messages")
    .update({
      draft_status: "approved",
      approved_by: auth.profile.id,
      approved_at: new Date().toISOString(),
      ...(edits && { subject, text_body: bodyText }),
    })
    .eq("id", draftId);

  await logActivity({
    activityType: "email_outbound",
    actorType: "user",
    actorUserId: auth.profile.id,
    emailMessageId: result.emailMessageId ?? null,
    referenceType: "email_message",
    referenceId: result.emailMessageId ?? draftId,
    metadata: { ai_assisted: true, subject, edited: Boolean(edits) },
  });

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "ai_draft_approved",
    targetEntity: "email_message",
    targetId: draftId,
    targetLabel: subject,
    reason: edits ? "approved with edits" : "approved as drafted",
  });

  return NextResponse.json({ success: true, action: "approve", messageId: result.messageId });
}
