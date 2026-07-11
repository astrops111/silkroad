import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/mail/threads/[id] — Messages + attachments of one thread.
 * RLS (can_access_mailbox) already scopes visibility.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();

  const { data: thread, error: threadError } = await supabase
    .from("email_threads")
    .select("id, mailbox_id, subject_normalized, first_message_at, last_message_at, message_count, deal_thread_id")
    .eq("id", id)
    .maybeSingle();

  if (threadError || !thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from("email_messages")
    .select(`
      id, direction, message_id, in_reply_to, folder,
      from_address, from_name, to_addresses, cc_addresses,
      subject, text_body, html_body, snippet, is_read, sent_at, created_at,
      email_attachments ( id, filename, content_type, size_bytes )
    `)
    .eq("thread_id", id)
    .order("sent_at", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("[admin/mail/threads/[id]]", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  return NextResponse.json({ thread, messages: messages ?? [] });
}

/**
 * PATCH /api/admin/mail/threads/[id] — Mark all inbound messages read.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_messages")
    .update({ is_read: true })
    .eq("thread_id", id)
    .eq("is_read", false);

  if (error) {
    console.error("[admin/mail/threads/[id]] mark read", error);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
