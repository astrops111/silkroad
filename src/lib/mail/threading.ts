import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

/** Strip Re:/Fwd:/Fw: prefixes (repeated, any case) and collapse whitespace. */
export function normalizeSubject(subject: string | null | undefined): string | null {
  if (!subject) return null;
  return (
    subject
      .replace(/^(\s*(re|fwd?|aw|tr)\s*(\[\d+\])?\s*:\s*)+/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase() || null
  );
}

interface ResolveThreadInput {
  mailboxId: string;
  inReplyTo?: string | null;
  referencesHeader?: string[] | null;
  subject?: string | null;
  sentAt?: string | null;
}

/**
 * Find the thread a message belongs to, or create one.
 * 1. RFC 5322 lookup: In-Reply-To / References against stored Message-IDs.
 * 2. Fallback: same normalized subject in the same mailbox, active in the
 *    last 30 days.
 * 3. Otherwise a fresh thread.
 */
export async function resolveThread(
  supabase: DB,
  input: ResolveThreadInput
): Promise<string> {
  const refs = [
    ...(input.inReplyTo ? [input.inReplyTo] : []),
    ...(input.referencesHeader ?? []),
  ].filter(Boolean);

  if (refs.length > 0) {
    const { data: parent } = await supabase
      .from("email_messages")
      .select("thread_id")
      .eq("mailbox_id", input.mailboxId)
      .in("message_id", refs)
      .not("thread_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (parent?.thread_id) return parent.thread_id;
  }

  const subjectNormalized = normalizeSubject(input.subject);
  if (subjectNormalized) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: bySubject } = await supabase
      .from("email_threads")
      .select("id")
      .eq("mailbox_id", input.mailboxId)
      .eq("subject_normalized", subjectNormalized)
      .gte("last_message_at", cutoff)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bySubject?.id) return bySubject.id;
  }

  const now = input.sentAt ?? new Date().toISOString();
  const { data: created, error } = await supabase
    .from("email_threads")
    .insert({
      mailbox_id: input.mailboxId,
      subject_normalized: subjectNormalized,
      first_message_at: now,
      last_message_at: now,
      message_count: 0,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create email thread: ${error?.message}`);
  }
  return created.id;
}

/** Bump thread stats after inserting a message into it. */
export async function touchThread(
  supabase: DB,
  threadId: string,
  sentAt?: string | null
): Promise<void> {
  const { data: thread } = await supabase
    .from("email_threads")
    .select("first_message_at, last_message_at, message_count")
    .eq("id", threadId)
    .single();

  if (!thread) return;

  const at = sentAt ?? new Date().toISOString();
  await supabase
    .from("email_threads")
    .update({
      message_count: thread.message_count + 1,
      first_message_at:
        !thread.first_message_at || at < thread.first_message_at ? at : thread.first_message_at,
      last_message_at:
        !thread.last_message_at || at > thread.last_message_at ? at : thread.last_message_at,
    })
    .eq("id", threadId);
}
