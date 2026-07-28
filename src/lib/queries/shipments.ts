"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type B2BShipmentRow = Tables<"b2b_shipments">;

export async function getShipmentById(id: string): Promise<B2BShipmentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("b2b_shipments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getShipmentById failed", error);
    return null;
  }
  return data;
}

export type AdminShipmentListRow = Pick<
  B2BShipmentRow,
  | "id"
  | "shipment_number"
  | "status"
  | "customs_status"
  | "shipping_method"
  | "pickup_country"
  | "pickup_city"
  | "delivery_country"
  | "delivery_city"
  | "tracking_number"
  | "carrier_scac"
  | "vessel_name"
  | "estimated_delivery_at"
  | "dispatched_at"
  | "delivered_at"
  | "demurrage_flagged_at"
  | "created_at"
>;

export async function listAdminShipments(): Promise<AdminShipmentListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("b2b_shipments")
    .select(
      `
      id, shipment_number, status, customs_status, shipping_method,
      pickup_country, pickup_city, delivery_country, delivery_city,
      tracking_number, carrier_scac, vessel_name,
      estimated_delivery_at, dispatched_at, delivered_at,
      demurrage_flagged_at, created_at
    `
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("listAdminShipments failed", error);
    return [];
  }
  return data ?? [];
}

export async function getShipmentBySupplierOrderId(
  supplierOrderId: string
): Promise<B2BShipmentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("b2b_shipments")
    .select("*")
    .eq("supplier_order_id", supplierOrderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("getShipmentBySupplierOrderId failed", error);
    return null;
  }
  return data;
}
