import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { isCapacityError, estimateCostUsd } from "@/lib/ai/nvidia";
import { handleShoppingQuery } from "@/lib/ai/shopping-assistant";
import { logError } from "@/lib/logging/activity";
import { createServiceClient } from "@/lib/supabase/server";

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
  // Anonymous conversation tracking: random client-generated session id and
  // the page the exchange happened on — no user identity, by design.
  sessionId: z.string().uuid().optional(),
  page: z.string().max(300).optional(),
});

/** Fire-and-forget conversation log (session + page context, admin-read-only).
 *  The assistant row also carries model, token usage, and estimated cost —
 *  aggregated per day/model by the shopping_assistant_daily_costs view. */
function logExchange(opts: {
  sessionId: string;
  page?: string;
  locale?: string;
  userContent: string;
  assistantContent: string;
  productsMentioned?: string[];
  usage?: { model: string; inputTokens: number; outputTokens: number };
}): void {
  const supabase = createServiceClient();
  void supabase
    .from("shopping_assistant_logs")
    .insert([
      {
        session_id: opts.sessionId,
        role: "user",
        content: opts.userContent.slice(0, 4000),
        page_path: opts.page ?? null,
        locale: opts.locale ?? null,
      },
      {
        session_id: opts.sessionId,
        role: "assistant",
        content: opts.assistantContent.slice(0, 16000),
        page_path: opts.page ?? null,
        locale: opts.locale ?? null,
        products_mentioned: opts.productsMentioned ?? null,
        model: opts.usage?.model || null,
        input_tokens: opts.usage?.inputTokens ?? null,
        output_tokens: opts.usage?.outputTokens ?? null,
        cost_usd: opts.usage
          ? estimateCostUsd(opts.usage.model, opts.usage.inputTokens, opts.usage.outputTokens)
          : null,
      },
    ])
    .then(({ error }) => {
      if (error) console.error("[ai/assistant] log failed:", error.message);
    });
}

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

  // Stream newline-delimited JSON: {delta} chunks as tokens arrive, then
  // {done, reply, productsMentioned}. Errors mid-stream become an {error} line
  // (headers are already sent, so the status stays 200 — the widget renders
  // the error text as the assistant message).
  const { messages, locale, page } = parsed.data;
  const sessionId = parsed.data.sessionId ?? crypto.randomUUID();
  const lastUserMessage = messages[messages.length - 1]?.content ?? "";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await handleShoppingQuery(messages, locale, (delta) => write({ delta }));
        write({ done: true, reply: result.reply, productsMentioned: result.productsMentioned });
        logExchange({
          sessionId,
          page,
          locale,
          userContent: lastUserMessage,
          assistantContent: result.reply,
          productsMentioned: result.productsMentioned,
          usage: result.usage,
        });
      } catch (err) {
        console.error("[ai/assistant]", err);
        await logError({
          errorCode: "ai_request_failed",
          message: err instanceof Error ? err.message : String(err),
          source: "ai-assistant",
        }).catch(() => {});
        const friendly = isCapacityError(err)
          ? "The assistant is very busy right now — please try again in a minute."
          : "Assistant unavailable — please try again.";
        write({ error: friendly });
        logExchange({
          sessionId,
          page,
          locale,
          userContent: lastUserMessage,
          assistantContent: `[error] ${friendly}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
