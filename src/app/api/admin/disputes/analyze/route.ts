import { NextRequest, NextResponse } from "next/server";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { analyzeDispute } from "@/lib/ai/dispute-resolver";
import type { DisputeData, OrderData, ShipmentData, ChatHistory } from "@/lib/ai/dispute-resolver";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * POST /api/admin/disputes/analyze — AI dispute analysis
 * Body: { disputeId }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const blocked = await requireAIFeature("ai_dispute_resolution");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  try {
    const { disputeId } = await request.json();

    if (!disputeId) {
      return NextResponse.json({ error: "disputeId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Fetch dispute
    const { data: dispute, error: dErr } = await supabase
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .single();

    if (dErr || !dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // 2. Fetch related order
    const { data: supplierOrder } = await supabase
      .from("supplier_orders")
      .select(`
        id, order_number, status, subtotal, currency, shipping_method, trade_term,
        supplier_order_items (quantity, unit_price, product_name),
        payment_transactions:purchase_order_id (status, gateway)
      `)
      .eq("id", dispute.supplier_order_id)
      .single();

    const orderData: OrderData = {
      orderNumber: supplierOrder?.order_number || "Unknown",
      status: supplierOrder?.status || "unknown",
      totalAmount: supplierOrder?.subtotal || 0,
      currency: supplierOrder?.currency || dispute.currency || "USD",
      itemsDescription: (supplierOrder?.supplier_order_items as Array<Record<string, unknown>>)
        ?.map((i) => `${i.quantity}x ${i.product_name}`)
        .join(", ") || "No item details",
      paymentStatus: ((supplierOrder?.payment_transactions as Array<Record<string, unknown>>)?.[0]?.status as string) || "unknown",
      paymentMethod: ((supplierOrder?.payment_transactions as Array<Record<string, unknown>>)?.[0]?.gateway as string) || "unknown",
    };

    // 3. Fetch shipment data
    let shipmentData: ShipmentData | null = null;
    const { data: shipment } = await supabase
      .from("b2b_shipments")
      .select("status, tracking_number, delivered_at, pod_signature_url, pod_photo_url")
      .eq("supplier_order_id", dispute.supplier_order_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (shipment) {
      const { data: events } = await supabase
        .from("shipment_tracking_events")
        .select("event_type, created_at, description")
        .eq("shipment_id", shipment.tracking_number) // join on shipment
        .order("created_at", { ascending: true })
        .limit(20);

      shipmentData = {
        status: shipment.status,
        trackingNumber: shipment.tracking_number,
        deliveredAt: shipment.delivered_at,
        podSignature: !!shipment.pod_signature_url,
        podPhoto: !!shipment.pod_photo_url,
        trackingEvents: (events || []).map((e) => ({
          event: e.event_type,
          date: e.created_at,
          description: e.description || "",
        })),
      };
    }

    // 4. Fetch chat history between buyer and supplier
    let chatHistory: ChatHistory | null = null;
    const { data: msgs } = await supabase
      .from("messages")
      .select("sender_type, content, created_at")
      .or(
        `and(buyer_company_id.eq.${dispute.opened_by_company_id},supplier_company_id.eq.${dispute.supplier_company_id}),and(buyer_company_id.eq.${dispute.supplier_company_id},supplier_company_id.eq.${dispute.opened_by_company_id})`
      )
      .order("created_at", { ascending: true })
      .limit(20);

    if (msgs && msgs.length > 0) {
      chatHistory = {
        messages: msgs.map((m) => ({
          sender: m.sender_type || "unknown",
          content: m.content || "",
          timestamp: m.created_at,
        })),
      };
    }

    // 5. Run AI analysis
    const disputeInput: DisputeData = {
      id: dispute.id,
      type: dispute.type,
      title: dispute.title,
      description: dispute.description,
      evidenceUrls: dispute.evidence_urls || [],
      disputedAmount: dispute.disputed_amount || 0,
      currency: dispute.currency || "USD",
      status: dispute.status,
      createdAt: dispute.created_at,
    };

    const analysis = await analyzeDispute(disputeInput, orderData, shipmentData, chatHistory);

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("Dispute analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
