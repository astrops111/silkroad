import type { EventHandler } from "../types";
import { onShipmentDelivered } from "@/lib/email/events";
import { calculateSettlement } from "@/lib/settlement/engine";
import { logError } from "@/lib/logging";

function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.pathname.includes("..");
  } catch {
    return false;
  }
}

/**
 * delivery.completed
 * Goods delivered to buyer. Confirms delivery, opens dispute window,
 * triggers settlement calculation.
 *
 * Cannot call confirmDelivery() action (it uses createClient() with user-session
 * RBAC check). Replicates the same logic here using the service client.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, supplier_order_id, payload } = event;
  if (!shipment_id)       return { success: false, error: "Missing shipment_id" };
  if (!supplier_order_id) return { success: false, error: "Missing supplier_order_id" };

  const p = payload as {
    podPhotoUrl?:      string;
    podRecipientName?: string;
    podNotes?:         string;
  };

  const now = new Date().toISOString();

  // ── 1. Fetch supplier order ─────────────────────────────────────────────────
  const { data: order } = await supabase
    .from("supplier_orders")
    .select("status, purchase_order_id")
    .eq("id", supplier_order_id)
    .maybeSingle();

  if (!order) return { success: false, error: `Supplier order ${supplier_order_id} not found` };

  const deliverableStatuses = ["dispatched", "in_transit", "out_for_delivery"];
  if (!deliverableStatuses.includes(order.status as string)) {
    // Already delivered or in a terminal state — idempotent success
    if (order.status === "delivered" || order.status === "completed") {
      return { success: true, result: { alreadyDelivered: true } };
    }
    return { success: false, error: `Cannot confirm delivery for order in status: ${order.status}` };
  }

  // ── 2. Mark supplier order delivered ────────────────────────────────────────
  await supabase
    .from("supplier_orders")
    .update({ status: "delivered", updated_at: now })
    .eq("id", supplier_order_id);

  await supabase.from("order_status_history").insert({
    supplier_order_id,
    from_status: order.status,
    to_status:   "delivered",
    changed_by:  "system",
    note:        "Delivery confirmed by pipeline (POD recorded)",
  });

  // ── 3. Mark shipment delivered + record POD ──────────────────────────────────
  await supabase.from("b2b_shipments").update({
    status:             "delivered",
    delivered_at:       now,
    pod_photo_url:      p.podPhotoUrl && isValidHttpsUrl(p.podPhotoUrl) ? p.podPhotoUrl : null,
    pod_recipient_name: p.podRecipientName ?? null,
    pod_notes:          p.podNotes         ?? null,
    updated_at:         now,
  }).eq("id", shipment_id);

  const { error: trackErr } = await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "delivered",
    description: [
      "Delivered",
      p.podRecipientName && `signed by: ${p.podRecipientName}`,
      p.podNotes         && p.podNotes,
    ].filter(Boolean).join(" — "),
  });
  if (trackErr) console.error("[pipeline:delivery.completed] tracking insert failed:", trackErr.message);

  // ── 4. If all supplier orders for this PO are delivered, close the PO ───────
  const { data: siblings, error: siblingsErr } = await supabase
    .from("supplier_orders")
    .select("status")
    .eq("purchase_order_id", order.purchase_order_id);

  const allDone = !siblingsErr && siblings && siblings.length > 0 &&
    siblings.every((s) => s.status === "delivered" || s.status === "completed");
  if (allDone) {
    await supabase
      .from("purchase_orders")
      .update({ status: "delivered", updated_at: now })
      .eq("id", order.purchase_order_id);
  }

  // ── 5. Buyer email ───────────────────────────────────────────────────────────
  await onShipmentDelivered(shipment_id)
    .catch((err) => logError({ errorCode: "EMAIL_BUYER_DELIVERY", message: err instanceof Error ? err.message : String(err), source: "pipeline:delivery.completed", severity: "warning", metadata: { shipmentId: shipment_id } }).catch(() => {}));

  // ── 6. Trigger settlement calculation (creates settlement record) ────────────
  //    The DB trigger on supplier_order → 'delivered' also enqueues settlement.triggered,
  //    which will call processSettlement after the 72-hour dispute window.
  const settlementResult = await calculateSettlement(supplier_order_id)
    .catch((err) => {
      console.error("[pipeline:delivery.completed] calculateSettlement failed:", err);
      return { success: false as const, error: String(err) };
    });

  return {
    success: true,
    result: {
      supplierOrderId: supplier_order_id,
      deliveredAt:     now,
      settlementId:    settlementResult.success
        ? (settlementResult as { success: true; data?: { settlementId?: string } }).data?.settlementId
        : null,
    },
    nextEvents: [{
      eventType:       "dispute_window.opened",
      shipmentId:      shipment_id,
      supplierOrderId: supplier_order_id,
      purchaseOrderId: order.purchase_order_id,
      payload:         { deliveredAt: now },
    }],
  };
};
