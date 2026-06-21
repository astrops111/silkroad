import type { EventHandler } from "../types";
import { createShipment } from "@/lib/actions/shipments";

/**
 * order.supplier_shipped
 *
 * Triggered when supplier_order transitions to 'ready_to_ship'.
 * Supplier has dispatched goods to the platform freight agent.
 * Platform creates a shipment record to begin Stage 2 logistics.
 *
 * The DB INSERT trigger on b2b_shipments automatically enqueues
 * shipment.created as the next pipeline step.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { supplier_order_id } = event;
  if (!supplier_order_id) {
    return { success: false, error: "Missing supplier_order_id" };
  }

  const { data: order, error: orderErr } = await supabase
    .from("supplier_orders")
    .select(`
      id, order_number, supplier_id,
      shipping_method, trade_term,
      ship_to_country, ship_to_city, ship_to_address,
      total_amount, currency
    `)
    .eq("id", supplier_order_id)
    .single();

  if (orderErr || !order) {
    return { success: false, error: `Order fetch failed: ${orderErr?.message}` };
  }

  const { data: items, error: itemsErr } = await supabase
    .from("supplier_order_items")
    .select("id, quantity")
    .eq("supplier_order_id", supplier_order_id);

  if (itemsErr) {
    return { success: false, error: `Items fetch failed: ${itemsErr.message}` };
  }

  // Creates the shipment record (status = 'pending').
  // The INSERT trigger enqueues shipment.created to prompt freight booking.
  const shipment = await createShipment(supplier_order_id, {
    shippingMethod: order.shipping_method ?? "platform_freight",
    deliveryCountry: order.ship_to_country ?? "XX",
    deliveryCity: order.ship_to_city ?? "",
    deliveryAddress: order.ship_to_address ?? "",
  });

  if (!shipment?.data?.shipmentId) {
    return { success: false, error: shipment?.error ?? "createShipment returned no id" };
  }

  return {
    success: true,
    result: {
      shipmentId: shipment.data.shipmentId,
      orderNumber: order.order_number,
      itemCount: (items ?? []).length,
    },
  };
};
