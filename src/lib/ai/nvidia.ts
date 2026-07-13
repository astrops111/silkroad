import OpenAI from "openai";

// ============================================================
// NVIDIA Build (integrate.api.nvidia.com) — shared AI client.
// All platform AI services route through DeepSeek on NVIDIA's
// OpenAI-compatible endpoint. API key lives in .env (NVIDIA_API_KEY).
// ============================================================

export const NVIDIA_MODEL = "deepseek-ai/deepseek-v4-pro";
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

/** Tried in order when a model is at capacity (503 ResourceExhausted).
 *  v4-pro primary; glm-5.2 secondary (fastest probe on this account, 751ms);
 *  flash last — its shared workers were persistently saturated (2026-07-14). */
export const NVIDIA_FALLBACK_MODELS: string[] = [
  NVIDIA_MODEL,
  "z-ai/glm-5.2",
  "deepseek-ai/deepseek-v4-flash",
];

export function nvidiaClient(): OpenAI {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY is not set in the environment");
  // The shared DeepSeek endpoint intermittently returns 503 ResourceExhausted
  // ("all workers are busy"). Two SDK retries per model — sustained congestion
  // is handled by withModelFallback switching models instead of retrying more.
  return new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL, maxRetries: 2, timeout: 120_000 });
}

/** USD per 1M tokens — ESTIMATES for the cost aggregator; adjust to your
 *  actual NVIDIA Build billing (the developer tier is credit-based, so these
 *  approximate market rates for the same models). Unknown models cost 0. */
const MODEL_RATES: Record<string, { inPerM: number; outPerM: number }> = {
  "deepseek-ai/deepseek-v4-pro": { inPerM: 0.5, outPerM: 1.5 },
  "deepseek-ai/deepseek-v4-flash": { inPerM: 0.1, outPerM: 0.4 },
  "z-ai/glm-5.2": { inPerM: 0.6, outPerM: 2.2 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const r = MODEL_RATES[model] ?? { inPerM: 0, outPerM: 0 };
  return (inputTokens * r.inPerM + outputTokens * r.outPerM) / 1_000_000;
}

/**
 * Run `fn` against each fallback model in order until one is not at capacity.
 * Non-capacity errors (auth, bad request) are rethrown immediately.
 */
export async function withModelFallback<T>(fn: (model: string) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (const model of NVIDIA_FALLBACK_MODELS) {
    try {
      return await fn(model);
    } catch (err) {
      if (!isCapacityError(err)) throw err;
      lastErr = err;
      console.warn(`[nvidia] ${model} at capacity — trying next fallback model`);
    }
  }
  throw lastErr;
}

/** True when an error is NVIDIA-side congestion (worth telling users to retry).
 *  Congestion can also surface MID-STREAM (the worker accepts the request then
 *  emits ResourceExhausted while streaming), so this matches on message too.
 *  Errors flagged `noFallback` (partial output already shown) never retry. */
export function isCapacityError(err: unknown): boolean {
  if ((err as { noFallback?: boolean })?.noFallback) return false;
  const status = (err as { status?: number })?.status;
  const msg = err instanceof Error ? err.message : String(err);
  return status === 503 || status === 429 || /ResourceExhausted|workers are busy/i.test(msg);
}

/** DeepSeek thinking-mode switch — an NVIDIA extension outside OpenAI's types.
 *  Reasoning arrives on message.reasoning/reasoning_content; content stays the
 *  final answer, so JSON-only prompts keep working. thinking=false must be sent
 *  EXPLICITLY — the model defaults to thinking ON, which adds ~45-60s per call;
 *  interactive chat surfaces opt out, background jobs keep it for quality. */
function thinkingKwargs(thinking: boolean): Record<string, unknown> {
  return {
    chat_template_kwargs: thinking
      ? { thinking: true, reasoning_effort: "high" }
      : { thinking: false },
  };
}

export interface AiTextOptions {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
  thinking?: boolean;
}

/**
 * Single text completion — a thin Anthropic-messages-like adapter so the
 * existing services keep their system/messages/maxTokens call shape.
 * Returns the assistant's final text (never the reasoning trace).
 */
export async function aiText(opts: AiTextOptions): Promise<string> {
  const client = nvidiaClient();
  const completion = await withModelFallback((model) =>
    client.chat.completions.create({
      model,
      messages: [
        ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
        ...opts.messages,
      ],
      temperature: opts.temperature ?? 1,
      top_p: 0.95,
      max_tokens: opts.maxTokens ?? 16384,
      stream: false,
      ...thinkingKwargs(opts.thinking ?? true),
    })
  );
  return completion.choices[0]?.message?.content ?? "";
}
