/**
 * Telegram ops notifications — mirrors the internal ops email alerts into a
 * Telegram chat via a bot. Configure with:
 *
 *   TELEGRAM_BOT_TOKEN   — from @BotFather (/newbot)
 *   TELEGRAM_OPS_CHAT_ID — the chat/group id the bot posts into. Add the bot
 *                          to the group (or DM it /start), then read the id
 *                          from https://api.telegram.org/bot<token>/getUpdates
 *
 * No-ops silently when either var is missing, and never throws — Telegram
 * being down must never break an order/RFQ/settlement flow.
 */

const TELEGRAM_API = "https://api.telegram.org";

/** Escape for Telegram HTML parse mode (only &, <, > are special). */
export function tgEsc(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Per-mailbox chat routing: TELEGRAM_CHAT_ID_<LOCALPART> (e.g.
 * TELEGRAM_CHAT_ID_SUPPORT routes support@… mail to its own chat).
 * Returns undefined when unset so callers fall back to TELEGRAM_OPS_CHAT_ID.
 */
export function telegramChatIdForMailbox(address: string): string | undefined {
  const local = address.split("@")[0]?.replace(/[^a-z0-9]/gi, "_").toUpperCase();
  return (local && process.env[`TELEGRAM_CHAT_ID_${local}`]) || undefined;
}

export interface TelegramNotifyOptions {
  /** Override the destination chat (defaults to TELEGRAM_OPS_CHAT_ID). */
  chatId?: string;
  /** Inline "open in admin"-style button. */
  button?: { text: string; url: string };
  /** Deliver without a push alert/sound — for low-priority notices only. */
  silent?: boolean;
}

/**
 * Telegram rejects the ENTIRE message when an inline button URL is not a
 * public http(s) URL (e.g. localhost in dev) — so only attach buttons that
 * Telegram will accept.
 */
function isPublicUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname;
    return !(
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * Telegram caps messages at 4096 chars and rejects the ENTIRE message when
 * its HTML is malformed — a blind slice can cut inside a tag. Our messages
 * are line-based with tags never spanning lines, so truncate at the last
 * newline that fits (with room for an ellipsis line).
 */
function truncateHtml(html: string, max: number): string {
  if (html.length <= max) return html;
  const cut = html.lastIndexOf("\n", max - 2);
  return cut > 0 ? `${html.slice(0, cut)}\n…` : html.slice(0, max);
}

/**
 * Send an HTML-formatted message to the ops Telegram chat.
 * Returns true when Telegram accepted the message.
 */
export async function sendTelegramNotification(
  html: string,
  options: TelegramNotifyOptions = {}
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId ?? process.env.TELEGRAM_OPS_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: truncateHtml(html, 4096),
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        disable_notification: options.silent === true,
        ...(options.button && isPublicUrl(options.button.url)
          ? {
              reply_markup: {
                inline_keyboard: [[{ text: options.button.text, url: options.button.url }]],
              },
            }
          : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[telegram] sendMessage failed", res.status, body.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] sendMessage error", err);
    return false;
  }
}
