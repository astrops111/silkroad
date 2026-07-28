import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

const uuidSchema = z.string().uuid();
// dealThreadId/companyId/rfqId get interpolated into PostgREST .or() filter
// strings — reject anything that isn't a plain UUID before that happens,
// rather than relying on stripping metacharacters at the last step.
function parseUuidParam(value: string | null): string | null | "invalid" {
  if (!value) return null;
  return uuidSchema.safeParse(value).success ? value : "invalid";
}

/**
 * GET /api/admin/mail/threads — List email threads the caller can access.
 * RLS (can_access_mailbox) scopes rows to the user's mailbox grants.
 * Query: mailboxId?, search?, unreadOnly?, page?, pageSize?,
 *        dealThreadId? (case filter), companyId?, rfqId?, personEmail?
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const mailboxId = searchParams.get("mailboxId");
  const search = searchParams.get("search");
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const dealThreadId = parseUuidParam(searchParams.get("dealThreadId"));
  const companyId = parseUuidParam(searchParams.get("companyId"));
  const rfqId = parseUuidParam(searchParams.get("rfqId"));
  const personEmail = searchParams.get("personEmail");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "30", 10), 100);
  const from = (page - 1) * pageSize;

  if (dealThreadId === "invalid" || companyId === "invalid" || rfqId === "invalid") {
    return NextResponse.json({ error: "Invalid filter id" }, { status: 400 });
  }

  // Resolve company/RFQ filters to a set of case (deal_thread) ids first —
  // both narrow which cases are in play, so a thread must belong to one of
  // the resulting cases regardless of which of the two filters supplied it.
  let allowedDealThreadIds: string[] | null = null;
  if (companyId || rfqId) {
    let dealQuery = supabase.from("deal_threads").select("id");
    if (companyId) {
      dealQuery = dealQuery.or(
        `buyer_company_id.eq.${companyId},supplier_company_id.eq.${companyId}`
      );
    }
    if (rfqId) dealQuery = dealQuery.eq("rfq_id", rfqId);
    const { data: deals } = await dealQuery;
    allowedDealThreadIds = (deals ?? []).map((d) => d.id);
    if (allowedDealThreadIds.length === 0) {
      return NextResponse.json({ threads: [], total: 0, page, pageSize });
    }
  }
  if (dealThreadId) {
    allowedDealThreadIds = allowedDealThreadIds
      ? allowedDealThreadIds.filter((id) => id === dealThreadId)
      : [dealThreadId];
    if (allowedDealThreadIds.length === 0) {
      return NextResponse.json({ threads: [], total: 0, page, pageSize });
    }
  }

  // Resolve a person filter to the set of thread ids that have at least
  // one message from/to that address.
  let allowedThreadIds: string[] | null = null;
  if (personEmail) {
    const { data: fromMatches } = await supabase
      .from("email_messages")
      .select("thread_id")
      .ilike("from_address", `%${personEmail}%`);
    const { data: toMatches } = await supabase
      .from("email_messages")
      .select("thread_id")
      .contains("to_addresses", [personEmail]);
    const ids = new Set<string>();
    for (const m of fromMatches ?? []) if (m.thread_id) ids.add(m.thread_id);
    for (const m of toMatches ?? []) if (m.thread_id) ids.add(m.thread_id);
    allowedThreadIds = [...ids];
    if (allowedThreadIds.length === 0) {
      return NextResponse.json({ threads: [], total: 0, page, pageSize });
    }
  }

  let query = supabase
    .from("email_threads")
    .select(
      "id, mailbox_id, subject_normalized, first_message_at, last_message_at, message_count, deal_thread_id, mailboxes ( address, display_name )",
      { count: "exact" }
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(from, from + pageSize - 1);

  if (mailboxId) query = query.eq("mailbox_id", mailboxId);
  if (search) query = query.ilike("subject_normalized", `%${search.toLowerCase()}%`);
  if (allowedDealThreadIds) query = query.in("deal_thread_id", allowedDealThreadIds);
  if (allowedThreadIds) query = query.in("id", allowedThreadIds);

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
