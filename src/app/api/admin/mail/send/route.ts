import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { getMailboxPermission, permissionAtLeast } from "@/lib/mail/access";
import { sendMailboxEmail } from "@/lib/mail/smtp";

const sendSchema = z.object({
  mailboxId: z.string().uuid(),
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().min(1).max(500),
  html: z.string().min(1).max(500_000),
  text: z.string().max(500_000).optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  threadId: z.string().uuid().optional(),
});

/**
 * POST /api/admin/mail/send — Compose or reply from a hosted mailbox.
 * Requires 'send' (or higher) permission on the mailbox.
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

  const parsed = sendSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const permission = await getMailboxPermission(
    supabase,
    parsed.data.mailboxId,
    auth.profile.id,
    auth.role
  );

  if (!permissionAtLeast(permission, "send")) {
    return NextResponse.json(
      { error: "You do not have send permission on this mailbox" },
      { status: 403 }
    );
  }

  const result = await sendMailboxEmail(supabase, parsed.data);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    emailMessageId: result.emailMessageId,
    threadId: result.threadId,
  });
}
