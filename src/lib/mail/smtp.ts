import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { logEmailDelivery } from "@/lib/logging/email";
import { logError } from "@/lib/logging/activity";
import { resolveThread, touchThread } from "./threading";

type DB = SupabaseClient<Database>;

export interface SendMailboxEmailInput {
  mailboxId: string;
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  /** Message-ID being replied to — threads the reply for recipients. */
  inReplyTo?: string;
  references?: string[];
  /** Attach to a known thread instead of resolving by headers/subject. */
  threadId?: string;
}

export interface SendMailboxEmailResult {
  success: boolean;
  messageId?: string;
  emailMessageId?: string;
  threadId?: string;
  error?: string;
}

/**
 * Send from a hosted mailbox over SMTP and record the outbound message.
 * The host auto-saves a copy to the Sent folder; the next IMAP sync
 * dedupes it via the unique (mailbox_id, message_id) index.
 */
export async function sendMailboxEmail(
  supabase: DB,
  input: SendMailboxEmailInput
): Promise<SendMailboxEmailResult> {
  const { data: mailbox } = await supabase
    .from("mailboxes")
    .select("*")
    .eq("id", input.mailboxId)
    .single();

  if (!mailbox) return { success: false, error: "Mailbox not found" };
  if (!mailbox.is_active) return { success: false, error: "Mailbox is inactive" };

  const password = process.env[mailbox.credential_ref];
  if (!password) {
    return { success: false, error: `Missing credential env var ${mailbox.credential_ref}` };
  }

  const transporter = nodemailer.createTransport({
    host: mailbox.smtp_host,
    port: mailbox.smtp_port,
    secure: true,
    auth: { user: mailbox.username, pass: password },
  });

  let messageId: string;
  try {
    const info = await transporter.sendMail({
      from: `"${mailbox.display_name}" <${mailbox.address}>`,
      to: input.to.join(", "),
      cc: input.cc?.join(", "),
      subject: input.subject,
      html: input.html,
      text: input.text,
      inReplyTo: input.inReplyTo,
      references: input.references,
    });
    messageId = info.messageId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmailDelivery({
      recipientEmail: input.to[0] ?? "",
      subject: input.subject,
      template: "webmail",
      status: "failed",
      errorMessage: message,
    }).catch(() => {});
    await logError({
      errorCode: "smtp_send_failed",
      message,
      source: "mail-smtp",
      metadata: { mailboxId: input.mailboxId, subject: input.subject },
    }).catch(() => {});
    return { success: false, error: message };
  }

  const sentAt = new Date().toISOString();
  const threadId =
    input.threadId ??
    (await resolveThread(supabase, {
      mailboxId: mailbox.id,
      inReplyTo: input.inReplyTo ?? null,
      referencesHeader: input.references ?? null,
      subject: input.subject,
      sentAt,
    }));

  const { data: row, error: insertError } = await supabase
    .from("email_messages")
    .insert({
      mailbox_id: mailbox.id,
      thread_id: threadId,
      direction: "outbound",
      message_id: messageId,
      in_reply_to: input.inReplyTo ?? null,
      references_header: input.references ?? null,
      folder: "Sent",
      from_address: mailbox.address,
      from_name: mailbox.display_name,
      to_addresses: input.to.map((a) => a.toLowerCase()),
      cc_addresses: input.cc?.map((a) => a.toLowerCase()) ?? null,
      subject: input.subject,
      text_body: input.text ?? null,
      html_body: input.html,
      snippet: (input.text ?? input.html.replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200),
      is_read: true,
      sent_at: sentAt,
    })
    .select("id")
    .single();

  if (!insertError && row) {
    await touchThread(supabase, threadId, sentAt);
  } else if (insertError) {
    console.error("[mail/smtp] Outbound record insert failed:", insertError.message);
    await logError({
      errorCode: "smtp_outbound_record_failed",
      message: insertError.message,
      source: "mail-smtp",
      severity: "warning",
      metadata: { mailboxId: input.mailboxId, subject: input.subject },
    }).catch(() => {});
  }

  await logEmailDelivery({
    recipientEmail: input.to[0] ?? "",
    subject: input.subject,
    template: "webmail",
    status: "sent",
  }).catch(() => {});

  return {
    success: true,
    messageId,
    emailMessageId: row?.id,
    threadId,
  };
}
