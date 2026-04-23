"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type CustomsStatus = Enums<"customs_status_enum">;
export type CustomsHoldReason = Enums<"customs_hold_reason">;
export type CustomsHoldRow = Tables<"customs_holds">;

// Status the customs queue page filters on by default — anything
// that needs an ops human to push it forward.
export const ACTIVE_CUSTOMS_STATUSES: CustomsStatus[] = [
  "pending", "preparing", "submitted", "on_hold",
];

export interface CustomsQueueRow {
  id: string;
  shipment_number: string;
  delivery_country: string | null;
  customs_status: CustomsStatus;
  customs_filed_at: string | null;
  customs_broker_name: string | null;
  customs_declaration_no: string | null;
  hs_codes: string[] | null;
  open_holds: number;
  most_recent_hold_reason: CustomsHoldReason | null;
  estimated_delivery_at: string | null;
}

export async function listCustomsQueue(
  filter: { status?: CustomsStatus; destinationCountry?: string } = {},
): Promise<CustomsQueueRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("b2b_shipments")
    .select(
      "id, shipment_number, delivery_country, customs_status, customs_filed_at, customs_broker_name, customs_declaration_no, hs_codes, estimated_delivery_at",
    );
  if (filter.status) {
    query = query.eq("customs_status", filter.status);
  } else {
    query = query.in("customs_status", ACTIVE_CUSTOMS_STATUSES);
  }
  if (filter.destinationCountry) query = query.eq("delivery_country", filter.destinationCountry);

  const { data: shipments, error } = await query.order("created_at", { ascending: false }).limit(500);
  if (error) {
    console.error("listCustomsQueue failed", error);
    return [];
  }
  if (!shipments || shipments.length === 0) return [];

  // Annotate with open-hold counts in one roundtrip.
  const ids = shipments.map((s) => s.id);
  const { data: holds } = await supabase
    .from("customs_holds")
    .select("shipment_id, reason, opened_at")
    .in("shipment_id", ids)
    .is("resolved_at", null);

  const holdsByShipment = new Map<string, CustomsHoldRow[]>();
  for (const h of (holds ?? []) as CustomsHoldRow[]) {
    const list = holdsByShipment.get(h.shipment_id) ?? [];
    list.push(h);
    holdsByShipment.set(h.shipment_id, list);
  }

  return shipments.map((s): CustomsQueueRow => {
    const open = holdsByShipment.get(s.id) ?? [];
    open.sort((a, b) => (a.opened_at < b.opened_at ? 1 : -1));
    return {
      ...s,
      customs_status: s.customs_status as CustomsStatus,
      open_holds: open.length,
      most_recent_hold_reason: open[0]?.reason ?? null,
    };
  });
}

export async function listShipmentCustomsHolds(shipmentId: string): Promise<CustomsHoldRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customs_holds")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("opened_at", { ascending: false });
  if (error) {
    console.error("listShipmentCustomsHolds failed", error);
    return [];
  }
  return data ?? [];
}

export async function countOpenCustomsHolds(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("customs_holds")
    .select("*", { count: "exact", head: true })
    .is("resolved_at", null);
  if (error) {
    console.error("countOpenCustomsHolds failed", error);
    return 0;
  }
  return count ?? 0;
}
