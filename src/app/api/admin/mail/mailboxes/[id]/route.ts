import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin, isAuthError } from "@/lib/auth/guard";
import { logAdminAction } from "@/lib/logging/admin-audit";

const updateSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  mailboxType: z.enum(["shared", "personal"]).optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  imapHost: z.string().min(1).optional(),
  imapPort: z.number().int().positive().optional(),
  smtpHost: z.string().min(1).optional(),
  smtpPort: z.number().int().positive().optional(),
  username: z.string().min(1).optional(),
  credentialRef: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]*$/, "credentialRef must be an ENV_VAR-style name")
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH /api/admin/mail/mailboxes/[id] — Update mailbox settings (super admin).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireSuperAdmin();
  if (isAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const update: Record<string, unknown> = {};
  if (input.displayName !== undefined) update.display_name = input.displayName;
  if (input.mailboxType !== undefined) update.mailbox_type = input.mailboxType;
  if (input.ownerUserId !== undefined) update.owner_user_id = input.ownerUserId;
  if (input.imapHost !== undefined) update.imap_host = input.imapHost;
  if (input.imapPort !== undefined) update.imap_port = input.imapPort;
  if (input.smtpHost !== undefined) update.smtp_host = input.smtpHost;
  if (input.smtpPort !== undefined) update.smtp_port = input.smtpPort;
  if (input.username !== undefined) update.username = input.username;
  if (input.credentialRef !== undefined) update.credential_ref = input.credentialRef;
  if (input.isActive !== undefined) update.is_active = input.isActive;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("mailboxes").update(update).eq("id", id);

  if (error) {
    console.error("[admin/mail/mailboxes/[id]]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "mailbox_updated",
    targetEntity: "mailbox",
    targetId: id,
    reason: `fields: ${Object.keys(update).join(", ")}`,
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/mail/mailboxes/[id] — Remove a mailbox and, via FK
 * cascade, its sync state, threads, messages and attachment records
 * (super admin). Storage objects are retained for audit.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireSuperAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("mailboxes").delete().eq("id", id);

  if (error) {
    console.error("[admin/mail/mailboxes/[id]] delete", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "mailbox_deleted",
    targetEntity: "mailbox",
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
