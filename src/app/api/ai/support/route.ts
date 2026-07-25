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

    // Optional: look up order data if order number provided. Manual fetch
    // instead of a PostgREST embed — purchase_orders/supplier_orders/
    // payment_transactions have no FK between them (all RANGE-partitioned by
    // created_at with a composite PK), so PostgREST can't embed across them.
    let orderData: OrderLookup | null = null;
    if (orderNumber) {
      const supabase = await createClient();
      const { data: order } = await supabase
        .from("purchase_orders")
        .select("id, order_number, status, grand_total, currency, created_at")
        .eq("order_number", orderNumber)
        .eq("buyer_user_id", auth.profileId)
        .single();

      if (order) {
        const { data: supplierOrders } = await supabase
          .from("supplier_orders")
          .select("id, status, supplier_id")
          .eq("purchase_order_id", order.id);

        const supplierOrder = supplierOrders?.[0];

        const [{ data: company }, { data: shipments }, { data: payments }] = await Promise.all([
          supplierOrder
            ? supabase.from("companies").select("name").eq("id", supplierOrder.supplier_id).single()
            : Promise.resolve({ data: null as { name: string } | null }),
          supplierOrder
            ? supabase
                .from("b2b_shipments")
                .select("status, tracking_number, estimated_delivery_at")
                .eq("supplier_order_id", supplierOrder.id)
                .order("created_at", { ascending: false })
                .limit(1)
            : Promise.resolve({ data: [] as { status: string; tracking_number: string; estimated_delivery_at: string }[] }),
          supabase
            .from("payment_transactions")
            .select("status, gateway")
            .eq("purchase_order_id", order.id)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        const shipment = shipments?.[0];
        const payment = payments?.[0];

        orderData = {
          order_number: order.order_number,
          status: order.status,
          total_amount: (order.grand_total / 100).toFixed(2),
          currency: order.currency,
          created_at: order.created_at,
          items_count: supplierOrders?.length || 0,
          supplier_name: company?.name,
          shipment_status: shipment?.status,
          tracking_number: shipment?.tracking_number,
          estimated_delivery: shipment?.estimated_delivery_at,
          payment_status: payment?.status,
          payment_method: payment?.gateway,
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
