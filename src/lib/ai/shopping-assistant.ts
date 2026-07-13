import type OpenAI from "openai";
import { nvidiaClient, withModelFallback } from "@/lib/ai/nvidia";
import { createServiceClient } from "@/lib/supabase/server";
import { recommendForProduct, type RecommendedProduct } from "@/lib/ai/product-recommender";

// ============================================================
// Public shopping/help assistant.
//
// HARD PRIVACY BOUNDARY (enforced by tool design, not prompting):
// the only tools read the PUBLIC catalog and static site help.
// No tool touches accounts, orders, payments, or any user table,
// and the API route never passes user identity into this module.
// ============================================================

const MAX_TOOL_ROUNDS = 4;

const SITE_HELP = `
SilkRoad Africa — how the marketplace works:
- BROWSE & CART: buyers browse the Asia→Africa wholesale catalog and add products
  to the cart. Each product has a MOQ (minimum order quantity, often in boxes).
- MINIMUM ORDER: each supplier shipment must reach the platform minimum order
  value of $300 USD before quotes can be requested.
- RFQ (Request for Quotation): instead of direct checkout, buyers submit their
  cart as RFQs — one per supplier. Suppliers respond with quotations including
  pricing, lead time, and validity.
- LANDED COST: each quotation shows an estimated TOTAL landed cost — supplier
  price + freight + import duties + VAT — so buyers compare full door cost.
- AWARD & ORDER: the buyer awards the best quote; it converts into an order
  handled end-to-end by the platform (payment instructions follow — there is
  no direct card checkout).
- LOGISTICS: the platform manages freight, customs clearance, and last-mile
  delivery, with email and in-app tracking updates at every milestone.
- SUPPORT: support@silkroad.africa or the Support section — replies within 24h.
- ACCOUNTS: buyers/suppliers register free; suppliers undergo verification.
`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search the public product catalog by keyword — matches product name, description, AND brand (e.g. 'GOODAL'). Use a single distinctive term for brand lookups. Returns active products only.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords, e.g. 'sheet mask' or 'solar lamp'" },
          limit: { type: "number", description: "Max results (default 6)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Full public details for one product by id or slug.",
      parameters: {
        type: "object",
        properties: {
          idOrSlug: { type: "string" },
        },
        required: ["idOrSlug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recommendations",
      description: "Products related to a given product (bought/requested together, same category).",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product uuid" },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_site_help",
      description: "How the marketplace works: carts, MOQ/minimums, RFQs, quotes, landed cost, logistics, support.",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  const supabase = createServiceClient();

  switch (name) {
    case "search_products": {
      const query = String(input.query ?? "").slice(0, 100);
      const limit = Math.min(Number(input.limit) || 6, 12);
      const { data: products } = await supabase
        .from("products")
        .select("id, name, slug, brand, description, base_price, currency, moq, box_pack_qty, origin_country, lead_time_days")
        .eq("is_active", true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(limit);
      return JSON.stringify(
        (products ?? []).map((p) => ({ ...p, url: `/marketplace/${p.id}` }))
      );
    }

    case "get_product_details": {
      const idOrSlug = String(input.idOrSlug ?? "");
      const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
      const { data: product } = await supabase
        .from("products")
        .select("id, name, slug, description, base_price, currency, moq, box_pack_qty, origin_country, lead_time_days, sample_available, sample_price, brand")
        .eq(isUuid ? "id" : "slug", idOrSlug)
        .eq("is_active", true)
        .maybeSingle();
      return JSON.stringify(
        product ? { ...product, url: `/marketplace/${product.id}` } : { error: "Product not found" }
      );
    }

    case "get_recommendations": {
      const productId = String(input.productId ?? "");
      let recs: RecommendedProduct[] = [];
      if (/^[0-9a-f-]{36}$/i.test(productId)) {
        recs = await recommendForProduct(productId, 6);
      }
      return JSON.stringify(recs.map((r) => ({ ...r, url: `/marketplace/${r.product_id}` })));
    }

    case "get_site_help":
      return SITE_HELP;

    default:
      return JSON.stringify({ error: `Unknown tool ${name}` });
  }
}

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantUsage {
  model: string; // model that produced the final round
  inputTokens: number; // summed across tool rounds
  outputTokens: number;
}

export interface AssistantResponse {
  reply: string;
  productsMentioned: string[];
  usage?: AssistantUsage;
}

/**
 * One assistant turn: agentic tool loop over the public catalog only.
 * When `onDelta` is provided, assistant text is streamed to it token-by-token
 * as it arrives (tool rounds produce no visible text, so callers can render
 * deltas directly); the resolved value still carries the full reply.
 */
export async function handleShoppingQuery(
  messages: AssistantMessage[],
  locale?: string,
  onDelta?: (text: string) => void
): Promise<AssistantResponse> {
  const client = nvidiaClient();

  const system = `You are the shopping assistant for SilkRoad Africa, a wholesale
Asia→Africa B2B marketplace. You help visitors find products, decide what to buy,
and understand how the site works.

RULES:
- Use the tools to ground every product claim — never invent products or prices.
- Prices are wholesale, in minor units (divide by 100 for display) with MOQs.
- You have NO access to user accounts, orders, payments, or shipments. If asked
  about "my order", "my account", tracking, refunds or anything personal, reply
  that you can't see accounts and point them to their Dashboard → Orders page or
  support@silkroad.africa. Never guess about personal data.
- Keep answers concise and practical for wholesale buyers.
- Format every reply in Markdown: short paragraphs, bullet lists; a compact table
  only when comparing several products.
- Whenever you mention a product, link its name using the tool result's "url"
  field, e.g. [MEDIHEAL Aquaring Mask](/marketplace/<id>). Never invent URLs.
- For brand questions, search the catalog with just the brand name before
  concluding anything is unavailable.
${locale && locale !== "en" ? `- Reply in the user's language (locale: ${locale}).` : ""}`;

  const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
  ];

  const productsMentioned = new Set<string>();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let lastModel = "";

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    // The whole round (request + stream consumption) runs inside the model
    // fallback: NVIDIA congestion can kill the stream MID-FLIGHT, not just at
    // request time. Falling back is only safe while nothing has been shown to
    // the user yet — after the first visible token, errors become final.
    const { content, toolAcc, model: roundModel, usage: roundUsage } = await withModelFallback(
      async (model) => {
        const stream = await client.chat.completions.create({
          model,
          max_tokens: 1024,
          messages: conversation,
          tools: TOOLS,
          stream: true,
          stream_options: { include_usage: true },
          // Interactive chat: DeepSeek thinking mode is ON by default and adds
          // ~45-60s of hidden reasoning per round — the widget looks dead.
          ...({ chat_template_kwargs: { thinking: false } } as Record<string, unknown>),
        });

        // Accumulate the round from stream chunks: visible text is forwarded to
        // onDelta as it arrives; tool-call fragments are stitched by index; the
        // final chunk carries token usage (include_usage).
        let roundContent = "";
        let usage: { prompt_tokens?: number; completion_tokens?: number } | null = null;
        const acc: { id: string; name: string; args: string }[] = [];
        try {
          for await (const chunk of stream) {
            if (chunk.usage) usage = chunk.usage;
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;
            if (delta.content) {
              roundContent += delta.content;
              onDelta?.(delta.content);
            }
            for (const tc of delta.tool_calls ?? []) {
              const slot = (acc[tc.index] ??= { id: "", name: "", args: "" });
              if (tc.id) slot.id = tc.id;
              if (tc.function?.name) slot.name += tc.function.name;
              if (tc.function?.arguments) slot.args += tc.function.arguments;
            }
          }
        } catch (err) {
          if (roundContent.length > 0) {
            const e = err instanceof Error ? err : new Error(String(err));
            (e as { noFallback?: boolean }).noFallback = true;
            throw e;
          }
          throw err;
        }
        return { content: roundContent, toolAcc: acc, model, usage };
      }
    );
    lastModel = roundModel;
    totalInputTokens += roundUsage?.prompt_tokens ?? 0;
    totalOutputTokens += roundUsage?.completion_tokens ?? 0;
    const toolCalls = toolAcc.filter((t) => t && t.name);

    if (toolCalls.length === 0 || round === MAX_TOOL_ROUNDS) {
      const reply = content.trim();
      return {
        reply: reply || "Sorry, I could not produce an answer.",
        productsMentioned: [...productsMentioned],
        usage: { model: lastModel, inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      };
    }

    conversation.push({
      role: "assistant",
      content: content || null,
      tool_calls: toolCalls.map((t) => ({
        id: t.id,
        type: "function" as const,
        function: { name: t.name, arguments: t.args },
      })),
    });

    for (const toolCall of toolCalls) {
      let toolInput: Record<string, unknown> = {};
      try {
        toolInput = JSON.parse(toolCall.args || "{}");
      } catch {
        // malformed arguments — run the tool with empty input
      }
      const result = await runTool(toolCall.name, toolInput);
      // Track catalog products surfaced (for anonymized analytics)
      try {
        const parsed = JSON.parse(result);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) {
          if (item && typeof item === "object" && "id" in item) {
            productsMentioned.add(String((item as { id: string }).id));
          }
        }
      } catch {
        // site help / non-JSON results
      }
      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result.slice(0, 8000),
      });
    }
  }

  return { reply: "Sorry, I could not produce an answer.", productsMentioned: [] };
}
