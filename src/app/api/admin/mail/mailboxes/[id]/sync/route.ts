import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { getMailboxPermission, permissionAtLeast } from "@/lib/mail/access";
import { syncMailbox } from "@/lib/mail/imap";

export const maxDuration = 120;

/**
 * POST /api/admin/mail/mailboxes/[id]/sync — "Sync now" for one mailbox.
 * Requires 'manage' permission (owner, grant, or super admin).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const userClient = await createClient();
  const permission = await getMailboxPermission(userClient, id, auth.profile.id, auth.role);
  if (!permissionAtLeast(permission, "manage")) {
    return NextResponse.json(
      { error: "You do not have manage permission on this mailbox" },
      { status: 403 }
    );
  }

  const service = createServiceClient();
  const { data: mailbox } = await service
    .from("mailboxes")
    .select("*")
    .eq("id", id)
    .single();

  if (!mailbox) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

  try {
    const results = await syncMailbox(service, mailbox);
    const fetched = results.reduce((sum, r) => sum + r.fetched, 0);
    const errors = results.filter((r) => r.error).map((r) => `${r.folder}: ${r.error}`);
    return NextResponse.json({ success: errors.length === 0, fetched, results, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
