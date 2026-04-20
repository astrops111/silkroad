import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isUnauthorized } from "@/lib/auth/require-auth";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { handleSupportQuery } from "@/lib/ai/support-agent";
import type { SupportMessage, SupportContext, OrderLookup } from "@/lib/ai/support-agent";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/ai/support — AI customer support agent
 * Body: { messages, context, orderNumber? }
 */
export async function POST(request: NextRequest) {
  // Feature flag gate
  const auth = await requireAuth();
  if (isUnauthorized(auth)) return auth;

  const blocked = await requireAIFeature("ai_support_agent");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { messages, context, orderNumber } = body as {
      messages: SupportMessage[];
      context: SupportContext;
      orderNumber?: string;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    // Optional: look up order data if order number provided
    let orderData: OrderLookup | null = null;
    if (orderNumber) {
      const supabase = await createClient();
      const { data: order } = await supabase
        .from("purchase_orders")
        .select(`
          order_number, status, total_amount, currency, created_at,
          supplier_orders (
            id, status,
            companies:supplier_id (name),
            b2b_shipments (status, tracking_number, estimated_delivery_at)
          ),
          payment_transactions (status, gateway)
        `)
        .eq("order_number", orderNumber)
        .single();

      if (order) {
        const supplierOrder = (order.supplier_orders as Array<Record<string, unknown>>)?.[0];
        const shipment = supplierOrder?.b2b_shipments as Array<Record<string, unknown>> | undefined;
        const payment = (order.payment_transactions as Array<Record<string, unknown>>)?.[0];

        orderData = {
          order_number: order.order_number,
          status: order.status,
          total_amount: ((order.total_amount as number) / 100).toFixed(2),
          currency: order.currency as string,
          created_at: order.created_at as string,
          items_count: (order.supplier_orders as Array<unknown>)?.length || 0,
          supplier_name: (supplierOrder?.companies as Record<string, string>)?.name,
          shipment_status: (shipment?.[0] as Record<string, string>)?.status,
          tracking_number: (shipment?.[0] as Record<string, string>)?.tracking_number,
          estimated_delivery: (shipment?.[0] as Record<string, string>)?.estimated_delivery_at,
          payment_status: payment?.status as string,
          payment_method: payment?.gateway as string,
        };
      }
    }

    const result = await handleSupportQuery(messages, context, orderData);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("AI support agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Support agent failed" },
      { status: 500 }
    );
  }
}
