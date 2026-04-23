"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type ShipmentCostActualRow = Tables<"b2b_shipment_cost_actuals">;
export type ShipmentCostCategory = Enums<"shipment_cost_category">;

export async function listShipmentCostActuals(shipmentId: string): Promise<ShipmentCostActualRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("b2b_shipment_cost_actuals")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("invoice_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listShipmentCostActuals failed", error);
    return [];
  }
  return data ?? [];
}
