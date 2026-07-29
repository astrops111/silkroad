import { NextRequest, NextResponse } from "next/server";
import { sendTelegramNotification } from "@/lib/telegram/notify";
import { buildErrorDigest } from "@/lib/telegram/digest";

/**
 * POST /api/webhooks/telegram — receives bot updates (set via setWebhook).
 * Only supports /digest [Nh|Nd] today, restricted to the ops/errors chats so
 * error details (messages, sources) never leak to a random DM.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expected) {
    console.error("[webhook/telegram] TELEGRAM_WEBHOOK_SECRET not configured");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const { timingSafeEqual } = await import("crypto");
  const expBuf = Buffer.from(expected);
  const provBuf = Buffer.from(provided);
  if (expBuf.length !== provBuf.length || !timingSafeEqual(expBuf, provBuf)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const text = update?.message?.text as string | undefined;
  const chatId = update?.message?.chat?.id as number | undefined;
  if (!text || chatId === undefined) return NextResponse.json({ ok: true });

  const allowedChatIds = new Set(
    [process.env.TELEGRAM_ERRORS_CHAT_ID, process.env.TELEGRAM_OPS_CHAT_ID].filter(Boolean)
  );
  if (!allowedChatIds.has(String(chatId))) return NextResponse.json({ ok: true });

  const match = text.trim().match(/^\/digest(?:@\w+)?(?:\s+(\d+)([hd]))?/i);
  if (match) {
    const amount = match[1] ? parseInt(match[1], 10) : 24;
    const hours = match[2]?.toLowerCase() === "d" ? amount * 24 : amount;
    const digest = await buildErrorDigest(hours);
    await sendTelegramNotification(digest, { chatId: String(chatId) });
  }

  return NextResponse.json({ ok: true });
}
