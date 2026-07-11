import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin, isAuthError } from "@/lib/auth/guard";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * GET /api/admin/mail/mailboxes/[id]/permissions — Grants on a mailbox.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireSuperAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { data: grants, error } = await supabase
    .from("mailbox_permissions")
    .select(`
      id, permission, granted_at,
      user_profiles!mailbox_permissions_user_id_fkey ( id, full_name, email )
    `)
    .eq("mailbox_id", id)
    .order("granted_at", { ascending: true });

  if (error) {
    console.error("[admin/mail/permissions]", error);
    return NextResponse.json({ error: "Failed to load grants" }, { status: 500 });
  }

  return NextResponse.json({ permissions: grants ?? [] });
}

const grantSchema = z.object({
  userId: z.string().uuid(),
  permission: z.enum(["read", "send", "manage"]),
});

/**
 * POST /api/admin/mail/mailboxes/[id]/permissions — Add/update a grant.
 */
export async function POST(
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

  const parsed = grantSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("mailbox_permissions").upsert(
    {
      mailbox_id: id,
      user_id: parsed.data.userId,
      permission: parsed.data.permission,
      granted_by: auth.profile.id,
      granted_at: new Date().toISOString(),
    },
    { onConflict: "mailbox_id,user_id" }
  );

  if (error) {
    console.error("[admin/mail/permissions] upsert", error);
    return NextResponse.json({ error: "Failed to save grant" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "mailbox_permission_granted",
    targetEntity: "mailbox",
    targetId: id,
    reason: `user ${parsed.data.userId} → ${parsed.data.permission}`,
  });

  return NextResponse.json({ success: true });
}

const revokeSchema = z.object({ userId: z.string().uuid() });

/**
 * DELETE /api/admin/mail/mailboxes/[id]/permissions — Revoke a grant.
 */
export async function DELETE(
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

  const parsed = revokeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mailbox_permissions")
    .delete()
    .eq("mailbox_id", id)
    .eq("user_id", parsed.data.userId);

  if (error) {
    console.error("[admin/mail/permissions] delete", error);
    return NextResponse.json({ error: "Failed to revoke grant" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "mailbox_permission_revoked",
    targetEntity: "mailbox",
    targetId: id,
    reason: `user ${parsed.data.userId}`,
  });

  return NextResponse.json({ success: true });
}
