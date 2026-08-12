import { createServiceClient } from "@/lib/supabase/server";
import { notifyTradeFlowStep } from "./notify";

/**
 * Trade-flow creation — one flow per RFQ / purchase order. Idempotent
 * (skips when a flow already exists for the source) and never throws, so
 * it is safe to call from the RFQ/checkout hot paths as a fire-and-forget
 * side effect.
 */

export async function createTradeFlowFromRfq(
  rfqId: string,
  createdBy?: string | null
): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("trade_flows")
      .select("id")
      .eq("rfq_id", rfqId)
      .maybeSingle();
    if (existing) return existing.id;

    const { data: rfq } = await supabase
      .from("rfqs")
      .select(
        "id, rfq_number, title, buyer_user_id, buyer_company_id, buyer_company_name, target_currency, delivery_country, delivery_city, port_of_discharge"
      )
      .eq("id", rfqId)
      .maybeSingle();
    if (!rfq) return null;

    const { data: items } = await supabase
      .from("rfq_items")
      .select("product_name, quantity, unit")
      .eq("rfq_id", rfqId)
      .order("sort_order")
      .limit(20);

    const itemLines = (items ?? []).map(
      (it) => `- ${it.product_name} × ${it.quantity ?? "?"} ${it.unit ?? ""}`.trim()
    );
    const goodsSummary = [rfq.title, ...itemLines].filter(Boolean).join("\n");

    const { data: flow, error } = await supabase
      .from("trade_flows")
      .insert({
        rfq_id: rfq.id,
        buyer_user_id: rfq.buyer_user_id,
        buyer_company_id: rfq.buyer_company_id,
        buyer_company_name: rfq.buyer_company_name,
        currency: rfq.target_currency ?? "USD",
        goods_summary: goodsSummary || null,
        destination_port: rfq.port_of_discharge ?? null,
        notes: `Opened from RFQ ${rfq.rfq_number}`,
        created_by: createdBy ?? null,
      })
      .select("id")
      .single();
    if (error || !flow) {
      console.error("[trade-flow] create from RFQ failed:", error);
      return null;
    }

    await supabase.from("trade_flow_events").insert({
      trade_flow_id: flow.id,
      from_step: null,
      to_step: "started",
      actor_user_id: createdBy ?? null,
      note: `Opened from RFQ ${rfq.rfq_number}`,
    });

    await notifyTradeFlowStep(flow.id, "started");
    return flow.id;
  } catch (err) {
    console.error("[trade-flow] create from RFQ error:", err);
    return null;
  }
}

export async function createTradeFlowFromOrder(
  purchaseOrderId: string,
  createdBy?: string | null
): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("trade_flows")
      .select("id")
      .eq("purchase_order_id", purchaseOrderId)
      .maybeSingle();
    if (existing) return existing.id;

    const { data: po } = await supabase
      .from("purchase_orders")
      .select(
        "id, order_number, buyer_user_id, buyer_company_name, currency, subtotal, total_shipping, grand_total"
      )
      .eq("id", purchaseOrderId)
      .maybeSingle();
    if (!po) return null;

    // Supplier + items — partitioned tables have no FKs, so join manually.
    const { data: supplierOrders } = await supabase
      .from("supplier_orders")
      .select("id, supplier_id")
      .eq("purchase_order_id", purchaseOrderId)
      .limit(1);
    const supplierOrder = supplierOrders?.[0];

    let supplierName: string | null = null;
    if (supplierOrder?.supplier_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", supplierOrder.supplier_id)
        .maybeSingle();
      supplierName = company?.name ?? null;
    }

    let goodsSummary: string | null = null;
    if (supplierOrder) {
      const { data: items } = await supabase
        .from("supplier_order_items")
        .select("product_name, quantity")
        .eq("supplier_order_id", supplierOrder.id)
        .limit(20);
      goodsSummary =
        (items ?? []).map((it) => `- ${it.product_name} × ${it.quantity}`).join("\n") || null;
    }

    const { data: flow, error } = await supabase
      .from("trade_flows")
      .insert({
        purchase_order_id: po.id,
        buyer_user_id: po.buyer_user_id,
        buyer_company_name: po.buyer_company_name,
        supplier_company_id: supplierOrder?.supplier_id ?? null,
        supplier_name: supplierName,
        currency: po.currency ?? "USD",
        goods_total: po.subtotal ?? null,
        shipping_cost: po.total_shipping ?? null,
        grand_total: po.grand_total ?? null,
        goods_summary: goodsSummary,
        notes: `Opened from order ${po.order_number}`,
        created_by: createdBy ?? null,
      })
      .select("id")
      .single();
    if (error || !flow) {
      console.error("[trade-flow] create from order failed:", error);
      return null;
    }

    await supabase.from("trade_flow_events").insert({
      trade_flow_id: flow.id,
      from_step: null,
      to_step: "started",
      actor_user_id: createdBy ?? null,
      note: `Opened from order ${po.order_number}`,
    });

    await notifyTradeFlowStep(flow.id, "started");
    return flow.id;
  } catch (err) {
    console.error("[trade-flow] create from order error:", err);
    return null;
  }
}
