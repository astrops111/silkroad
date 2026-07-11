import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { handleShoppingQuery } from "@/lib/ai/shopping-assistant";
import { logError } from "@/lib/logging/activity";

// Best-effort per-IP throttle (per serverless instance). Enough to stop
// casual hammering; a durable limiter can replace it later.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(24),
  locale: z.string().max(10).optional(),
});

/**
 * POST /api/ai/assistant — Public shopping/help chatbot.
 * Deliberately anonymous: no auth lookup, no user identity in context —
 * the assistant cannot access accounts or orders by design.
 * Gated by the 'shopping_assistant' feature flag.
 */
export async function POST(request: NextRequest) {
  const gateError = await requireAIFeature("shopping_assistant");
  if (gateError) {
    return NextResponse.json({ error: gateError }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — slow down a little" }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const result = await handleShoppingQuery(parsed.data.messages, parsed.data.locale);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai/assistant]", err);
    await logError({
      errorCode: "ai_request_failed",
      message: err instanceof Error ? err.message : String(err),
      source: "ai-assistant",
    }).catch(() => {});
    return NextResponse.json({ error: "Assistant unavailable" }, { status: 502 });
  }
}
