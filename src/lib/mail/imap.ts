import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveThread, touchThread } from "./threading";
import { resolveContact } from "@/lib/crm/contacts";
import { logActivity } from "@/lib/crm/activities";
import { ensureSupportTicketForEmail } from "@/lib/support/tickets";
import { sendMailboxEmail } from "./smtp";

type DB = SupabaseClient<Database>;
type MailboxRow = Database["public"]["Tables"]["mailboxes"]["Row"];

/** Folders synced per mailbox. Namecheap Private Email uses "Sent". */
const SYNC_FOLDERS = ["INBOX", "Sent"] as const;

/** Cap per folder per run — serverless invocations must stay short; the
 * last_uid checkpoint lets big backfills complete across multiple runs. */
const FETCH_CAP = 50;

const ATTACHMENT_BUCKET = "email-attachments";

export interface FolderSyncResult {
  folder: string;
  fetched: number;
  skipped: number;
  error?: string;
}

/**
 * Incrementally sync one mailbox over IMAP into email_messages.
 * UID-based: fetches only UIDs above the stored checkpoint; a UIDVALIDITY
 * change resets the checkpoint (bounded re-sync, dedup via unique indexes).
 */
export async function syncMailbox(
  supabase: DB,
  mailbox: MailboxRow
): Promise<FolderSyncResult[]> {
  const password = process.env[mailbox.credential_ref];
  if (!password) {
    return SYNC_FOLDERS.map((folder) => ({
      folder,
      fetched: 0,
      skipped: 0,
      error: `Missing credential env var ${mailbox.credential_ref}`,
    }));
  }

  const client = new ImapFlow({
    host: mailbox.imap_host,
    port: mailbox.imap_port,
    secure: true,
    auth: { user: mailbox.username, pass: password },
    logger: false,
  });

  const results: FolderSyncResult[] = [];

  try {
    await client.connect();

    for (const folder of SYNC_FOLDERS) {
      try {
        results.push(await syncFolder(supabase, client, mailbox, folder));
      } catch (err) {
        results.push({
          folder,
          fetched: 0,
          skipped: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return results;
}

async function syncFolder(
  supabase: DB,
  client: ImapFlow,
  mailbox: MailboxRow,
  folder: string
): Promise<FolderSyncResult> {
  const { data: state } = await supabase
    .from("mailbox_sync_state")
    .select("uidvalidity, last_uid")
    .eq("mailbox_id", mailbox.id)
    .eq("folder", folder)
    .maybeSingle();

  const lock = await client.getMailboxLock(folder);
  let fetched = 0;
  let skipped = 0;
  let maxUid = state?.last_uid ?? 0;

  try {
    const box = client.mailbox;
    if (!box || typeof box === "boolean") {
      return { folder, fetched, skipped, error: "Mailbox open failed" };
    }

    const uidValidity = Number(box.uidValidity ?? 0);
    let lastUid = state?.last_uid ?? 0;

    // UIDVALIDITY changed — server renumbered; restart from 0 (dedup by
    // Message-ID prevents duplicate rows during the re-sync).
    if (state?.uidvalidity != null && Number(state.uidvalidity) !== uidValidity) {
      lastUid = 0;
      maxUid = 0;
    }

    // IMAP quirk: "start:*" returns the highest-UID message even when start
    // exceeds it, so every UID must still be checked against lastUid.
    for await (const msg of client.fetch(
      `${lastUid + 1}:*`,
      { uid: true, source: true },
      { uid: true }
    )) {
      if (msg.uid <= lastUid) continue;
      if (fetched + skipped >= FETCH_CAP) break;
      if (!msg.source) continue;

      const parsed = await simpleParser(msg.source);
      const inserted = await insertMessage(supabase, mailbox, folder, msg.uid, parsed);
      if (inserted) fetched++;
      else skipped++;
      if (msg.uid > maxUid) maxUid = msg.uid;
    }

    await supabase.from("mailbox_sync_state").upsert(
      {
        mailbox_id: mailbox.id,
        folder,
        uidvalidity: uidValidity,
        last_uid: maxUid,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "mailbox_id,folder" }
    );
  } finally {
    lock.release();
  }

  return { folder, fetched, skipped };
}

/** Returns true if a new row was created (false = duplicate, skipped). */
async function insertMessage(
  supabase: DB,
  mailbox: MailboxRow,
  folder: string,
  uid: number,
  parsed: ParsedMail
): Promise<boolean> {
  const toAddresses = addressList(parsed.to);
  const ccAddresses = addressList(parsed.cc);
  const fromAddress = firstAddress(parsed.from) ?? "unknown@unknown";
  const sentAt = parsed.date?.toISOString() ?? null;
  const textBody = parsed.text ?? null;

  const threadId = await resolveThread(supabase, {
    mailboxId: mailbox.id,
    inReplyTo: parsed.inReplyTo ?? null,
    referencesHeader: normalizeReferences(parsed.references),
    subject: parsed.subject ?? null,
    sentAt,
  });

  const { data: row, error } = await supabase
    .from("email_messages")
    .insert({
      mailbox_id: mailbox.id,
      thread_id: threadId,
      direction: folder === "Sent" ? "outbound" : "inbound",
      message_id: parsed.messageId ?? null,
      in_reply_to: parsed.inReplyTo ?? null,
      references_header: normalizeReferences(parsed.references),
      imap_uid: uid,
      folder,
      from_address: fromAddress,
      from_name: parsed.from?.value?.[0]?.name || null,
      to_addresses: toAddresses.length > 0 ? toAddresses : ["undisclosed-recipients"],
      cc_addresses: ccAddresses.length > 0 ? ccAddresses : null,
      subject: parsed.subject ?? null,
      text_body: textBody,
      html_body: typeof parsed.html === "string" ? parsed.html : null,
      snippet: textBody ? textBody.replace(/\s+/g, " ").trim().slice(0, 200) : null,
      sent_at: sentAt,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = duplicate (already synced via SMTP insert or a prior run)
    if (error.code === "23505") return false;
    throw new Error(`email_messages insert failed: ${error.message}`);
  }

  await touchThread(supabase, threadId, sentAt);

  // CRM: inbound senders become contacts; every inbound email is an activity
  if (folder !== "Sent") {
    const contactId = await resolveContact({
      email: fromAddress,
      fullName: parsed.from?.value?.[0]?.name || null,
      source: "email",
    });
    await logActivity({
      activityType: "email_inbound",
      contactId,
      emailMessageId: row.id,
      referenceType: "email_message",
      referenceId: row.id,
      occurredAt: sentAt ?? undefined,
      metadata: { mailbox: mailbox.address, subject: parsed.subject ?? null },
    });

    // Support mailbox → ticket intake (append to existing thread ticket
    // or open a new one with auto-acknowledgement)
    if (mailbox.address.toLowerCase().startsWith("support@")) {
      await ensureSupportTicketForEmail({
        emailMessageId: row.id,
        threadId,
        mailboxId: mailbox.id,
        fromAddress,
        fromName: parsed.from?.value?.[0]?.name || null,
        subject: parsed.subject ?? null,
        textBody: textBody,
      });
    } else {
      // Per-mailbox auto-response (support@ is covered by the ticket ack)
      await maybeAutoReply(supabase, mailbox, fromAddress, parsed.subject ?? null);
    }
  }

  for (const att of parsed.attachments ?? []) {
    const safeName = (att.filename ?? "attachment").replace(/[^\w.\-]+/g, "_");
    const storagePath = `${mailbox.id}/${row.id}/${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(storagePath, att.content, {
        contentType: att.contentType || "application/octet-stream",
        upsert: true,
      });

    if (!uploadError) {
      await supabase.from("email_attachments").insert({
        email_message_id: row.id,
        filename: att.filename ?? safeName,
        content_type: att.contentType || null,
        size_bytes: att.size ?? null,
        storage_path: storagePath,
      });
    } else {
      console.error("[mail/imap] Attachment upload failed:", storagePath, uploadError.message);
    }
  }

  return true;
}

/**
 * First-touch auto-response for mailboxes with auto_reply_enabled.
 * Loop-safe: never replies to auto-senders, our own domains, or the
 * same sender twice within the cooldown window.
 */
async function maybeAutoReply(
  supabase: DB,
  mailbox: MailboxRow,
  fromAddress: string,
  subject: string | null
): Promise<void> {
  try {
    if (!mailbox.auto_reply_enabled || !mailbox.auto_reply_template_id) return;

    const from = fromAddress.toLowerCase();
    if (/mailer-daemon|postmaster|no-?reply|donotreply|auto@/.test(from)) return;
    if (subject && /^(auto|automatic|out of office|undeliver|delivery status)/i.test(subject)) return;
    if (from.endsWith("@silkroad.africa") || from.endsWith("@silkroadafrica.com")) return;

    // Cooldown: any outbound to this sender from this mailbox recently?
    const cutoff = new Date(
      Date.now() - mailbox.auto_reply_cooldown_hours * 3600 * 1000
    ).toISOString();
    const { data: recent } = await supabase
      .from("email_messages")
      .select("id")
      .eq("mailbox_id", mailbox.id)
      .eq("direction", "outbound")
      .contains("to_addresses", [from])
      .gte("created_at", cutoff)
      .limit(1)
      .maybeSingle();
    if (recent) return;

    const { data: template } = await supabase
      .from("email_templates")
      .select("subject_template, html_template")
      .eq("id", mailbox.auto_reply_template_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!template) return;

    await sendMailboxEmail(supabase, {
      mailboxId: mailbox.id,
      to: [from],
      subject: template.subject_template.replace(/\{\{\w+\}\}/g, "").trim() || "Thanks for your message",
      html: template.html_template.replace(/\{\{\w+\}\}/g, ""),
    });
  } catch (err) {
    console.error("[mail/imap] auto-reply failed:", err);
  }
}

function addressList(addr: ParsedMail["to"]): string[] {
  if (!addr) return [];
  const objs = Array.isArray(addr) ? addr : [addr];
  return objs
    .flatMap((a) => a.value)
    .map((v) => v.address?.toLowerCase())
    .filter((v): v is string => Boolean(v));
}

function firstAddress(addr: ParsedMail["from"]): string | null {
  return addr?.value?.[0]?.address?.toLowerCase() ?? null;
}

function normalizeReferences(refs: string | string[] | undefined): string[] | null {
  if (!refs) return null;
  const list = Array.isArray(refs) ? refs : refs.split(/\s+/);
  const cleaned = list.map((r) => r.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : null;
}
