import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/mail/threads — List email threads the caller can access.
 * RLS (can_access_mailbox) scopes rows to the user's mailbox grants.
 * Query: mailboxId?, search?, unreadOnly?, page?, pageSize?
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const mailboxId = searchParams.get("mailboxId");
  const search = searchParams.get("search");
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "30", 10), 100);
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("email_threads")
    .select("id, mailbox_id, subject_normalized, first_message_at, last_message_at, message_count", {
      count: "exact",
    })
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(from, from + pageSize - 1);

  if (mailboxId) query = query.eq("mailbox_id", mailboxId);
  if (search) query = query.ilike("subject_normalized", `%${search.toLowerCase()}%`);

  const { data: threads, count, error } = await query;
  if (error) {
    console.error("[admin/mail/threads]", error);
    return NextResponse.json({ error: "Failed to load threads" }, { status: 500 });
  }

  const threadIds = (threads ?? []).map((t) => t.id);
  let latestByThread = new Map<string, unknown>();
  let unreadByThread = new Map<string, number>();

  if (threadIds.length > 0) {
    // Latest message per thread + unread counts in two small queries.
    const [{ data: recentMessages }, { data: unread }] = await Promise.all([
      supabase
        .from("email_messages")
        .select("thread_id, from_address, from_name, subject, snippet, direction, sent_at")
        .in("thread_id", threadIds)
        .order("sent_at", { ascending: false, nullsFirst: false })
        .limit(threadIds.length * 4),
      supabase
        .from("email_messages")
        .select("thread_id")
        .in("thread_id", threadIds)
        .eq("is_read", false)
        .eq("direction", "inbound"),
    ]);

    latestByThread = new Map();
    for (const m of recentMessages ?? []) {
      if (m.thread_id && !latestByThread.has(m.thread_id)) latestByThread.set(m.thread_id, m);
    }
    unreadByThread = new Map();
    for (const u of unread ?? []) {
      if (!u.thread_id) continue;
      unreadByThread.set(u.thread_id, (unreadByThread.get(u.thread_id) ?? 0) + 1);
    }
  }

  let items = (threads ?? []).map((t) => ({
    ...t,
    latestMessage: latestByThread.get(t.id) ?? null,
    unreadCount: unreadByThread.get(t.id) ?? 0,
  }));
  if (unreadOnly) items = items.filter((t) => t.unreadCount > 0);

  return NextResponse.json({ threads: items, total: count ?? 0, page, pageSize });
}
