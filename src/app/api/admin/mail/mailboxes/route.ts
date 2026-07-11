import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireSuperAdmin, isAuthError } from "@/lib/auth/guard";
import { getMailboxPermission } from "@/lib/mail/access";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * GET /api/admin/mail/mailboxes — Mailboxes the caller can access,
 * with the caller's permission level and sync state per mailbox.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();

  // RLS already limits rows to accessible mailboxes.
  const { data: mailboxes, error } = await supabase
    .from("mailboxes")
    .select(`
      id, address, display_name, mailbox_type, owner_user_id,
      imap_host, imap_port, smtp_host, smtp_port, username, credential_ref,
      is_active, created_at,
      mailbox_sync_state ( folder, uidvalidity, last_uid, last_synced_at )
    `)
    .order("mailbox_type")
    .order("address");

  if (error) {
    console.error("[admin/mail/mailboxes]", error);
    return NextResponse.json({ error: "Failed to load mailboxes" }, { status: 500 });
  }

  const withPermission = await Promise.all(
    (mailboxes ?? []).map(async (m) => ({
      ...m,
      myPermission: await getMailboxPermission(supabase, m.id, auth.profile.id, auth.role),
    }))
  );

  return NextResponse.json({ mailboxes: withPermission });
}

const createSchema = z.object({
  address: z.string().email(),
  displayName: z.string().min(1).max(120),
  mailboxType: z.enum(["shared", "personal"]).default("shared"),
  ownerUserId: z.string().uuid().nullable().optional(),
  imapHost: z.string().min(1).default("mail.privateemail.com"),
  imapPort: z.number().int().positive().default(993),
  smtpHost: z.string().min(1).default("mail.privateemail.com"),
  smtpPort: z.number().int().positive().default(465),
  username: z.string().min(1),
  credentialRef: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]*$/, "credentialRef must be an ENV_VAR-style name"),
  isActive: z.boolean().default(true),
});

/**
 * POST /api/admin/mail/mailboxes — Create a mailbox (super admin only).
 * credentialRef names the env var that holds the password; the password
 * itself is never sent to or stored in the database.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const input = parsed.data;

  const { data: mailbox, error } = await supabase
    .from("mailboxes")
    .insert({
      address: input.address.toLowerCase(),
      display_name: input.displayName,
      mailbox_type: input.mailboxType,
      owner_user_id: input.mailboxType === "personal" ? (input.ownerUserId ?? null) : null,
      imap_host: input.imapHost,
      imap_port: input.imapPort,
      smtp_host: input.smtpHost,
      smtp_port: input.smtpPort,
      username: input.username,
      credential_ref: input.credentialRef,
      is_active: input.isActive,
    })
    .select("id, address")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "mailbox_created",
    targetEntity: "mailbox",
    targetId: mailbox.id,
    targetLabel: mailbox.address,
  });

  return NextResponse.json({ success: true, mailbox });
}
