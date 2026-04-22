import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// AI Customer Support Agent — Multilingual B2B Support
// ============================================================

export interface SupportMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SupportContext {
  userId: string;
  companyName: string;
  userLanguage: string; // ISO code
  role: "buyer" | "supplier";
}

export interface OrderLookup {
  order_number: string;
  status: string;
  total_amount: string;
  currency: string;
  supplier_name?: string;
  buyer_name?: string;
  created_at: string;
  items_count: number;
  shipment_status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  payment_status?: string;
  payment_method?: string;
}

export interface SupportResponse {
  reply: string;
  intent: string;
  suggestedActions: { label: string; action: string }[];
  shouldHandoff: boolean;
  handoffReason?: string;
  language: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", fr: "French", "zh-CN": "Simplified Chinese",
  sw: "Swahili", ar: "Arabic", ha: "Hausa", yo: "Yoruba",
  am: "Amharic", zu: "Zulu", pt: "Portuguese", lg: "Luganda", rw: "Kinyarwanda",
};

export async function handleSupportQuery(
  messages: SupportMessage[],
  context: SupportContext,
  orderData?: OrderLookup | null
): Promise<SupportResponse> {
  const client = new Anthropic();

  const langName = LANGUAGE_NAMES[context.userLanguage] || "English";

  const systemPrompt = `You are the AI customer support agent for Silk Road Africa, an Africa-first B2B wholesale marketplace.

PLATFORM INFO:
- Supports mobile money (MTN MoMo, Airtel Money, Tigo Cash, M-Pesa), Stripe, Alipay, WeChat Pay
- Own logistics fleet with real-time tracking
- Operates in 27+ African countries + China
- Escrow-based payments with dispute protection

USER CONTEXT:
- Company: ${context.companyName}
- Role: ${context.role}
- Preferred language: ${langName}

${orderData ? `ORDER DATA:
- Order #: ${orderData.order_number}
- Status: ${orderData.status}
- Amount: ${orderData.currency} ${orderData.total_amount}
- Payment: ${orderData.payment_status || "unknown"} via ${orderData.payment_method || "unknown"}
- Shipment: ${orderData.shipment_status || "no shipment yet"}
- Tracking: ${orderData.tracking_number || "not assigned"}
- ETA: ${orderData.estimated_delivery || "TBD"}
- Items: ${orderData.items_count}
- Placed: ${orderData.created_at}` : "No specific order referenced."}

RULES:
1. Respond in ${langName} if the user writes in ${langName}. Otherwise match their language.
2. Be warm, professional, and culturally aware of African business customs.
3. For payment queries, explain mobile money status clearly — many users are mobile-first.
4. Never share internal system details, API keys, or admin information.
5. If the issue requires human intervention (refunds, account changes, legal matters), flag for handoff.
6. For dispute-related queries, guide users to the dispute resolution process.
7. Keep responses concise — many users are on low-bandwidth connections.

RESPONSE FORMAT: Respond with ONLY valid JSON:
{
  "reply": "Your response in the appropriate language",
  "intent": "order_tracking|payment_status|dispute_help|product_inquiry|shipping_query|account_issue|general|escalation",
  "suggestedActions": [
    {"label": "action button text", "action": "action_id"}
  ],
  "shouldHandoff": false,
  "handoffReason": null,
  "language": "${context.userLanguage}"
}`;

  const apiMessages: Anthropic.Messages.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: systemPrompt,
    messages: apiMessages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No response from AI support agent");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr);
}
