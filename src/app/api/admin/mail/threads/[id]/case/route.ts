import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { getMailboxPermission, permissionAtLeast } from "@/lib/mail/access";
import { createCase, linkThreadToCase, unlinkThreadFromCase } from "@/lib/deals/threads";

const bodySchema = z.union([
  z.object({ dealThreadId: z.string().uuid() }),
  z.object({
    newCase: z.object({
      title: z.string().min(1).max(500),
      companyId: z.string().uuid(),
      side: z.enum(["buyer", "supplier"]),
    }),
  }),
]);

/** Loads the thread's mailbox via the RLS-bound client (confirms both
 * existence and that the caller can see it), then requires 'manage'
 * permission on that mailbox — same gate src/app/api/admin/mail/send/route.ts
 * uses for sending, since linking/unlinking a case is an equally
 * mailbox-scoped write. */
async function requireManageOnThreadMailbox(threadId: string, auth: { profile: { id: string }; role: string }) {
  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("email_threads")
    .select("mailbox_id")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) {
    return { ok: false as const, response: NextResponse.json({ error: "Thread not found" }, { status: 404 }) };
  }

  const permission = await getMailboxPermission(supabase, thread.mailbox_id, auth.profile.id, auth.role);
  if (!permissionAtLeast(permission, "manage")) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "You do not have manage permission on this mailbox" },
        { status: 403 }
      ),
    };
  }
  return { ok: true as const };
}

/**
 * POST /api/admin/mail/threads/[id]/case — Link a thread to an existing
 * case, or create a new case (deal_thread) and link in one step.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const mailboxGate = await requireManageOnThreadMailbox(id, auth);
  if (!mailboxGate.ok) return mailboxGate.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Provide dealThreadId or newCase {title, companyId, side}" },
      { status: 400 }
    );
  }

  let dealThreadId: string;
  if ("dealThreadId" in parsed.data) {
    dealThreadId = parsed.data.dealThreadId;
  } else {
    const created = await createCase({
      title: parsed.data.newCase.title,
      buyerCompanyId: parsed.data.newCase.side === "buyer" ? parsed.data.newCase.companyId : null,
      supplierCompanyId: parsed.data.newCase.side === "supplier" ? parsed.data.newCase.companyId : null,
    });
    if (!created) {
      return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
    }
    dealThreadId = created;
  }

  const ok = await linkThreadToCase(id, dealThreadId);
  if (!ok) {
    return NextResponse.json({ error: "Failed to link thread to case" }, { status: 500 });
  }

  return NextResponse.json({ success: true, dealThreadId });
}

/**
 * DELETE /api/admin/mail/threads/[id]/case — Unlink a thread from its case.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const mailboxGate = await requireManageOnThreadMailbox(id, auth);
  if (!mailboxGate.ok) return mailboxGate.response;

  const ok = await unlinkThreadFromCase(id);
  if (!ok) {
    return NextResponse.json({ error: "Failed to unlink case" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
