import Anthropic from "@anthropic-ai/sdk";
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

const MODEL = "claude-sonnet-4-20250514";
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

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_products",
    description: "Search the public product catalog by keyword. Returns active products only.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords, e.g. 'sheet mask' or 'solar lamp'" },
        limit: { type: "number", description: "Max results (default 6)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_product_details",
    description: "Full public details for one product by id or slug.",
    input_schema: {
      type: "object",
      properties: {
        idOrSlug: { type: "string" },
      },
      required: ["idOrSlug"],
    },
  },
  {
    name: "get_recommendations",
    description: "Products related to a given product (bought/requested together, same category).",
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product uuid" },
      },
      required: ["productId"],
    },
  },
  {
    name: "get_site_help",
    description: "How the marketplace works: carts, MOQ/minimums, RFQs, quotes, landed cost, logistics, support.",
    input_schema: { type: "object", properties: {} },
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
        .select("id, name, slug, description, base_price, currency, moq, box_pack_qty, origin_country, lead_time_days")
        .eq("is_active", true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);
      return JSON.stringify(products ?? []);
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
      return JSON.stringify(product ?? { error: "Product not found" });
    }

    case "get_recommendations": {
      const productId = String(input.productId ?? "");
      let recs: RecommendedProduct[] = [];
      if (/^[0-9a-f-]{36}$/i.test(productId)) {
        recs = await recommendForProduct(productId, 6);
      }
      return JSON.stringify(recs);
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

export interface AssistantResponse {
  reply: string;
  productsMentioned: string[];
}

/**
 * One assistant turn: agentic tool loop over the public catalog only.
 */
export async function handleShoppingQuery(
  messages: AssistantMessage[],
  locale?: string
): Promise<AssistantResponse> {
  const client = new Anthropic();

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
${locale && locale !== "en" ? `- Reply in the user's language (locale: ${locale}).` : ""}`;

  const conversation: Anthropic.MessageParam[] = messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const productsMentioned = new Set<string>();

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: conversation,
      tools: TOOLS,
    });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUses.length === 0 || round === MAX_TOOL_ROUNDS) {
      const reply = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply: reply || "Sorry, I could not produce an answer.", productsMentioned: [...productsMentioned] };
    }

    conversation.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      const result = await runTool(toolUse.name, toolUse.input as Record<string, unknown>);
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
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result.slice(0, 8000),
      });
    }
    conversation.push({ role: "user", content: toolResults });
  }

  return { reply: "Sorry, I could not produce an answer.", productsMentioned: [] };
}
