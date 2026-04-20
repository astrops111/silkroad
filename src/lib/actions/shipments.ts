"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createShipment(
  supplierOrderId: string,
  data: {
    shippingMethod: string;
    trackingNumber?: string;
    trackingUrl?: string;
    pickupAddress?: string;
    pickupCity?: string;
    pickupCountry?: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryCountry: string;
    deliveryContactName?: string;
    deliveryContactPhone?: string;
    totalWeightKg?: number;
    packageCount?: number;
    estimatedDeliveryAt?: string;
  }
): Promise<ActionResult<{ shipmentId: string }>> {
  const serviceClient = createServiceClient();

  const shipmentNumber = `SHP-${Date.now().toString(36).toUpperCase()}`;

  const { data: shipment, error } = await serviceClient
    .from("b2b_shipments")
    .insert({
      supplier_order_id: supplierOrderId,
      shipment_number: shipmentNumber,
      shipping_method: data.shippingMethod,
      tracking_number: data.trackingNumber ?? null,
      tracking_url: data.trackingUrl ?? null,
      pickup_address: data.pickupAddress ?? null,
      pickup_city: data.pickupCity ?? null,
      pickup_country: data.pickupCountry ?? null,
      delivery_address: data.deliveryAddress,
      delivery_city: data.deliveryCity,
      delivery_country: data.deliveryCountry,
      delivery_contact_name: data.deliveryContactName ?? null,
      delivery_contact_phone: data.deliveryContactPhone ?? null,
      total_weight_kg: data.totalWeightKg ?? null,
      package_count: data.packageCount ?? 1,
      estimated_delivery_at: data.estimatedDeliveryAt ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  return { success: true, data: { shipmentId: shipment.id } };
}

export async function updateShipmentStatus(
  shipmentId: string,
  status: string,
  location?: { lat: number; lng: number; label: string }
): Promise<ActionResult> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (location) {
    updateData.current_location = location;
  }

  if (status === "picked_up") {
    updateData.picked_up_at = new Date().toISOString();
  } else if (status === "delivered") {
    updateData.delivered_at = new Date().toISOString();
  } else if (status === "dispatched") {
    updateData.dispatched_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("b2b_shipments")
    .update(updateData)
    .eq("id", shipmentId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateTracking(
  shipmentId: string,
  trackingNumber: string,
  trackingUrl?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("b2b_shipments")
    .update({
      tracking_number: trackingNumber,
      tracking_url: trackingUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shipmentId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getShipment(supplierOrderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("b2b_shipments")
    .select("*")
    .eq("supplier_order_id", supplierOrderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getShipmentsByOrder(purchaseOrderId: string) {
  const supabase = await createClient();

  // Get all supplier orders for this purchase order
  const { data: supplierOrders } = await supabase
    .from("supplier_orders")
    .select("id")
    .eq("purchase_order_id", purchaseOrderId);

  if (!supplierOrders || supplierOrders.length === 0) return [];

  const ids = supplierOrders.map((so) => so.id);

  const { data: shipments } = await supabase
    .from("b2b_shipments")
    .select("*")
    .in("supplier_order_id", ids)
    .order("created_at", { ascending: false });

  return shipments ?? [];
}
