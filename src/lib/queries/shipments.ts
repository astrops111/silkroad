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
