import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// AI Dispute Resolution — Analyze evidence & recommend outcomes
// ============================================================

export interface DisputeData {
  id: string;
  type: string;
  title: string;
  description: string;
  evidenceUrls: string[];
  disputedAmount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface OrderData {
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  itemsDescription: string;
  paymentStatus: string;
  paymentMethod: string;
}

export interface ShipmentData {
  status: string;
  trackingNumber: string | null;
  deliveredAt: string | null;
  podSignature: boolean;
  podPhoto: boolean;
  trackingEvents: { event: string; date: string; description: string }[];
}

export interface ChatHistory {
  messages: { sender: string; content: string; timestamp: string }[];
}

export interface DisputeAnalysis {
  summary: string;
  buyerPosition: string;
  supplierPosition: string;
  evidenceAssessment: string;
  deliveryVerification: string;
  recommendedResolution: "full_pay_supplier" | "partial_refund_buyer" | "full_refund_buyer" | "replacement" | "dismissed";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  suggestedRefundPct: number;
  suggestedNote: string;
  riskFactors: string[];
  precedentNotes: string;
}

export async function analyzeDispute(
  dispute: DisputeData,
  order: OrderData,
  shipment: ShipmentData | null,
  chatHistory: ChatHistory | null
): Promise<DisputeAnalysis> {
  const client = new Anthropic();

  const systemPrompt = `You are a fair and impartial dispute resolution specialist for Silk Road, an Africa-first B2B marketplace.

CONTEXT:
- Platform uses escrow payments — funds are held until delivery is confirmed
- Platform owns its logistics fleet — delivery proof (signature + photos) is available
- Mobile money (MTN MoMo, Airtel, M-Pesa) is the primary payment method
- Cross-border trade between Africa and China is common

YOUR ROLE:
- Analyze all available evidence objectively
- Consider both buyer and supplier perspectives
- Factor in delivery proof, tracking events, and chat communication
- Recommend a fair resolution with reasoning

DISPUTE TYPES & TYPICAL RESOLUTIONS:
- product_quality: Partial refund (20-50%) if evidence shows defects; full pay supplier if subjective
- wrong_item: Full refund or replacement if clearly different from order
- not_delivered: Full refund if tracking shows no delivery; full pay supplier if POD exists
- damaged: Partial to full refund depending on damage extent; check if insured
- quantity_mismatch: Partial refund proportional to missing quantity
- late_delivery: Usually dismissed unless severe (>30 days); check contract terms
- fraud: Full refund + flag supplier for review

RESPONSE FORMAT: Respond with ONLY valid JSON:
{
  "summary": "2-3 sentence summary of the dispute",
  "buyerPosition": "What the buyer claims and wants",
  "supplierPosition": "What we can infer about the supplier's position from available data",
  "evidenceAssessment": "Assessment of the evidence quality and what it shows",
  "deliveryVerification": "What delivery records show (tracking, POD, timing)",
  "recommendedResolution": "full_pay_supplier|partial_refund_buyer|full_refund_buyer|replacement|dismissed",
  "confidence": "high|medium|low",
  "reasoning": "3-5 sentences explaining why this resolution is fair",
  "suggestedRefundPct": 0,
  "suggestedNote": "Resolution note for the record",
  "riskFactors": ["risk 1", "risk 2"],
  "precedentNotes": "How this should inform future similar disputes"
}`;

  const userContent = `Analyze this B2B trade dispute and recommend a resolution:

DISPUTE:
- Type: ${dispute.type}
- Title: ${dispute.title}
- Description: ${dispute.description}
- Disputed Amount: ${dispute.currency} ${(dispute.disputedAmount / 100).toFixed(2)}
- Evidence files: ${dispute.evidenceUrls.length} attachment(s)
- Opened: ${dispute.createdAt}
- Current status: ${dispute.status}

ORDER:
- Order #: ${order.orderNumber}
- Status: ${order.status}
- Total: ${order.currency} ${(order.totalAmount / 100).toFixed(2)}
- Items: ${order.itemsDescription}
- Payment: ${order.paymentStatus} via ${order.paymentMethod}

${shipment ? `SHIPMENT:
- Status: ${shipment.status}
- Tracking: ${shipment.trackingNumber || "N/A"}
- Delivered: ${shipment.deliveredAt || "Not delivered"}
- Proof of delivery (signature): ${shipment.podSignature ? "Yes" : "No"}
- Proof of delivery (photo): ${shipment.podPhoto ? "Yes" : "No"}
- Tracking events:
${shipment.trackingEvents.map((e) => `  ${e.date}: ${e.event} — ${e.description}`).join("\n")}` : "SHIPMENT: No shipment data available"}

${chatHistory && chatHistory.messages.length > 0 ? `COMMUNICATION HISTORY (last ${Math.min(chatHistory.messages.length, 10)} messages):
${chatHistory.messages.slice(-10).map((m) => `[${m.timestamp}] ${m.sender}: ${m.content}`).join("\n")}` : "No buyer-supplier communication on record."}

Analyze ALL evidence and recommend a fair resolution.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No response from dispute analyzer");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr);
}
